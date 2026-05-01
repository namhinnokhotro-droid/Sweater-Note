import React, { useState, useEffect } from 'react';
import { Plus, ClipboardCheck, Calendar, Hash, User, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { Worker, Sweater, WorkLog, OPERATIONS, OperationType } from '../types';
import { db, handleFirestoreError } from '../lib/firebase';
import { cn } from '../lib/utils';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';

interface Props {
  workers: Worker[];
  sweaters: Sweater[];
  workLogs: WorkLog[];
  isAdmin: boolean;
  currentUser: Worker | null;
}

export function WorkLogSection({ workers, sweaters, workLogs, isAdmin, currentUser }: Props) {
  const [isLogging, setIsLogging] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [log, setLog] = useState<Partial<WorkLog>>({
    workerId: currentUser?.id || '',
    sweaterId: '',
    operation: 'stitch',
    quantity: 1,
  });

  useEffect(() => {
    if (currentUser && !log.workerId) {
      setLog(prev => ({ ...prev, workerId: currentUser.id }));
    }
  }, [currentUser]);

  const handleSaveLog = async () => {
    if (!log.workerId || !log.sweaterId || !log.operation || !log.quantity) {
      alert("Please fill all fields");
      return;
    }

    const worker = workers.find(w => w.id === log.workerId);
    const sweater = sweaters.find(s => s.id === log.sweaterId);
    
    if (!worker || !sweater) return;

    const rate = (sweater.costing as any)[log.operation] || 0;
    const total = rate * log.quantity;
    const id = uuidv4();

    try {
      await setDoc(doc(db, 'workLogs', id), {
        id,
        workerId: log.workerId,
        sweaterId: log.sweaterId,
        styleNumber: sweater.costing.styleNumber,
        operation: log.operation,
        quantity: log.quantity,
        rate,
        total,
        date: Date.now(),
      });
      setIsLogging(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `workLogs/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      alert("Only admins can delete records. (শুধুমাত্র এডমিন ডিলিট করতে পারবেন)");
      return;
    }

    try {
      await deleteDoc(doc(db, 'workLogs', id));
      alert('Record deleted (হিসাবটি মুছে ফেলা হয়েছে)');
    } catch (error: any) {
      console.error("Delete record failed:", error);
      alert("Deletion failed: " + (error.message || "Error"));
      try { handleFirestoreError(error, OperationType.DELETE, `workLogs/${id}`); } catch (e) {}
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Work Records (কাজের হিসাব)</h2>
        <button
          onClick={() => setIsLogging(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold"
        >
          <Plus size={20} />
          <span>New Record</span>
        </button>
      </div>

      <AnimatePresence>
        {isLogging && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 bg-white rounded-2xl border border-indigo-100 shadow-xl space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {!currentUser && (
                <div className="space-y-1.5 md:col-span-2 lg:col-span-4">
                  <label className="text-xs font-semibold text-gray-500 tracking-wider">Worker (শ্রমিক)</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {workers.map(w => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setLog(prev => ({ ...prev, workerId: w.id }))}
                        className={cn(
                          "flex flex-col items-center p-3 rounded-xl border-2 transition-all gap-2 min-w-[100px]",
                          log.workerId === w.id 
                            ? "bg-indigo-50 border-indigo-500 shadow-sm" 
                            : "bg-gray-50 border-transparent hover:border-gray-200"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full overflow-hidden bg-white ring-1",
                          log.workerId === w.id ? "ring-indigo-300" : "ring-slate-100"
                        )}>
                          {w.image ? (
                            <img src={w.image} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <User size={16} />
                            </div>
                          )}
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold text-center leading-tight truncate w-full",
                          log.workerId === w.id ? "text-indigo-700" : "text-slate-600"
                        )}>
                          {w.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 tracking-wider">Style (Design)</label>
                <select
                  value={log.sweaterId}
                  onChange={e => setLog(prev => ({ ...prev, sweaterId: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">Select Style</option>
                  {sweaters.map(s => <option key={s.id} value={s.id}>{s.costing.styleNumber || s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 tracking-wider">Operation</label>
                <select
                  value={log.operation}
                  onChange={e => setLog(prev => ({ ...prev, operation: e.target.value as any }))}
                  className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium capitalize"
                >
                  {OPERATIONS.map(op => <option key={op} value={op}>{op}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 tracking-wider">Quantity (Pcs)</label>
                <input
                  type="number"
                  value={log.quantity}
                  onChange={e => setLog(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                  min="1"
                />
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveLog}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100"
              >
                Record Work
              </button>
              <button
                onClick={() => setIsLogging(false)}
                className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-bottom border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Worker</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Style</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Operation</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total (৳)</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {workLogs.map(log => {
              const worker = workers.find(w => w.id === log.workerId);
              return (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group text-sm">
                  <td className="px-6 py-4 text-gray-500">{format(log.date, 'MMM dd, hh:mm a')}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{worker?.name || 'Deleted Worker'}</td>
                  <td className="px-6 py-4 font-medium text-gray-600">{log.styleNumber}</td>
                  <td className="px-6 py-4 capitalize text-indigo-600 font-semibold">{log.operation}</td>
                  <td className="px-6 py-4 font-medium">{log.quantity}</td>
                  <td className="px-6 py-4 font-bold text-green-600">৳{log.total.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    {isAdmin && (
                      <div className="relative inline-flex items-center">
                        <AnimatePresence mode="wait">
                          {confirmDeleteId === log.id ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8, x: 20 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.8, x: 20 }}
                              className="absolute right-0 top-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-2 flex items-center gap-2 border border-red-100 z-10 whitespace-nowrap"
                            >
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 text-[10px] font-bold text-slate-400"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  handleDelete(log.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg"
                              >
                                Confirm
                              </button>
                            </motion.div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(log.id)}
                              className="p-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all shadow-sm border border-red-100 flex items-center justify-center inline-flex"
                              title="Delete Record"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {workLogs.length === 0 && (
          <div className="py-20 text-center text-gray-400 font-medium">
            No work recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
