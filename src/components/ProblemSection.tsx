import React, { useState, useEffect } from 'react';
import { AlertCircle, Plus, Search, CheckCircle2, History, X, MessageSquare, Tag, Clock, Trash2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Problem, Worker } from '../types';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface Props {
  workers: Worker[];
  isAdmin: boolean;
  currentUser: Worker | null;
}

const PROBLEM_CATEGORIES = [
  'Pocket', 'Stich', 'Shoulder', 'Armhole', 'Sidejoint',
  'Neck', 'Hood', 'Paiping', 'Placket', 'Rib+Cuff',
  'Bottom', 'V. Joint', 'Potty Joint', 'Sample',
  'Complete', 'Back part', 'Front part', 'Sleeve', 'New Option'
];

export function ProblemSection({ workers, isAdmin, currentUser }: Props) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newProblem, setNewProblem] = useState<Partial<Problem>>({
    workerId: currentUser?.id || '',
    styleNumber: '',
    category: '',
    note: '',
    status: 'pending'
  });

  useEffect(() => {
    if (currentUser && !newProblem.workerId) {
      setNewProblem(prev => ({ ...prev, workerId: currentUser.id }));
    }
  }, [currentUser]);

  useEffect(() => {
    const q = query(collection(db, 'problems'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setProblems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Problem[]);
    });
    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const workerId = newProblem.workerId || currentUser?.id;
    if (!workerId || !newProblem.styleNumber || !newProblem.category) {
      alert("Please fill in style number and category (স্টাইল এবং ক্যাটাগরি পূরণ করুন)");
      return;
    }

    const worker = workers.find(w => w.id === workerId) || currentUser;
    
    try {
      await addDoc(collection(db, 'problems'), {
        ...newProblem,
        workerId,
        workerName: worker?.name || 'Unknown',
        workerImage: worker?.image || '',
        workerCardNumber: worker?.cardNumber || '',
        createdAt: Date.now(),
        status: 'pending'
      });
      setIsAdding(false);
      setNewProblem({
        workerId: currentUser?.id || '',
        styleNumber: '',
        category: '',
        note: '',
        status: 'pending'
      });
    } catch (err) {
      console.error("Error adding problem:", err);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'problems', id), {
        status: currentStatus === 'pending' ? 'resolved' : 'pending'
      });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!window.confirm("আপনি কি নিশ্চিত এই সমস্যাটি ডিলিট করতে চান?")) return;
    try {
      await deleteDoc(doc(db, 'problems', id));
    } catch (err) {
      console.error("Error deleting problem:", err);
    }
  };

  const filteredProblems = problems.filter(p => 
    p.styleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.workerCardNumber && p.workerCardNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <AlertCircle className="text-red-500" strokeWidth={3} />
            Problem (সমস্যা/শর্ট)
          </h2>
          <p className="text-slate-500 text-sm font-medium">Report shortages or production issues</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search problems or card #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
            />
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="px-6 py-3 bg-red-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-95"
          >
            <Plus size={20} /> Report Problem
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredProblems.map(problem => (
            <motion.div
              key={problem.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "group bg-white rounded-3xl border transition-all p-6 relative overflow-hidden",
                problem.status === 'resolved' ? "border-green-100 bg-green-50/10" : "border-red-100 shadow-sm hover:shadow-md"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded-md">Style</span>
                    <h3 className="font-black text-xl text-slate-800">{problem.styleNumber}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Tag size={12} strokeWidth={3} />
                    <span className="text-xs font-black uppercase tracking-wider">{problem.category}</span>
                  </div>
                </div>
                
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(problem.id)}
                    className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {problem.note && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex items-start gap-2 mb-1">
                      <MessageSquare className="text-slate-400 mt-0.5" size={14} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Note</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                      {problem.note}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-100/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 ring-2 ring-slate-50 flex-shrink-0">
                      {problem.workerImage ? (
                        <img src={problem.workerImage} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <User size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">{problem.workerName}</span>
                        {problem.workerCardNumber && (
                          <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
                            #{problem.workerCardNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <Clock size={10} />
                        <span className="text-[10px] font-medium">{format(problem.createdAt, 'MMM d, h:mm a')}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(problem.id, problem.status)}
                    disabled={!isAdmin}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                      problem.status === 'resolved' 
                        ? "bg-green-100 text-green-700 border border-green-200" 
                        : "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
                    )}
                  >
                    {problem.status === 'resolved' ? (
                      <>
                        <CheckCircle2 size={12} /> Resolved
                      </>
                    ) : (
                      <>
                        <AlertCircle size={12} /> Pending
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Problem Modal */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setIsAdding(false)}
                className="absolute top-6 right-6 p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <AlertCircle size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">Report Problem</h3>
                  <p className="text-sm text-slate-500">স্টাইল ও সমস্যার ধরন সিলেক্ট করুন</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {!currentUser && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Worker (শ্রমিক)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar p-1">
                      {workers.map(w => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setNewProblem({ ...newProblem, workerId: w.id })}
                          className={cn(
                            "flex flex-col items-center p-3 rounded-2xl border transition-all gap-2 group",
                            newProblem.workerId === w.id 
                              ? "bg-indigo-50 border-indigo-200 shadow-sm ring-2 ring-indigo-100" 
                              : "bg-slate-50 border-transparent hover:border-slate-200"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white ring-1 transition-all flex-shrink-0",
                            newProblem.workerId === w.id ? "ring-indigo-300 scale-110" : "ring-slate-100"
                          )}>
                            {w.image ? (
                              <img src={w.image} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <User size={20} />
                              </div>
                            )}
                          </div>
                          <span className={cn(
                            "text-[10px] sm:text-xs font-bold text-center leading-tight truncate w-full",
                            newProblem.workerId === w.id ? "text-indigo-700" : "text-slate-600"
                          )}>
                            {w.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Style (স্টাইল)</label>
                    <input
                      type="text"
                      value={newProblem.styleNumber}
                      onChange={(e) => setNewProblem({ ...newProblem, styleNumber: e.target.value })}
                      placeholder="e.g. 5025"
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Category (ক্যাটাগরি)</label>
                    <select
                      value={newProblem.category}
                      onChange={(e) => setNewProblem({ ...newProblem, category: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold appearance-none"
                    >
                      <option value="">Select</option>
                      {PROBLEM_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Note (কিছু থাকলে লিখুন)</label>
                  <textarea
                    value={newProblem.note}
                    onChange={(e) => setNewProblem({ ...newProblem, note: e.target.value })}
                    rows={3}
                    placeholder="Describe the issue here..."
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-medium text-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-red-100 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <AlertCircle size={20} strokeWidth={3} /> Submit Report
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
