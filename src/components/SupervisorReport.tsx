import React, { useState, useEffect } from 'react';
import { Calendar, Save, Trash2, Printer, Loader2, UserPlus, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { OperationType, SupervisorReport as ISupervisorReport, SupervisorEntry } from '../types';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface SupervisorReportProps {
  isAdmin: boolean;
}

const INITIAL_ROWS = [
  'sumon', 'shahin', 'milon', 'mobarok', 'muhit', 'jibon', 'nodi', 'kayes'
];

export const SupervisorReport: React.FC<SupervisorReportProps> = ({ isAdmin }) => {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<SupervisorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  useEffect(() => {
    fetchReport();
  }, [reportDate]);

  // Auto-save logic
  useEffect(() => {
    if (!isDirty || loading) return;

    const timer = setTimeout(() => {
      handleSave(true); // silent save
    }, 3000);

    return () => clearTimeout(timer);
  }, [entries, isDirty, loading]);

  const fetchReport = async () => {
    setLoading(true);
    setIsDirty(false);
    try {
      const docRef = doc(db, 'supervisor_reports', reportDate);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as ISupervisorReport;
        // Ensure all entries have cardNumber for backward compatibility
        setEntries(data.entries.map(e => ({ ...e, cardNumber: e.cardNumber || '' })));
      } else {
        // Create initial rows based on template
        const initial = INITIAL_ROWS.map(name => ({
          id: uuidv4(),
          name,
          cardNumber: '',
          presence: '',
          absent: '',
          target: '',
          achievement: ''
        }));
        // Add some empty ones to reach 20 as in the image
        while (initial.length < 20) {
          initial.push({
            id: uuidv4(),
            name: '',
            cardNumber: '',
            presence: '',
            absent: '',
            target: '',
            achievement: ''
          });
        }
        setEntries(initial);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `supervisor_reports/${reportDate}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEntry = (id: string, field: keyof SupervisorEntry, value: string) => {
    setIsDirty(true);
    setEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const handleSave = async (silent = false) => {
    if (!silent) setSaving(true);
    try {
      const docRef = doc(db, 'supervisor_reports', reportDate);
      await setDoc(docRef, {
        id: reportDate,
        date: reportDate,
        entries,
        updatedAt: Date.now()
      });
      setIsDirty(false);
      setLastSaved(Date.now());
      if (!silent) alert('Report saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `supervisor_reports/${reportDate}`);
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'supervisor_reports', reportDate));
      setShowDeleteConfirm(false);
      fetchReport();
      alert('Report deleted successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `supervisor_reports/${reportDate}`);
    } finally {
      setDeleting(false);
    }
  };

  const addRow = () => {
    setEntries(prev => [...prev, {
      id: uuidv4(),
      name: '',
      cardNumber: '',
      presence: '',
      absent: '',
      target: '',
      achievement: ''
    }]);
  };

  return (
    <div className="max-w-[1200px] mx-auto p-4 sm:p-6 space-y-6">
      {/* Header controls */}
      <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 flex flex-col md:flex-row gap-6 items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
            <Calendar size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">Supervisor Report</h1>
            <div className="flex items-center gap-3">
              <input 
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="font-bold text-slate-400 bg-transparent outline-none cursor-pointer"
              />
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100">
                <div className={cn("w-1.5 h-1.5 rounded-full", isDirty ? "bg-amber-400 animate-pulse" : "bg-emerald-400")}></div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                  {isDirty ? 'Unsaved Changes' : lastSaved ? `Saved ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Synced'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <Printer size={20} />
          </button>
          
          {isAdmin && (
            <>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
              >
                <Trash2 size={20} />
              </button>
              <button 
                onClick={() => handleSave(false)}
                disabled={saving || !isDirty}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-sm flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isDirty ? 'Fix & Save' : 'Saved'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grid Container */}
      <div className="bg-[#121826] rounded-[2.5rem] shadow-2xl border border-slate-800 overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900/50 border-b-2 border-slate-800">
                <th className="w-12 p-4 text-[10px] font-black uppercase text-slate-500 border-r border-slate-800">#</th>
                <th className="p-4 text-left text-xs font-black uppercase text-slate-300 border-r border-slate-800">Name</th>
                <th className="w-32 p-4 text-left text-xs font-black uppercase text-slate-300 border-r border-slate-800">Card No</th>
                <th className="w-24 p-4 text-center text-xs font-black uppercase text-slate-300 border-r border-slate-800">Presence</th>
                <th className="w-24 p-4 text-center text-xs font-black uppercase text-slate-300 border-r border-slate-800">Absent</th>
                <th className="w-32 p-4 text-center text-xs font-black uppercase text-slate-300 border-r border-slate-800">Target</th>
                <th className="p-4 text-center text-xs font-black uppercase text-slate-300">Target Achievement</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="p-6 border-b border-slate-800/50">
                      <div className="h-4 bg-slate-800 rounded-full w-full"></div>
                    </td>
                  </tr>
                ))
              ) : (
                entries.map((entry, index) => (
                  <tr key={entry.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group">
                    <td className="p-0 text-center font-mono text-[10px] text-slate-600 border-r border-slate-800 bg-[#0f1420]">
                      {index + 1}
                    </td>
                    <td className="p-0 border-r border-slate-800">
                      <input 
                        type="text"
                        value={entry.name}
                        onChange={(e) => handleUpdateEntry(entry.id, 'name', e.target.value)}
                        placeholder="..."
                        className="w-full p-4 bg-transparent outline-none font-bold text-slate-100 focus:bg-slate-800/50"
                      />
                    </td>
                    <td className="p-0 border-r border-slate-800">
                      <input 
                        type="text"
                        value={entry.cardNumber}
                        onChange={(e) => handleUpdateEntry(entry.id, 'cardNumber', e.target.value)}
                        placeholder="..."
                        className="w-full p-4 bg-transparent outline-none font-bold text-slate-400 focus:bg-slate-800/50"
                      />
                    </td>
                    <td className="p-0 border-r border-slate-800">
                      <input 
                        type="text"
                        value={entry.presence}
                        onChange={(e) => handleUpdateEntry(entry.id, 'presence', e.target.value.toLowerCase())}
                        className="w-full p-4 bg-transparent outline-none font-black text-indigo-400 text-center focus:bg-slate-800/50"
                        maxLength={1}
                      />
                    </td>
                    <td className="p-0 border-r border-slate-800">
                      <input 
                        type="text"
                        value={entry.absent}
                        onChange={(e) => handleUpdateEntry(entry.id, 'absent', e.target.value.toLowerCase())}
                        className="w-full p-4 bg-transparent outline-none font-black text-red-400 text-center focus:bg-slate-800/50"
                        maxLength={1}
                      />
                    </td>
                    <td className="p-0 border-r border-slate-800">
                      <input 
                        type="text"
                        value={entry.target}
                        onChange={(e) => handleUpdateEntry(entry.id, 'target', e.target.value)}
                        className="w-full p-4 bg-transparent outline-none font-black text-slate-300 text-center focus:bg-slate-800/50"
                      />
                    </td>
                    <td className="p-0">
                      <input 
                        type="text"
                        value={entry.achievement}
                        onChange={(e) => handleUpdateEntry(entry.id, 'achievement', e.target.value)}
                        className="w-full p-4 bg-transparent outline-none font-black text-emerald-400 text-center focus:bg-slate-800/50"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="p-4 bg-slate-900/50 flex justify-between items-center no-print border-t border-slate-800">
             <button 
               onClick={addRow}
               className="flex items-center gap-2 px-4 py-2 text-xs font-black text-slate-500 hover:text-slate-300 transition-colors"
             >
               <UserPlus size={14} />
               Add New Row
             </button>
             <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">Grid auto-populates template rows on first view</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center space-y-6"
            >
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Are you sure?</h3>
                <p className="text-slate-500 font-bold mt-2">This will permanently delete the report for {reportDate}.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-red-100"
                >
                  {deleting ? <Loader2 size={18} className="animate-spin" /> : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
