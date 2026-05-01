import React, { useState, useEffect } from 'react';
import { Plus, Search, ClipboardList, Trash2, User, Hash, Settings, Calculator, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QILog, Worker, OperationType } from '../types';
import { collection, query, orderBy, onSnapshot, setDoc, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  workers: Worker[];
  isAdmin: boolean;
  currentUser: Worker | null;
}

export function QISection({ workers, isAdmin, currentUser }: Props) {
  const [logs, setLogs] = useState<QILog[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newLog, setNewLog] = useState({
    cardNumber: '',
    tcNumber: '',
    machineNumber: '',
    qty: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'qi_logs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : (data.createdAt || Date.now())
        } as QILog;
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'qi_logs');
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please register first (আগে প্রোফাইল খুলুন)");
      return;
    }
    if (!newLog.cardNumber || newLog.qty <= 0) {
      alert("Please fill Card Number and Quantity (কার্ড নম্বর এবং পরিমাণ পূরণ করুন)");
      return;
    }

    setIsSaving(true);
    const id = uuidv4();
    try {
      await setDoc(doc(db, 'qi_logs', id), {
        id,
        ...newLog,
        workerId: currentUser.id,
        workerName: currentUser.name,
        workerImage: currentUser.image || '',
        createdAt: serverTimestamp()
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      
      // Clear fields but keep machine/TC numbers for faster repeated entry if requested
      setNewLog(prev => ({
        ...prev,
        cardNumber: '',
        qty: 0
      }));
      
      // Focus card number field for next entry if needed (can be handled via ref)
    } catch (err) {
      console.error("Failed to save QI log:", err);
      alert("Save failed! Please check connection. (সেভ হয়নি, ইন্টারনেট চেক করুন)");
      handleFirestoreError(err, OperationType.CREATE, 'qi_logs');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm("Delete this log?")) {
      try {
        await deleteDoc(doc(db, 'qi_logs', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `qi_logs/${id}`);
      }
    }
  };

  const filteredLogs = logs.filter(log => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      (log.workerName?.toLowerCase() || '').includes(query) ||
      (String(log.cardNumber || '')).toLowerCase().includes(query) ||
      (String(log.tcNumber || '')).toLowerCase().includes(query) ||
      (String(log.machineNumber || '')).toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <ClipboardList size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">QI Section (কিউআই)</h2>
            <p className="text-slate-500 text-sm font-medium">Quality Inspection Records</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search Card#, TC#, Machine#..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-80 pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium shadow-sm"
            />
          </div>
          {currentUser && (
            <button
              onClick={() => setIsAdding(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 whitespace-nowrap active:scale-95"
            >
              <Plus size={20} /> Add New
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout">
          {filteredLogs.map((log) => (
            <motion.div
              layout
              key={log.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 ring-2 ring-slate-50 flex-shrink-0">
                  {log.workerImage ? (
                    <img src={log.workerImage} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <User size={14} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-800 text-[11px] leading-tight truncate">{log.workerName}</h3>
                  <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">
                    {format(log.createdAt, 'MMM dd, hh:mm a')}
                  </p>
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => handleDelete(log.id)}
                    className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all rounded-lg"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[7px] font-black uppercase text-slate-400 block mb-0.5">Card #</span>
                  <span className="text-[11px] font-bold text-slate-700">{log.cardNumber}</span>
                </div>
                <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                  <span className="text-[7px] font-black uppercase text-indigo-400 block mb-0.5">QTY</span>
                  <span className="text-[11px] font-black text-indigo-700">{log.qty}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[7px] font-black uppercase text-slate-400 block mb-0.5">TC #</span>
                  <span className="text-[10px] font-bold text-slate-600">{log.tcNumber || '-'}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[7px] font-black uppercase text-slate-400 block mb-0.5">M #</span>
                  <span className="text-[10px] font-bold text-slate-600">{log.machineNumber || '-'}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Quick Add QI</h2>
                    <p className="text-slate-500 font-medium text-sm">দ্রুত কিউআই রেকর্ড যোগ করুন</p>
                  </div>
                  <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                    <X className="text-slate-400" size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Card Number</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        required
                        placeholder="Enter Card #"
                        value={newLog.cardNumber}
                        onChange={e => setNewLog({...newLog, cardNumber: e.target.value})}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">TC Number</label>
                      <div className="relative">
                        <Settings className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="text"
                          placeholder="TC #"
                          value={newLog.tcNumber}
                          onChange={e => setNewLog({...newLog, tcNumber: e.target.value})}
                          className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Machine</label>
                      <div className="relative">
                        <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="text"
                          placeholder="M #"
                          value={newLog.machineNumber}
                          onChange={e => setNewLog({...newLog, machineNumber: e.target.value})}
                          className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Quantity (QTY)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Enter Quantity"
                      value={newLog.qty || ''}
                      onChange={e => setNewLog({...newLog, qty: parseInt(e.target.value) || 0})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-center text-2xl text-indigo-600"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className={cn(
                        "w-full font-black py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                        saveSuccess ? "bg-green-500 text-white shadow-green-100" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100",
                        isSaving && "opacity-70 cursor-not-allowed"
                      )}
                    >
                      {isSaving ? "Saving..." : saveSuccess ? "Saved Successfully!" : "Save & Add Next"}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">
                      Form stays open for multiple entries
                    </p>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
