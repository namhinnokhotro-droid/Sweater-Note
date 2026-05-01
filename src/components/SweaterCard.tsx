import React, { useState, useRef } from 'react';
import { Sweater, Worker, Comment } from '../types';
import { Trash2, Tag, BarChart2, ThumbsUp, MessageSquare, Heart, Flame, Zap, Send, User as UserIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { db, handleFirestoreError } from '../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

interface SweaterCardProps {
  sweater: Sweater;
  isAdmin: boolean;
  currentUser: Worker | null;
  onDelete: (id: string) => void;
  onSelect: (sweater: Sweater) => void;
}

export const SweaterCard: React.FC<SweaterCardProps> = ({ sweater, isAdmin, currentUser, onDelete, onSelect }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);

  const startHold = () => {
    holdTimer.current = setTimeout(() => {
      setShowReactions(true);
    }, 500); // 500ms hold to show reactions
  };

  const endHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const totalCost = 
    (sweater.costing.pocket || 0) +
    (sweater.costing.stitch || 0) +
    (sweater.costing.shoulder || 0) +
    (sweater.costing.armhole || 0) +
    (sweater.costing.sidejoint || 0) +
    (sweater.costing.neck || 0) +
    (sweater.costing.hood || 0) +
    (sweater.costing.paiping || 0) +
    (sweater.costing.placket || 0) +
    (sweater.costing.ribCuff || 0) +
    (sweater.costing.bottom || 0) +
    (sweater.costing.vJoint || 0) +
    (sweater.costing.pottyJoint || 0) +
    (sweater.costing.sample || 0) +
    (sweater.costing.complete || 0) +
    (sweater.costing.newOption || 0) +
    (sweater.costing.customOptions || []).reduce((s, o) => s + (o.value || 0), 0);
  
  const sellingPrice = totalCost;

  const OPERATION_DISPLAY_LABELS: Record<string, string> = {
    pocket: 'Pocket',
    stitch: 'Stitch',
    shoulder: 'Shoulder',
    armhole: 'Armhole',
    sidejoint: 'Sidejoint',
    neck: 'Neck',
    body: 'Body',
    hood: 'Hood',
    paiping: 'Paiping',
    placket: 'Placket',
    ribCuff: 'Rib+Cuff',
    bottom: 'Bottom',
    vJoint: 'V. Joint',
    pottyJoint: 'Potty Joint',
    sample: 'Sample',
    complete: 'Complete',
    newOption: 'New Opt'
  };

  const activeOperations = Object.entries(sweater.costing)
    .filter(([key, val]) => key !== 'styleNumber' && typeof val === 'number' && val > 0);

  const handleReaction = async (type: string) => {
    if (!currentUser && !isAdmin) return;
    const userId = isAdmin ? 'admin' : currentUser?.id;
    if (!userId) return;

    const newReactions = { ...(sweater.reactions || {}) };
    if (newReactions[userId] === type) {
      delete newReactions[userId]; // Unlike/Remove reaction
    } else {
      newReactions[userId] = type;
    }

    try {
      await updateDoc(doc(db, 'sweaters', sweater.id), {
        reactions: newReactions
      });
      setShowReactions(false);
    } catch (err) {
      console.error("Error updating reaction:", err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (!currentUser && !isAdmin) return;

    const comment: Comment = {
      id: uuidv4(),
      userId: isAdmin ? 'admin' : currentUser?.id || 'anon',
      userName: isAdmin ? 'Admin' : currentUser?.name || 'Anonymous',
      userImage: currentUser?.image,
      text: newComment.trim(),
      createdAt: Date.now()
    };

    try {
      await updateDoc(doc(db, 'sweaters', sweater.id), {
        comments: arrayUnion(comment)
      });
      setNewComment('');
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  const reactionIcons: Record<string, React.ReactNode> = {
    like: <ThumbsUp size={16} />,
    heart: <Heart size={16} className="text-red-500" />,
    fire: <Flame size={16} className="text-orange-500" />,
    zap: <Zap size={16} className="text-yellow-500" />
  };

  const currentUserId = isAdmin ? 'admin' : currentUser?.id;
  const userReaction = currentUserId ? sweater.reactions?.[currentUserId] : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 p-3">
        {sweater.image ? (
          <img
            src={sweater.image}
            alt={sweater.name}
            className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50 rounded-2xl">
            <Tag size={40} />
          </div>
        )}
        
        {isAdmin && (
          <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
            <AnimatePresence mode="wait">
              {confirmDelete ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 20 }}
                  className="bg-white rounded-2xl shadow-2xl p-2 flex items-center gap-2 border-2 border-red-100"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(false);
                    }}
                    className="px-3 py-2 text-xs font-black text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(sweater.id);
                      setConfirmDelete(false);
                    }}
                    className="px-4 py-2 bg-red-600 text-white text-xs font-black rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                  >
                    Confirm Delete
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="delete-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(true);
                  }}
                  className="p-4 bg-red-600 text-white rounded-2xl shadow-[0_10px_30px_-5px_rgba(220,38,38,0.5)] hover:bg-red-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center border-2 border-white/20"
                  title="Delete Design"
                >
                  <Trash2 size={24} strokeWidth={2.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-7 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight">
              {sweater.name || 'Untitled Design'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {sweater.costing.styleNumber && (
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-wider border border-indigo-100">
                  # {sweater.costing.styleNumber}
                </span>
              )}
              {/* Reactions count summary */}
              {sweater.reactions && Object.keys(sweater.reactions).length > 0 && (
                <div className="flex items-center -space-x-1">
                  {Array.from(new Set(Object.values(sweater.reactions || {}))).slice(0, 3).map((type, i) => (
                    <div key={i} className="p-1.5 bg-white rounded-full shadow-sm ring-2 ring-slate-50">
                      {reactionIcons[type as string]}
                    </div>
                  ))}
                  <span className="ml-2 text-[10px] font-black text-slate-400 pl-2">
                    {Object.keys(sweater.reactions).length}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl sm:text-3xl font-black text-indigo-600 font-sans tracking-tighter">
              ৳ {sellingPrice.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-black uppercase tracking-widest mt-1">Complete rate</p>
          </div>
        </div>

        {/* All Operations Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-8">
          {activeOperations.map(([key, val]) => (
            <div key={key} className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-[10px] sm:text-xs text-slate-500 font-bold tracking-tight truncate">
                {OPERATION_DISPLAY_LABELS[key] || key}:
              </span>
              <span className="text-xs sm:text-sm text-slate-800 font-black italic">৳{val}</span>
            </div>
          ))}
          {(sweater.costing.customOptions || [])
            .filter(opt => opt.name && opt.value > 0)
            .map(opt => (
              <div key={opt.id} className="flex justify-between items-center py-2 border-b border-indigo-50/50">
                <span className="text-[10px] sm:text-xs text-indigo-400 font-black tracking-tight truncate">
                  {opt.name}:
                </span>
                <span className="text-xs sm:text-sm text-slate-800 font-black italic">৳{opt.value}</span>
              </div>
            ))}
        </div>

        {/* Social Bar & Comments - Bottom Section */}
        <div className="mt-auto pt-6 border-t border-slate-50 space-y-6 relative">
          {/* Reaction Picker Overlay - Positioned above the like button */}
          <AnimatePresence>
            {showReactions && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-[100%] left-0 mb-4 z-[60] flex flex-col items-center"
                onClick={e => e.stopPropagation()}
              >
                <div className="bg-white p-2 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-100 ring-8 ring-black/5">
                  {['heart', 'fire', 'zap'].map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        handleReaction(type);
                        setShowReactions(false);
                      }}
                      className={`p-2 rounded-xl transition-all hover:scale-125 ${userReaction === type ? 'bg-indigo-50 ring-2 ring-indigo-500' : 'hover:bg-slate-50'}`}
                    >
                      {type === 'heart' && <Heart size={24} fill={userReaction === 'heart' ? 'currentColor' : 'none'} className="text-red-500" />}
                      {type === 'fire' && <Flame size={24} fill={userReaction === 'fire' ? 'currentColor' : 'none'} className="text-orange-500" />}
                      {type === 'zap' && <Zap size={24} fill={userReaction === 'zap' ? 'currentColor' : 'none'} className="text-yellow-500" />}
                    </button>
                  ))}
                </div>
                <div className="w-3 h-3 bg-white rotate-45 -mt-1.5 border-r border-b border-slate-100 shadow-sm" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onPointerDown={startHold}
                onPointerUp={endHold}
                onContextMenu={(e) => e.preventDefault()}
                onClick={() => handleReaction('like')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all ${userReaction === 'like' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              >
                <ThumbsUp size={20} strokeWidth={userReaction === 'like' ? 2.5 : 2} />
                <span className="text-xs font-black">{userReaction === 'like' ? 'Liked' : 'Like'}</span>
              </button>
              
              <button 
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
              >
                <MessageSquare size={20} />
                <span className="text-xs font-black">{sweater.comments?.length || 0}</span>
              </button>
            </div>

            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              {format(sweater.createdAt, 'MMM d, yyyy')}
            </span>
          </div>

          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-slate-50/50 rounded-2xl"
              >
                <div className="p-5 space-y-6">
                  <div className="max-h-64 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {sweater.comments?.map(comment => (
                      <div key={comment.id} className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-white shadow-sm ring-1 ring-slate-100 flex-shrink-0 overflow-hidden">
                          {comment.userImage ? <img src={comment.userImage} className="w-full h-full object-cover" /> : <UserIcon size={16} className="m-2 text-indigo-400" />}
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-700">{comment.userName}</span>
                            <span className="text-[8px] text-slate-400 font-bold">{format(comment.createdAt, 'HH:mm')}</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-tight mt-1">{comment.text}</p>
                        </div>
                      </div>
                    ))}
                    {(!sweater.comments || sweater.comments.length === 0) && (
                      <div className="text-center py-6">
                        <MessageSquare size={24} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-[10px] text-slate-400 font-bold italic">No comments yet (কোন কমেন্ট নেই)</p>
                      </div>
                    )}
                  </div>

                  {(currentUser || isAdmin) && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                        className="flex-grow bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                      />
                      <button
                        onClick={handleAddComment}
                        className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                        disabled={!newComment.trim()}
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isAdmin && (
            <button
              onClick={() => onSelect(sweater)}
              className="w-full py-4 bg-slate-800 text-white border-none rounded-2xl font-black text-base flex items-center justify-center gap-2 hover:bg-slate-700 transition-all shadow-xl shadow-slate-100 active:scale-[0.98]"
            >
              <BarChart2 size={20} /> Update Costing
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
