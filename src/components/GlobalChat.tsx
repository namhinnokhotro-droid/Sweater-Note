import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageSquare, AlertCircle, Trash2, Mic, Phone, Video, Square, Play, Pause, Users, Plus } from 'lucide-react';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Worker, Message, OperationType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface Props {
  workers: Worker[];
  isAdmin: boolean;
  currentUser: Worker | null;
}

import { CallModal } from './CallModal';

export function GlobalChat({ workers, isAdmin, currentUser }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeCall, setActiveCall] = useState<{ id?: string; type: 'audio' | 'video'; targetUsers?: Worker[]; caller?: Worker } | null>(null);
  const [selectedForCall, setSelectedForCall] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleWorkerSelection = (id: string) => {
    if (selectedForCall.includes(id)) {
      setSelectedForCall(prev => prev.filter(i => i !== id));
    } else {
      if (selectedForCall.length >= 9) {
        alert("Maximum 9 people can be selected (সর্বোচ্চ ৯ জন সিলেক্ট করা যাবে)");
        return;
      }
      setSelectedForCall(prev => [...prev, id]);
    }
  };

  const startGroupCall = (type: 'audio' | 'video') => {
    if (selectedForCall.length === 0) {
      alert("Please select at least one person (অন্তত একজনকে সিলেক্ট করুন)");
      return;
    }
    const targets = workers.filter(w => selectedForCall.includes(w.id));
    setActiveCall({ type, targetUsers: targets });
    setIsSelectMode(false);
    setSelectedForCall([]);
  };
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 500 * 1024) {
          setError("Recording too long. Keep it under 30s.");
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await sendAudioMessage(base64Audio);
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 29) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Mic access denied:", err);
      setError("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const sendAudioMessage = async (audioData: string) => {
    if (!selectedWorker) return;
    setIsSending(true);
    const id = uuidv4();
    try {
      await setDoc(doc(db, 'messages', id), {
        id,
        senderId: selectedWorker.id,
        senderName: selectedWorker.name,
        senderImage: selectedWorker.image || '',
        audio: audioData,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to send audio:", err);
    } finally {
      setIsSending(false);
    }
  };

  const selectedWorker = currentUser;

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'), limit(100));
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : (data.createdAt || Date.now())
        } as Message;
      }));
    }, (err) => {
      console.error("Chat sync error:", err);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(collection(db, 'calls'), orderBy('createdAt', 'desc'), limit(1));
    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const callData = change.doc.data();
          if (callData.targetId === currentUser.id && callData.status === 'pending') {
            setActiveCall({
              id: change.doc.id,
              type: callData.type,
              otherUser: { id: callData.callerId, name: callData.callerName, image: callData.callerImage } as Worker
            });
          }
        }
      });
    });

    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedWorker || isSending) return;

    setIsSending(true);
    setError(null);
    const id = uuidv4();
    try {
      await setDoc(doc(db, 'messages', id), {
        id,
        senderId: selectedWorker.id,
        senderName: selectedWorker.name,
        senderImage: selectedWorker.image || '',
        senderPhone: selectedWorker.phone || '',
        senderCardNumber: selectedWorker.cardNumber || '',
        text: inputText.trim(),
        createdAt: serverTimestamp(),
      });
      setInputText('');
    } catch (err: any) {
      console.error("Failed to send message:", err);
      setError("Failed to send message.");
      handleFirestoreError(err, OperationType.WRITE, 'messages');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!isAdmin) return;
    if (!window.confirm('Delete this message?')) return;
    try {
      await deleteDoc(doc(db, 'messages', msgId));
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const Header = () => (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between mb-4">
      <div>
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <MessageSquare className="text-indigo-600" strokeWidth={3} />
          Chat Room (আলোচনা)
        </h2>
        <p className="text-slate-500 text-sm font-medium">Communicate with workers and staff</p>
      </div>
    </div>
  );

  if (!currentUser) {
    return (
      <div className="space-y-4">
        <Header />
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-bold">Please register first to join the chat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header />
      <div className="max-w-4xl mx-auto h-[75vh] bg-[#efe7de] rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col relative">
        {/* Subtle WhatsApp-style pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }} />

        {/* Chat Header */}
        <div className="p-4 bg-[#075e54] text-white flex items-center justify-between shadow-md relative z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white/10 shadow-inner">
              {selectedWorker?.image ? (
                <img src={selectedWorker.image} className="w-full h-full object-cover" />
              ) : (
                <User size={20} />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">{selectedWorker?.name}</h3>
              <div className="flex items-center gap-1.5 ">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <p className="text-[10px] text-green-100 font-bold uppercase tracking-wider">Online</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSelectMode(!isSelectMode)}
              className={cn(
                "p-2 rounded-full transition-all active:scale-90",
                isSelectMode ? "bg-white text-indigo-600" : "hover:bg-white/10"
              )} 
              title="Select People for Group Call"
            >
              <Users size={20} />
            </button>
            <button 
              onClick={() => isSelectMode ? startGroupCall('video') : setActiveCall({ type: 'video', targetUsers: workers.filter(w => w.id !== currentUser?.id).slice(0, 1) })}
              className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90" title="Video Call"
            >
              <Video size={20} />
            </button>
            <button 
              onClick={() => isSelectMode ? startGroupCall('audio') : setActiveCall({ type: 'audio', targetUsers: workers.filter(w => w.id !== currentUser?.id).slice(0, 1) })}
              className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90" title="Voice Call"
            >
              <Phone size={20} />
            </button>
          </div>
        </div>

        {isSelectMode && (
          <div className="bg-indigo-900/50 p-3 px-6 flex items-center justify-between border-b border-white/10 animate-in slide-in-from-top duration-300">
            <span className="text-xs font-black text-white uppercase tracking-widest">
              Select Members ({selectedForCall.length}/9)
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => { setIsSelectMode(false); setSelectedForCall([]); }}
                className="text-[10px] font-bold text-white/60 hover:text-white px-3 py-1 rounded-lg border border-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Chat Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar for Selection */}
          <div className="w-[120px] shrink-0 space-y-2 py-4 border-r border-slate-200 bg-white/50 hidden md:flex flex-col items-center overflow-y-auto custom-scrollbar">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2 text-center">Select for group</span>
            {workers.map(w => (
              <button
                key={w.id}
                onClick={() => isSelectMode && toggleWorkerSelection(w.id)}
                disabled={!isSelectMode}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 w-full transition-all group",
                  isSelectMode ? "hover:bg-indigo-50 active:scale-95" : "opacity-80"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl overflow-hidden ring-2 transition-all relative shadow-sm",
                  isSelectMode && selectedForCall.includes(w.id) ? "ring-indigo-500 scale-105" : "ring-slate-100",
                  w.id === currentUser?.id && !isSelectMode && "ring-green-400"
                )}>
                  {w.image ? (
                    <img src={w.image} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300"><User size={20} /></div>
                  )}
                  {isSelectMode && selectedForCall.includes(w.id) && (
                    <div className="absolute inset-0 bg-indigo-600/40 flex items-center justify-center">
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <Plus className="text-indigo-600 rotate-45" size={16} />
                      </div>
                    </div>
                  )}
                </div>
                <span className={cn(
                  "text-[9px] font-black truncate w-full text-center px-1 transition-colors",
                  isSelectMode && selectedForCall.includes(w.id) ? "text-indigo-600" : "text-slate-500"
                )}>
                  {w.name}
                </span>
              </button>
            ))}
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 relative z-10 custom-scrollbar"
          >
          {messages.map((msg, i) => {
            const isMe = msg.senderId === currentUser?.id;
            const showAvatar = i === 0 || messages[i-1].senderId !== msg.senderId;
            const isGroupHeader = i === 0 || format(messages[i-1].createdAt, 'yyyy-MM-dd') !== format(msg.createdAt, 'yyyy-MM-dd');

            return (
              <React.Fragment key={msg.id}>
                {isGroupHeader && (
                  <div className="flex justify-center my-6">
                    <span className="bg-white/90 backdrop-blur-sm px-4 py-1 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest shadow-sm border border-slate-100">
                      {format(msg.createdAt, 'MMMM dd, yyyy')}
                    </span>
                  </div>
                )}
                <div 
                  className={cn(
                    "flex items-start gap-2",
                    isMe ? "flex-row-reverse" : "flex-row",
                    !showAvatar && "mt-[-4px]"
                  )}
                >
                  {!isMe ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white ring-1 ring-slate-200 flex-shrink-0 shadow-sm mt-1">
                      {showAvatar ? (
                        msg.senderImage ? (
                          <img src={msg.senderImage} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={14} /></div>
                        )
                      ) : null}
                    </div>
                  ) : (
                    <div className="w-4 flex-shrink-0" />
                  )}

                  <div className={cn("max-w-[85%] sm:max-w-[70%] flex flex-col", isMe ? "items-end" : "items-start")}>
                    <div 
                      className={cn(
                        "px-3 py-2 rounded-2xl text-sm font-medium shadow-sm transition-all relative break-words min-w-[60px]",
                        isMe 
                          ? "bg-[#dcf8c6] text-[#303030] rounded-tr-none" 
                          : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                      )}
                    >
                      {!isMe && showAvatar && (
                        <p className="text-[10px] font-black text-indigo-600 mb-1 leading-none">{msg.senderName}</p>
                      )}
                      {isMe && isAdmin && (
                        <button 
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="absolute -left-6 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      {!isMe && isAdmin && (
                        <button 
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="absolute -right-6 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      {msg.text && <p className="pr-12">{msg.text}</p>}
                      {msg.audio && (
                        <div className="flex items-center gap-3 py-1 pr-8">
                          <audio controls src={msg.audio} className="h-8 max-w-[200px]" />
                        </div>
                      )}
                      <span className="absolute bottom-1 right-2 text-[8px] font-bold text-slate-400">
                        {format(msg.createdAt, 'h:mm a')}
                      </span>
                    </div>
                  </div>
                  
                  {!isMe && <div className="w-4 flex-shrink-0" />}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="p-4 bg-[#f0f0f0] border-t border-slate-200 flex flex-col gap-2 relative z-20">
          {error && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-red-500 mb-1 px-4">
              <AlertCircle size={12} />
              <span>{error}</span>
            </div>
          )}
          <div className="flex gap-3 items-center">
            {isRecording ? (
              <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-red-50 rounded-full border-2 border-red-100">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                <span className="text-red-500 font-black text-sm tabular-nums">Recording: {recordingDuration}s</span>
                <button 
                  type="button" 
                  onClick={stopRecording}
                  className="ml-auto bg-red-500 text-white p-2 rounded-full shadow-lg"
                >
                  <Square size={16} fill="white" />
                </button>
              </div>
            ) : (
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Type a message..."
                  className="w-full px-5 py-3.5 bg-white border-none rounded-full shadow-sm focus:ring-2 focus:ring-[#075e54] outline-none text-sm transition-all"
                />
              </div>
            )}
            
            {!isRecording && !inputText.trim() && (
              <button 
                type="button"
                onClick={startRecording}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-full shadow-lg transition-all active:scale-95 flex-shrink-0"
              >
                <Mic size={20} />
              </button>
            )}

            {(inputText.trim() || isRecording) && (
              <button 
                type="submit"
                disabled={(!inputText.trim() && !isRecording) || isSending}
                className="bg-[#075e54] hover:bg-[#128c7e] disabled:opacity-50 text-white p-3.5 rounded-full shadow-lg transition-all active:scale-95 flex-shrink-0"
              >
                <Send size={20} className={cn(isSending && "animate-pulse")} />
              </button>
            )}
          </div>
        </form>
        {activeCall && currentUser && (
          <CallModal
            currentUser={currentUser}
            targetUsers={activeCall.targetUsers}
            callId={activeCall.id}
            type={activeCall.type}
            onClose={() => setActiveCall(null)}
          />
        )}
      </div>
    </div>
  );
}
