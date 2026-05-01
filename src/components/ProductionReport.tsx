import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, BarChart3, Printer, Settings, Zap, Save, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { OperationType } from '../types';

const DEFAULT_METRICS = {
  totalMachines: '480',
  runningOperators: '456',
  workingTime: '700',
  targetQty: '16315',
  productionQty: '17002',
};

const DEFAULT_BREAKDOWN = {
  linking12G: '8003',
  linking7G: '8926',
  sample: '73',
};

const DEFAULT_SECONDARY = {
  secondLinking: '0',
  trimming: '14076',
  mending: '15053',
  reTrimming: '8020',
  zipperAttached: '3010',
};

interface ProductionReportProps {
  isAdmin: boolean;
}

export const ProductionReport: React.FC<ProductionReportProps> = ({ isAdmin }) => {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState('2ND');
  const [companyName, setCompanyName] = useState('Leward Company Limited');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Basic Metrics
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);

  // Breakdown Metrics
  const [breakdown, setBreakdown] = useState(DEFAULT_BREAKDOWN);

  const [secondary, setSecondary] = useState(DEFAULT_SECONDARY);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  // Auto-save logic
  useEffect(() => {
    if (!isDirty || loading) return;

    const timer = setTimeout(() => {
      handleSave(true); // silent save
    }, 3000);

    return () => clearTimeout(timer);
  }, [metrics, breakdown, secondary, companyName, shift, isDirty, loading]);

  // Load data when date or shift changes
  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setIsDirty(false);
      try {
        const reportId = `${reportDate}_${shift}`;
        const docRef = doc(db, 'production_reports', reportId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCompanyName(data.companyName || 'Leward Company Limited');
          setMetrics(data.metrics || DEFAULT_METRICS);
          setBreakdown(data.breakdown || DEFAULT_BREAKDOWN);
          setSecondary(data.secondary || DEFAULT_SECONDARY);
          setLastSaved(data.updatedAt || null);
        } else {
          setMetrics(DEFAULT_METRICS);
          setBreakdown(DEFAULT_BREAKDOWN);
          setSecondary(DEFAULT_SECONDARY);
          setCompanyName('Leward Company Limited');
          setLastSaved(null);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `production_reports/${reportDate}_${shift}`);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportDate, shift]);

  const handleSave = async (silent = false) => {
    if (!silent) setSaving(true);
    try {
      const reportId = `${reportDate}_${shift}`;
      const docRef = doc(db, 'production_reports', reportId);
      await setDoc(docRef, {
        id: reportId,
        date: reportDate,
        shift,
        companyName,
        metrics,
        breakdown,
        secondary,
        updatedAt: Date.now()
      });
      setIsDirty(false);
      setLastSaved(Date.now());
      if (!silent) alert('Report saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `production_reports/${reportDate}_${shift}`);
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin) return;
    setDeleting(true);
    try {
      const reportId = `${reportDate}_${shift}`;
      const docRef = doc(db, 'production_reports', reportId);
      await deleteDoc(docRef);
      setMetrics(DEFAULT_METRICS);
      setBreakdown(DEFAULT_BREAKDOWN);
      setSecondary(DEFAULT_SECONDARY);
      setShowDeleteConfirm(false);
      alert('Report deleted successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `production_reports/${reportDate}_${shift}`);
    } finally {
      setDeleting(false);
    }
  };

  const variation = useMemo(() => {
    const prod = parseInt(metrics.productionQty) || 0;
    const target = parseInt(metrics.targetQty) || 0;
    const diff = prod - target;
    return diff >= 0 ? `+${diff}` : `${diff}`;
  }, [metrics.productionQty, metrics.targetQty]);

  const grandTotal = useMemo(() => {
    return (parseInt(breakdown.linking12G) || 0) + 
           (parseInt(breakdown.linking7G) || 0) + 
           (parseInt(breakdown.sample) || 0);
  }, [breakdown]);

  const updateMetric = (field: string, val: string) => {
    setIsDirty(true);
    setMetrics(prev => ({ ...prev, [field]: val }));
  };

  const updateBreakdown = (field: string, val: string) => {
    setIsDirty(true);
    setBreakdown(prev => ({ ...prev, [field]: val }));
  };

  const updateSecondary = (field: string, val: string) => {
    setIsDirty(true);
    setSecondary(prev => ({ ...prev, [field]: val }));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 bg-slate-100 min-h-screen">
      {/* Configuration Header */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 no-print flex flex-wrap gap-4 items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
               <BarChart3 size={24} />
            </div>
            <div>
               <h1 className="text-xl font-black text-slate-800">Production Report</h1>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Efficiency Tracking</p>
            </div>
         </div>
         
         <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
               <Calendar size={18} className="text-indigo-600" />
               <input 
                 type="date" 
                 value={reportDate} 
                 onChange={(e) => setReportDate(e.target.value)}
                 className="bg-transparent font-black text-slate-700 outline-none w-32"
               />
               <input 
                 type="text" 
                 value={shift}
                 onChange={(e) => {
                   setShift(e.target.value);
                   setIsDirty(true);
                 }}
                 className="bg-indigo-100/50 text-indigo-700 px-2 py-0.5 rounded-lg font-black text-xs w-14 outline-none border border-indigo-200"
               />
               {loading && <Loader2 size={16} className="animate-spin text-indigo-400" />}
            </div>
            
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
              <div className={cn("w-2 h-2 rounded-full", isDirty ? "bg-amber-400 animate-pulse" : "bg-emerald-400")}></div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                {isDirty ? 'Unsaved' : lastSaved ? `Saved ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Synced'}
              </span>
            </div>
            <div className="flex gap-2">
               {isAdmin && (
                  <>
                    <button 
                      disabled={saving || !isDirty}
                      onClick={() => handleSave(false)}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      {isDirty ? 'Fix & Save' : 'Saved'}
                    </button>

                    <div className="relative">
                      <button 
                        disabled={deleting}
                        onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                        className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all active:scale-95 border border-red-100"
                      >
                        {deleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                      </button>

                      <AnimatePresence>
                        {showDeleteConfirm && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="absolute right-0 top-[120%] z-[100] bg-white p-4 rounded-2xl shadow-2xl border border-slate-200 w-48 space-y-3"
                          >
                            <p className="text-[10px] font-black text-slate-400 uppercase text-center leading-tight">Delete this shift report?</p>
                            <button 
                              onClick={handleDelete}
                              className="w-full py-2 bg-red-600 text-white rounded-xl font-black text-xs hover:bg-red-700 transition-all"
                            >
                              {deleting ? 'Deleting...' : 'Confirm'}
                            </button>
                            <button 
                              onClick={() => setShowDeleteConfirm(false)}
                              className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-200 transition-all"
                            >
                              Cancel
                            </button>
                          </motion.div>
                        ) }
                      </AnimatePresence>
                    </div>
                  </>
               )}
               <button 
                 onClick={() => window.print()}
                 className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
               >
                 <Printer size={20} />
               </button>
            </div>
         </div>
      </div>

      {/* The Actual Report */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none"
      >
        <div className="p-8 sm:p-16 space-y-12 relative">
          {loading && (
            <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-[2px] flex items-center justify-center no-print">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                <p className="font-black text-slate-800 text-sm uppercase tracking-widest">Loading Shift Report...</p>
              </div>
            </div>
          )}
          {/* Brand Header */}
          <div className="text-center space-y-2">
             <input 
               value={companyName}
               onChange={(e) => {
                 setCompanyName(e.target.value);
                 setIsDirty(true);
               }}
               className="text-4xl sm:text-5xl font-black text-slate-900 bg-transparent text-center outline-none w-full uppercase tracking-tighter"
             />
             <div className="bg-indigo-600 text-white px-6 py-1.5 rounded-full inline-block font-black text-sm uppercase tracking-[0.3em] mx-auto">
                Production Report
             </div>
             <div className="pt-4 text-slate-500 font-bold flex items-center justify-center gap-2">
                <span>📅 Date:</span>
                <span className="text-slate-900">{reportDate.split('-').reverse().join('/')}</span>
                <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                <span className="text-indigo-600">{shift}</span>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             {/* Section: Linking */}
             <div className="space-y-8">
                <div className="flex items-center gap-3 border-b-4 border-slate-900 pb-2">
                   <Zap size={20} className="text-indigo-600" />
                   <h2 className="text-2xl font-black text-slate-900 uppercase">Section: Linking</h2>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between group">
                      <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Total Machines (Actual)</span>
                      <input 
                        value={metrics.totalMachines}
                        onChange={(e) => updateMetric('totalMachines', e.target.value)}
                        className="text-xl font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-right w-24"
                      />
                   </div>
                   <div className="flex items-center justify-between group">
                      <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Running Operators</span>
                      <div className="flex items-center gap-2">
                         <input 
                           value={metrics.runningOperators}
                           onChange={(e) => updateMetric('runningOperators', e.target.value)}
                           className="text-xl font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-right w-24"
                         />
                         <span className="text-xs font-bold text-slate-400">Persons</span>
                      </div>
                   </div>
                   <div className="flex items-center justify-between group">
                      <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Working Time</span>
                      <div className="flex items-center gap-2">
                         <input 
                           value={metrics.workingTime}
                           onChange={(e) => updateMetric('workingTime', e.target.value)}
                           className="text-xl font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-right w-24"
                         />
                         <span className="text-xs font-bold text-slate-400">Minutes</span>
                      </div>
                   </div>
                </div>

                <div className="h-px bg-slate-100"></div>

                <div className="space-y-4 p-6 bg-slate-900 rounded-[2rem] text-white shadow-xl">
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">🎯 Target Quantity</span>
                      <input 
                        value={metrics.targetQty}
                        onChange={(e) => updateMetric('targetQty', e.target.value)}
                        className="bg-white/10 p-2 rounded-xl text-xl font-black text-right outline-none w-32 focus:bg-white/20"
                      />
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">✅ Production Quantity</span>
                      <input 
                        value={metrics.productionQty}
                        onChange={(e) => updateMetric('productionQty', e.target.value)}
                        className="bg-indigo-500/20 p-2 rounded-xl text-2xl font-black text-indigo-400 text-right outline-none w-32 focus:bg-indigo-500/30"
                      />
                   </div>
                   <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">➕/➖ Variation</span>
                      <span className={cn(
                        "text-xl font-black px-4 py-1 rounded-full",
                        variation.startsWith('+') ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
                      )}>
                        {variation} Pcs
                      </span>
                   </div>
                </div>
             </div>

             {/* Breakdown & Secondary */}
             <div className="space-y-8">
                <div className="space-y-6">
                   <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
                      <Settings size={18} className="text-slate-400" />
                      <h3 className="text-lg font-black text-slate-800 uppercase italic">🔧 Production Breakdown</h3>
                   </div>
                   
                   <div className="space-y-3">
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-black text-slate-500 uppercase">Linking 12G</span>
                         <input 
                           value={breakdown.linking12G}
                           onChange={(e) => updateBreakdown('linking12G', e.target.value)}
                           className="text-right font-black text-slate-900 outline-none bg-slate-50 px-2 py-1 rounded-lg w-24"
                         />
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-black text-slate-500 uppercase">Linking 7G</span>
                         <input 
                           value={breakdown.linking7G}
                           onChange={(e) => updateBreakdown('linking7G', e.target.value)}
                           className="text-right font-black text-slate-900 outline-none bg-slate-50 px-2 py-1 rounded-lg w-24"
                         />
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-black text-slate-500 uppercase">Sample</span>
                         <input 
                           value={breakdown.sample}
                           onChange={(e) => updateBreakdown('sample', e.target.value)}
                           className="text-right font-black text-slate-900 outline-none bg-slate-50 px-2 py-1 rounded-lg w-24"
                         />
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t-2 border-slate-900">
                         <span className="text-sm font-black text-slate-900 uppercase">➡️ Grand Total</span>
                         <span className="text-xl font-black text-indigo-600">{grandTotal} Pcs</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-4 pt-4">
                  {[
                    { label: '🔁 2nd - Linking', val: secondary.secondLinking, key: 'secondLinking' },
                    { label: '✂️ Trimming', val: secondary.trimming, key: 'trimming' },
                    { label: '🧵 Mending', val: secondary.mending, key: 'mending' },
                    { label: '🔄 Re-Trimming/2nd/Mending', val: secondary.reTrimming, key: 'reTrimming' },
                    { label: '🔘 Zipper Attached', val: secondary.zipperAttached, key: 'zipperAttached' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-100 transition-colors">
                       <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">{item.label}</span>
                       <div className="flex items-center gap-2">
                          <input 
                            value={item.val}
                            onChange={(e) => updateSecondary(item.key, e.target.value)}
                            className="bg-transparent text-right font-black text-slate-900 outline-none w-20 group-hover:bg-white rounded px-1 transition-all"
                          />
                          <span className="text-[10px] font-bold text-slate-400">Pcs</span>
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>

          {/* Footer Area */}
          <div className="mt-20 pt-20 border-t-2 border-slate-100 grid grid-cols-2 gap-20">
             <div className="space-y-4 text-center">
                <div className="w-full h-px bg-slate-200"></div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Report Generated By</p>
             </div>
             <div className="space-y-4 text-center">
                <div className="w-full h-px bg-slate-200"></div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Manager Approval</p>
             </div>
          </div>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .bg-slate-100 { background: white !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          input { border: none !important; background: transparent !important; }
        }
      `}} />
    </div>
  );
};
