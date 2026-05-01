import React, { useState, useEffect } from 'react';
import { Calendar, Users, Briefcase, ChevronRight, Printer, Save, Trash2, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { OperationType } from '../types';

interface Section {
  id: string;
  title: string;
  metrics: { label: string; value: string; isSub?: boolean; isTotal?: boolean; isHighlight?: boolean }[];
}

interface ManpowerReportProps {
  isAdmin: boolean;
}

const DEFAULT_SECTIONS: Section[] = [
  {
    id: 'linking',
    title: 'Section: Linking',
    metrics: [
      { label: 'P.M', value: '01' },
      { label: 'In-Charge', value: '02(linking)' },
      { label: 'Linking Supervisor', value: '13' },
      { label: 'Technician', value: '02' },
      { label: 'Dis-Incharge', value: '01' },
      { label: 'Distributor', value: '10' },
      { label: 'Assistant Distributor Operator', value: '14' },
      { label: 'Total Linking Operator', value: '465', isTotal: true },
      { label: 'Total present operator', value: '444', isHighlight: true },
      { label: 'Absent (Linking)', value: '21', isHighlight: true },
      { label: 'Linking QI', value: '13' },
      { label: 'Alteration Man', value: '02' },
      { label: 'Auto bertak sup', value: '00' },
      { label: 'Bartak Operator', value: '13' },
      { label: 'Overlock Operator', value: '08' },
      { label: 'Auto Linking Operator', value: '15' },
      { label: 'Auto/Bar Assistant', value: '06' },
    ]
  },
  {
    id: 'trimming',
    title: 'Section: Trimming',
    metrics: [
      { label: 'Total Trimming Operator', value: '183', isTotal: true },
      { label: 'Total present Operator\'s', value: '173', isHighlight: true },
      { label: 'Absent (Trimming)', value: '10', isHighlight: true },
      { label: 'Trimming QI', value: '06' },
      { label: 'Trimming Supervisor', value: '02' },
    ]
  },
  {
    id: 'mending',
    title: 'Section: Mending',
    metrics: [
      { label: 'Total Mending Operator', value: '83', isTotal: true },
      { label: 'Total present Operators', value: '72', isHighlight: true },
      { label: 'Absent (Mending)', value: '11', isHighlight: true },
      { label: 'Mending QI', value: '07' },
      { label: 'Mending Supervisor', value: '02' },
      { label: 'Light Check Operator', value: '14' },
    ]
  }
];

export const ManpowerReport: React.FC<ManpowerReportProps> = ({ isAdmin }) => {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [companyName, setCompanyName] = useState('Leward Company Limited');
  const [reportTitle, setReportTitle] = useState('Linking Floor Manpower Report');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  const [summary, setSummary] = useState({
    present: '820',
    absent: '42'
  });

  // Auto-save logic
  useEffect(() => {
    if (!isDirty || loading) return;

    const timer = setTimeout(() => {
      handleSave(true); // silent save
    }, 3000);

    return () => clearTimeout(timer);
  }, [sections, summary, companyName, reportTitle, isDirty, loading]);

  // Load data when date changes
  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setIsDirty(false);
      try {
        const docRef = doc(db, 'manpower_reports', reportDate);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCompanyName(data.companyName || 'Leward Company Limited');
          setReportTitle(data.reportTitle || 'Linking Floor Manpower Report');
          setSections(data.sections || DEFAULT_SECTIONS);
          setSummary(data.summary || { present: '820', absent: '42' });
          setLastSaved(data.updatedAt || null);
        } else {
          // Reset to defaults if no report found
          setSections(DEFAULT_SECTIONS);
          setSummary({ present: '820', absent: '42' });
          setCompanyName('Leward Company Limited');
          setReportTitle('Linking Floor Manpower Report');
          setLastSaved(null);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `manpower_reports/${reportDate}`);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportDate]);

  const handleSave = async (silent = false) => {
    if (!silent) setSaving(true);
    try {
      const docRef = doc(db, 'manpower_reports', reportDate);
      await setDoc(docRef, {
        id: reportDate,
        date: reportDate,
        companyName,
        reportTitle,
        sections,
        summary,
        updatedAt: Date.now()
      });
      setIsDirty(false);
      setLastSaved(Date.now());
      if (!silent) alert('Report saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `manpower_reports/${reportDate}`);
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin) return;
    setDeleting(true);
    try {
      const docRef = doc(db, 'manpower_reports', reportDate);
      await deleteDoc(docRef);
      setSections(DEFAULT_SECTIONS);
      setSummary({ present: '820', absent: '42' });
      setShowDeleteConfirm(false);
      alert('Report deleted successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `manpower_reports/${reportDate}`);
    } finally {
      setDeleting(false);
    }
  };

  const updateMetric = (sectionIdx: number, metricIdx: number, newVal: string) => {
    setIsDirty(true);
    const newSections = JSON.parse(JSON.stringify(sections));
    newSections[sectionIdx].metrics[metricIdx].value = newVal;
    setSections(newSections);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 bg-slate-50 min-h-screen">
      {/* Control Panel */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between no-print">
         <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-slate-800">Manpower Report</h1>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
               <Calendar size={18} className="text-indigo-600" />
               <input 
                 type="date" 
                 value={reportDate} 
                 onChange={(e) => setReportDate(e.target.value)}
                 className="bg-transparent font-bold text-slate-700 outline-none"
               />
               {loading && <Loader2 size={16} className="animate-spin text-indigo-400" />}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
              <div className={cn("w-2 h-2 rounded-full", isDirty ? "bg-amber-400 animate-pulse" : "bg-emerald-400")}></div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                {isDirty ? 'Unsaved' : lastSaved ? `Saved ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Synced'}
              </span>
            </div>
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
                    <Trash2 size={18} />
                  </button>
                  
                  <AnimatePresence>
                    {showDeleteConfirm && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute right-0 top-[120%] z-[100] bg-white p-4 rounded-2xl shadow-2xl border border-slate-200 w-48 space-y-3"
                      >
                        <p className="text-[10px] font-black text-slate-400 uppercase text-center leading-tight">Delete this entire daily report?</p>
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
              onClick={handlePrint}
              className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
            >
              <Printer size={18} />
              Print
            </button>
         </div>
      </div>

      {/* The Report Document */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none"
      >
        {loading && (
          <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-[2px] flex items-center justify-center no-print">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="font-black text-slate-800 text-sm uppercase tracking-widest">Loading Report...</p>
            </div>
          </div>
        )}
        <div className="p-8 sm:p-12 md:p-16">
          {/* Header */}
          <div className="text-center mb-12 space-y-2">
            <input 
               value={companyName}
               onChange={(e) => {
                 setCompanyName(e.target.value);
                 setIsDirty(true);
               }}
               className="text-4xl md:text-5xl font-black text-slate-900 bg-transparent text-center outline-none w-full uppercase tracking-tighter"
            />
            <div className="flex items-center justify-center gap-4 text-slate-500 font-bold">
               <span className="flex items-center gap-1">📅 Date: {reportDate}</span>
            </div>
            <div className="pt-6">
               <input 
                  value={reportTitle}
                  onChange={(e) => {
                    setReportTitle(e.target.value);
                    setIsDirty(true);
                  }}
                  className="text-xl md:text-2xl font-black text-indigo-600 bg-transparent text-center outline-none w-full"
               />
               <div className="w-24 h-1.5 bg-indigo-600 mx-auto mt-2 rounded-full"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {sections.map((section, sIdx) => (
              <div key={section.id} className={cn("space-y-6", sIdx === 0 && "lg:col-span-2")}>
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">
                      {sIdx + 1}
                   </div>
                   <input 
                      value={section.title}
                      onChange={(e) => {
                        setIsDirty(true);
                        const newSections = [...sections];
                        newSections[sIdx].title = e.target.value;
                        setSections(newSections);
                      }}
                      className="text-xl font-black text-slate-800 outline-none flex-1 bg-transparent border-b-2 border-transparent focus:border-indigo-100"
                   />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                  {section.metrics.map((metric, mIdx) => (
                    <div 
                      key={mIdx} 
                      className={cn(
                        "flex items-center justify-between gap-4 p-2 rounded-xl transition-all group",
                        metric.isTotal ? "md:col-span-2 bg-indigo-600 text-white shadow-lg shadow-indigo-100" : 
                        metric.isHighlight ? "bg-white border border-slate-200" : ""
                      )}
                    >
                      <span className={cn(
                        "text-sm font-bold",
                        metric.isTotal ? "text-indigo-50" : "text-slate-500",
                        metric.isHighlight && "text-slate-900"
                      )}>
                        {metric.isHighlight && <span className="mr-2">🔸</span>}
                        {metric.label}:
                      </span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          value={metric.value}
                          onChange={(e) => updateMetric(sIdx, mIdx, e.target.value)}
                          className={cn(
                            "bg-transparent font-black text-right outline-none w-20 px-2 py-1 rounded-lg transition-all",
                            metric.isTotal ? "text-white text-lg bg-white/10" : "text-slate-900 bg-slate-100/50 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Grand Total Summary */}
          <div className="mt-16 pt-16 border-t-4 border-dashed border-slate-100">
             <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shadow-inner">
                   <Users size={24} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Grand Total Summary</h2>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-indigo-700 p-8 rounded-[2rem] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-8 text-white/10 group-hover:scale-110 transition-transform">
                      <Briefcase size={120} />
                   </div>
                   <p className="text-indigo-100 font-black uppercase text-sm tracking-widest mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      Total Manpower Present
                   </p>
                   <div className="flex items-baseline gap-2">
                      <input 
                        value={summary.present}
                        onChange={(e) => {
                          setIsDirty(true);
                          setSummary(prev => ({...prev, present: e.target.value}));
                        }}
                        className="text-6xl font-black bg-transparent outline-none w-full"
                      />
                   </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border-4 border-slate-100 shadow-xl shadow-slate-100 relative overflow-hidden group">
                   <p className="text-slate-400 font-black uppercase text-sm tracking-widest mb-2">Total Absent</p>
                   <div className="flex items-baseline gap-2">
                      <input 
                        value={summary.absent}
                        onChange={(e) => {
                          setIsDirty(true);
                          setSummary(prev => ({...prev, absent: e.target.value}));
                        }}
                        className="text-6xl font-black text-slate-800 bg-transparent outline-none w-full"
                      />
                   </div>
                   <div className="mt-6 flex gap-2">
                      <div className="h-2 flex-1 bg-red-100 rounded-full overflow-hidden">
                         <div className="h-full bg-red-500 w-[5%]"></div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
          
          {/* Signatures */}
          <div className="mt-24 grid grid-cols-3 gap-12 text-center no-print-section">
             <div className="space-y-4">
                <div className="h-px bg-slate-300 w-full"></div>
                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Prepared By</p>
             </div>
             <div className="space-y-4">
                <div className="h-px bg-slate-300 w-full"></div>
                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Verified By</p>
             </div>
             <div className="space-y-4">
                <div className="h-px bg-slate-300 w-full"></div>
                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Authorized Sign</p>
             </div>
          </div>
        </div>
      </motion.div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print\\:shadow-none { shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:m-0 { margin: 0 !important; }
          .bg-slate-50 { background: white !important; }
          input { border: none !important; background: transparent !important; }
        }
      `}} />
    </div>
  );
};
