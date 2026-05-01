import React, { useState } from 'react';
import { User, ClipboardList, History, CheckCircle2, ChevronRight, Hash, Database, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { Worker, Sweater, WorkLog, OPERATIONS, OperationType } from '../types';
import { db, handleFirestoreError } from '../lib/firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface Props {
  worker: Worker;
  sweaters: Sweater[];
  workLogs: WorkLog[];
  department?: 'leward' | 'complete';
  isAdmin: boolean;
}

const OPERATION_LABELS: Record<string, string> = {
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
  newOption: 'New Option'
};

export function WorkerPortal({ worker, sweaters, workLogs, department = 'leward', isAdmin }: Props) {
  const [activeTab, setActiveTab] = useState<'log' | 'history'>('log');
  const [styleNumber, setStyleNumber] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);

  const handleQtyChange = (op: string, val: string) => {
    const num = parseInt(val) || 0;
    setQuantities(prev => ({ ...prev, [op]: num }));
  };

  const handleDeleteLog = async (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'workLogs', logId));
      alert('Record deleted (হিসাবটি মুছে ফেলা হয়েছে)');
      setConfirmDeleteLogId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `workLogs/${logId}`);
    }
  };

  const handleSaveBatch = async () => {
    if (!styleNumber.trim()) {
      alert("Please enter Style Number (স্টাইল নাম্বার লিখুন)");
      return;
    }

    const logsToSave: [string, number][] = Object.entries(quantities)
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0);
    
    if (logsToSave.length === 0) {
      alert("Please enter quantity for at least one operation (কমপক্ষে একটি কাজ এন্ট্রি করুন)");
      return;
    }

    // Try to find if this style exists in management's records to get rates
    const existingSweater = sweaters.find(s => 
      s.costing.styleNumber.toLowerCase() === styleNumber.toLowerCase()
    );

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const batchDate = Date.now();
      
      for (const [op, qty] of logsToSave) {
        const id = uuidv4();
        // Use rate from matching style or default to 0
        const rate = existingSweater ? (existingSweater.costing as any)[op] || 0 : 0;
        const total = rate * qty;
        
        const logRef = doc(db, 'workLogs', id);
        batch.set(logRef, {
          id,
          workerId: worker.id,
          sweaterId: existingSweater?.id || 'manual-entry',
          styleNumber: styleNumber.trim(),
          operation: op,
          quantity: qty,
          rate,
          total,
          date: batchDate,
        });
      }

      await batch.commit();

      setQuantities({});
      setStyleNumber('');
      alert("Work recorded successfully! (আপনার হিসাব জমা হয়েছে)");
      setActiveTab('history');
    } catch (error) {
       console.error("Batch save error:", error);
       handleFirestoreError(error, OperationType.WRITE, 'workLogs/batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Try to find if this style exists in management's records to get rates
  const existingSweater = sweaters.find(s => 
    s.costing.styleNumber.toLowerCase() === styleNumber.toLowerCase()
  );

  const availableOperations = existingSweater 
    ? OPERATIONS.filter(op => {
        const rate = (existingSweater.costing as any)[op] || 0;
        if (rate <= 0) return false;
        // For 'complete' department, only show specific ops
        if (department === 'complete') {
          return ['neck', 'body', 'complete', 'sample'].includes(op);
        }
        return true;
      })
    : (department === 'complete' 
        ? ['neck', 'body', 'complete', 'sample'] 
        : OPERATIONS);

    return (
      <div className="bg-white rounded-3xl border border-indigo-50 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center overflow-hidden ring-4 ring-white/10 backdrop-blur-md">
              {worker.image ? (
                <img src={worker.image} alt={worker.name} className="w-full h-full object-cover" />
              ) : (
                <User size={32} />
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold">{worker.name}</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-indigo-100 text-sm font-medium">
                <span className="flex items-center gap-1"><Hash size={14} /> Card: {worker.cardNumber || 'N/A'}</span>
                <span className="flex items-center gap-1"><Database size={14} /> Line: {worker.lineNumber || 'N/A'}</span>
              </div>
            </div>
          </div>
          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('log')}
            className={cn(
              "flex-1 py-4 flex items-center justify-center gap-2 font-bold text-sm transition-all",
              activeTab === 'log' ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <ClipboardList size={18} />
            <span>Daily Entry (দৈনিক হিসাব)</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex-1 py-4 flex items-center justify-center gap-2 font-bold text-sm transition-all",
              activeTab === 'history' ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <History size={18} />
            <span>My History (হিসাব দেখুন)</span>
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {activeTab === 'log' ? (
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Style Number / Design (স্টাইল নাম্বার লিখুন)</label>
                  <div className="relative">
                    <input
                      list="style-list"
                      type="text"
                      value={styleNumber}
                      onChange={e => setStyleNumber(e.target.value)}
                      placeholder="e.g. SW-2024"
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700 outline-none placeholder:text-slate-300 transition-all shadow-inner"
                    />
                    <datalist id="style-list">
                      {sweaters.map(s => (
                        <option key={s.id} value={s.costing.styleNumber} />
                      ))}
                    </datalist>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                      <ClipboardList size={20} />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium italic">Type manually or select from the list (নিজে লিখুন অথবা লিস্ট থেকে নিন)</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {availableOperations.map(op => (
                    <div key={op} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between gap-4 group hover:border-indigo-300 transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-white to-slate-50">
                      <div className="space-y-1">
                        <label className="text-base font-black text-slate-700 capitalize block">
                          {OPERATION_LABELS[op] || op}
                        </label>
                        {existingSweater && (
                          <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg uppercase">
                            Rate: ৳{(existingSweater.costing as any)[op]}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        value={quantities[op] || ''}
                        onChange={e => handleQtyChange(op, e.target.value)}
                        placeholder="0"
                        className="w-32 px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-right font-black text-xl text-indigo-600 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        min="0"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSaveBatch}
                  disabled={isSubmitting}
                  className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg flex items-center justify-center gap-3 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle2 size={24} />
                      <span>Submit Work Records (জমা দিন)</span>
                    </>
                  )}
                </button>
              </div>

            {/* Recent Activity Mini-List */}
            {workLogs.length > 0 && (
              <div className="pt-6 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Recently Submitted (সাম্প্রতিক কাজ)</h4>
                <div className="space-y-3">
                  {workLogs.slice(0, 3).map(log => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-500 shadow-sm">
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-tighter">Style (স্টাইল)</p>
                          <p className="text-sm font-black text-slate-800 leading-tight">{log.styleNumber}</p>
                          <p className="text-[10px] text-indigo-600 font-bold uppercase mt-1">{OPERATION_LABELS[log.operation]}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-900">{log.quantity} Pcs</p>
                        <p className="text-[9px] text-slate-400">{format(log.date, 'h:mm a')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {workLogs.length > 0 ? (
              <div className="space-y-8">
                {/* Simplified Grouping by Date */}
                {Array.from(new Set(workLogs.map(l => format(l.date, 'yyyy-MM-dd')))).map(dateStr => {
                  const dayLogs = workLogs.filter(l => format(l.date, 'yyyy-MM-dd') === dateStr);
                  const dayTotal = dayLogs.reduce((sum, l) => sum + l.total, 0);
                  const dayPcs = dayLogs.reduce((sum, l) => sum + l.quantity, 0);

                  return (
                    <div key={dateStr} className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h4 className="font-bold text-slate-900">{format(new Date(dateStr), 'EEEE, MMM dd')}</h4>
                        <div className="flex gap-3">
                          <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-full">{dayPcs} Pcs</span>
                          <span className="text-[10px] font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">৳{dayTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {dayLogs.map(log => (
                          <div key={log.id} className="py-3 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                              {isAdmin && (
                                <div className="relative">
                                  <AnimatePresence mode="wait">
                                    {confirmDeleteLogId === log.id ? (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.8, x: -10 }}
                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.8, x: -10 }}
                                        className="absolute left-0 top-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-2 flex items-center gap-2 border border-red-100 z-10 whitespace-nowrap"
                                      >
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDeleteLogId(null);
                                          }}
                                          className="px-2 py-1 text-[10px] font-bold text-slate-400"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={(e) => handleDeleteLog(e, log.id)}
                                          className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg"
                                        >
                                          Confirm
                                        </button>
                                      </motion.div>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmDeleteLogId(log.id);
                                        }}
                                        className="p-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all shadow-sm border border-red-100 flex items-center justify-center"
                                        title="Delete Record"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase rounded uppercase">Style</span>
                                  <h4 className="font-black text-slate-900">{log.styleNumber}</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200"></span>
                                  <p className="text-[10px] text-indigo-600 font-black uppercase tracking-wide">{OPERATION_LABELS[log.operation]}</p>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1 font-medium">{format(log.date, 'h:mm a')}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-gray-900">{log.quantity} Pcs</div>
                              <div className="text-[9px] font-bold text-green-600">৳{log.total.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20">
                <History className="mx-auto text-gray-200 mb-3" size={48} />
                <p className="text-gray-400 font-medium">No work records found yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
