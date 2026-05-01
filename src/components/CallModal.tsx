import React, { useEffect, useRef, useState } from 'react';
import { X, Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, collection, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Worker } from '../types';
import { cn } from '../lib/utils';

interface Props {
  currentUser: Worker;
  targetUsers?: Worker[]; // Array of users for group call
  callId?: string; 
  type: 'audio' | 'video';
  onClose: () => void;
}

export function CallModal({ currentUser, targetUsers, callId, type, onClose }: Props) {
  const [status, setStatus] = useState<'calling' | 'incoming' | 'connected' | 'ended'> (callId ? 'incoming' : 'calling');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const activeCallId = useRef<string | null>(callId || null);

  const pcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    setupCall();
    return () => {
      cleanup();
    };
  }, []);

  const createPeerConnection = (targetId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection(pcConfig);
    
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.set(targetId, event.streams[0]);
        return next;
      });
    };

    peerConnections.current.set(targetId, pc);
    return pc;
  };

  const setupCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      if (!callId && targetUsers && targetUsers.length > 0) {
        // Start outgoing call for each target
        const groupId = `group-${currentUser.id}-${Date.now()}`;
        activeCallId.current = groupId;
        
        for (const user of targetUsers) {
          const pc = createPeerConnection(user.id, stream);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          const individualCallId = `${groupId}-${user.id}`;
          await setDoc(doc(db, 'calls', individualCallId), {
            id: individualCallId,
            groupId,
            callerId: currentUser.id,
            callerName: currentUser.name,
            callerImage: currentUser.image || '',
            targetId: user.id,
            type,
            status: 'pending',
            offer: { type: offer.type, sdp: offer.sdp },
            createdAt: serverTimestamp(),
          });

          // ICE Candidates processing for each...
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              addDoc(collection(db, 'calls', individualCallId, 'callerCandidates'), event.candidate.toJSON());
            }
          };

          onSnapshot(doc(db, 'calls', individualCallId), (snapshot) => {
            const data = snapshot.data();
            if (data?.status === 'accepted' && data.answer) {
              pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              setStatus('connected');
            }
          });
        }
      }
    } catch (err) {
      console.error("Call setup failed:", err);
      // onClose();
    }
  };

  const handleAccept = async () => {
    if (!callId || !localStream) return;
    const pc = createPeerConnection('caller', localStream);
    const callDoc = doc(db, 'calls', callId);
    
    onSnapshot(callDoc, async (snap) => {
      const data = snap.data();
      if (data?.offer && status === 'incoming') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        await updateDoc(callDoc, {
          answer: { type: answer?.type, sdp: answer?.sdp },
          status: 'accepted'
        });
        setStatus('connected');
      }
    });
  };

  const handleReject = async () => {
    cleanup();
    onClose();
  };

  const handleEnd = async () => {
    cleanup();
    onClose();
  };

  const cleanup = () => {
    localStream?.getTracks().forEach(track => track.stop());
    peerConnections.current.forEach(pc => pc.close());
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900 overflow-hidden">
      <div className="relative w-full h-full max-w-6xl mx-auto flex flex-col">
        {/* Remote Videos Grid */}
        <div className="flex-1 relative bg-black p-4">
          <div className={cn(
            "grid gap-4 w-full h-full",
            Array.from(remoteStreams.values()).length <= 1 ? "grid-cols-1" : 
            Array.from(remoteStreams.values()).length <= 4 ? "grid-cols-2" : "grid-cols-3"
          )}>
            {Array.from(remoteStreams.entries()).map(([id, stream]) => (
              <div key={id} className="relative bg-slate-800 rounded-3xl overflow-hidden border border-white/10">
                <video 
                  autoPlay 
                  playsInline 
                  ref={el => { if(el) el.srcObject = stream }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">
                    Remote Member
                  </span>
                </div>
              </div>
            ))}

            {Array.from(remoteStreams.values()).length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <div className="w-32 h-32 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center animate-pulse shadow-2xl">
                  {type === 'video' ? <Video size={48} className="text-white" /> : <Phone size={48} className="text-white" />}
                </div>
                <h2 className="text-2xl font-black text-white">
                  {status === 'calling' ? 'Calling Group...' : status === 'incoming' ? 'Incoming Call' : 'Connecting...'}
                </h2>
                <div className="flex gap-2">
                  {targetUsers?.slice(0, 3).map(u => (
                    <div key={u.id} className="text-[10px] font-bold text-white/40 bg-white/5 px-3 py-1 rounded-full">{u.name}</div>
                  ))}
                  {targetUsers && targetUsers.length > 3 && <div className="text-[10px] font-bold text-white/40 bg-white/5 px-3 py-1 rounded-full">+{targetUsers.length - 3} others</div>}
                </div>
              </div>
            )}
          </div>

          {/* Local Video (Floating) */}
          {type === 'video' && (
            <div className="absolute top-6 right-6 w-32 h-44 bg-slate-800 rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl z-20">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-green-500 rounded text-[8px] font-black text-white uppercase">You</div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-12 bg-gradient-to-t from-slate-950 to-transparent flex items-center justify-center gap-6 relative z-30">
          {status === 'incoming' ? (
            <>
              <button 
                onClick={handleReject}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90"
              >
                <PhoneOff size={28} />
              </button>
              <button 
                onClick={handleAccept}
                className="w-20 h-20 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90 animate-bounce"
              >
                <Phone size={32} />
              </button>
            </>
          ) : (
            <>
              <button className="w-14 h-14 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all">
                <Mic size={24} />
              </button>
              <button 
                onClick={handleEnd}
                className="w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 transform hover:rotate-[135deg]"
              >
                <PhoneOff size={32} />
              </button>
              <button className="w-14 h-14 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all">
                {type === 'video' ? <VideoOff size={24} /> : <Video size={24} />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
