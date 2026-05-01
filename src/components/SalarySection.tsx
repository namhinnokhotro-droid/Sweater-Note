import React, { useState, useMemo, useEffect } from 'react';
import { Printer, User, Calendar, TrendingUp, Info, Plus, X, UserPlus, Save, Loader2 } from 'lucide-react';
import { Worker, WorkLog, SalaryReport, OperationType } from '../types';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError } from '../lib/firebase';

interface Props {
  workers: Worker[];
  workLogs: WorkLog[];
  currentUser: Worker | null;
  isAdmin: boolean;
}

export function SalarySection({ workers, workLogs, currentUser, isAdmin }: Props) {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(currentUser?.id || (workers[0]?.id || ''));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  const selectedWorker = workers.find(w => w.id === selectedWorkerId);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Local state for full manual editing
  const [manualHeaders, setManualHeaders] = useState({
    companyName: 'Leward Garments Limited',
    name: '',
    card: '',
    month: '',
    section: '',
    supervisor: '',
    line: '',
    year: ''
  });
  const [columnCount, setColumnCount] = useState(8);
  const [manualStyles, setManualStyles] = useState<string[]>(Array(columnCount).fill(''));
  const [manualGrid, setManualGrid] = useState<Record<number, Record<number, string>>>({});
  const [manualSignatures, setManualSignatures] = useState([
    'Operator Sign',
    'Supervisor Signature',
    'Manager Approval'
  ]);
  const [remarks, setRemarks] = useState('');

  const reportId = `${selectedWorkerId}_${selectedYear}_${selectedMonth}`;

  // Fetch saved report or sync from logs if not exists
  useEffect(() => {
    const fetchSavedReport = async () => {
      setLoading(true);
      setIsDirty(false);
      try {
        const docRef = doc(db, 'salary_reports', reportId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as SalaryReport;
          setManualHeaders(data.headers);
          setManualStyles(data.styles);
          setManualGrid(data.grid);
          setManualSignatures(data.signatures);
          setRemarks(data.remarks || '');
          setColumnCount(data.styles.length);
          setLastSaved(data.updatedAt);
        } else {
          // Sync from workLogs if no saved report
          if (selectedWorker) {
            setManualHeaders({
              companyName: 'Leward Garments Limited',
              name: selectedWorker.name,
              card: selectedWorker.cardNumber || '',
              month: monthNames[selectedMonth],
              section: selectedWorker.factoryName || '',
              supervisor: '',
              line: selectedWorker.lineNumber || '',
              year: selectedYear.toString()
            });

            const workerMonthLogs = workLogs.filter(log => {
              const logDate = new Date(log.date);
              return (
                log.workerId === selectedWorkerId &&
                logDate.getMonth() === selectedMonth &&
                logDate.getFullYear() === selectedYear
              );
            });

            const stylesSet = new Set<string>();
            workerMonthLogs.forEach(l => stylesSet.add(l.styleNumber));
            const foundStyles = Array.from(stylesSet);
            
            const initialColumnCount = Math.max(8, foundStyles.length);
            setColumnCount(initialColumnCount);
            
            const newStyles = Array.from({ length: initialColumnCount }, (_, i) => foundStyles[i] || '');
            setManualStyles(newStyles);

            const newGrid: Record<number, Record<number, string>> = {};
            for (let day = 1; day <= 31; day++) {
              newGrid[day] = {};
              for (let styleIdx = 0; styleIdx < initialColumnCount; styleIdx++) {
                const style = foundStyles[styleIdx];
                if (style) {
                  const logVal = workerMonthLogs
                    .filter(l => new Date(l.date).getDate() === day && l.styleNumber === style)
                    .reduce((s, l) => s + l.quantity, 0);
                  if (logVal > 0) newGrid[day][styleIdx] = logVal.toString();
                }
              }
            }
            setManualGrid(newGrid);
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `salary_reports/${reportId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedReport();
  }, [selectedWorkerId, selectedMonth, selectedYear]);

  // Auto-save logic
  useEffect(() => {
    if (!isDirty || loading) return;

    const timer = setTimeout(() => {
      handleSave(true); // silent save
    }, 5000);

    return () => clearTimeout(timer);
  }, [manualHeaders, manualStyles, manualGrid, manualSignatures, remarks, isDirty, loading]);

  const handleSave = async (silent = false) => {
    if (!silent) setSaving(true);
    try {
      const docRef = doc(db, 'salary_reports', reportId);
      await setDoc(docRef, {
        id: reportId,
        workerId: selectedWorkerId,
        month: selectedMonth,
        year: selectedYear,
        headers: manualHeaders,
        styles: manualStyles,
        grid: manualGrid,
        signatures: manualSignatures,
        remarks,
        updatedAt: Date.now()
      });
      setIsDirty(false);
      setLastSaved(Date.now());
      if (!silent) alert('Salary report saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `salary_reports/${reportId}`);
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const addColumn = () => {
    setIsDirty(true);
    setColumnCount(prev => prev + 1);
    setManualStyles(prev => [...prev, '']);
  };

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);

  const grandTotalPcs = useMemo(() => {
    let total = 0;
    Object.values(manualGrid).forEach(dayRow => {
      Object.values(dayRow).forEach(val => {
        const num = parseInt(val) || 0;
        total += num;
      });
    });
    return total;
  }, [manualGrid]);

  const updateHeader = (field: keyof typeof manualHeaders, val: string) => {
    setIsDirty(true);
    setManualHeaders(prev => ({ ...prev, [field]: val }));
  };

  const updateGrid = (day: number, styleIdx: number, val: string) => {
    setIsDirty(true);
    setManualGrid(prev => ({
      ...prev,
      [day]: {
        ...(prev[day] || {}),
        [styleIdx]: val
      }
    }));
  };

  const updateStyle = (idx: number, val: string) => {
    setIsDirty(true);
    const newStyles = [...manualStyles];
    newStyles[idx] = val;
    setManualStyles(newStyles);
  };

  const updateSignature = (idx: number, val: string) => {
    setIsDirty(true);
    const newSigns = [...manualSignatures];
    newSigns[idx] = val;
    setManualSignatures(newSigns);
  };

  const [isAddingNewWorker, setIsAddingNewWorker] = useState(false);
  const [newWorkerData, setNewWorkerData] = useState({ name: '', cardNumber: '', lineNumber: '' });

  const handleReset = async () => {
    if (!selectedWorker) return;
    if (confirm('Are you sure you want to reset all manual edits to automatically calculated data? (আপনি কি হিসাবটি রিসেট করতে চান?)')) {
      const confirmRes = confirm('This will also clear any saved manual edits from the database for this specific month. Continue? (এটি ডাটাবেস থেকেও আপনার ম্যানুয়াল এডিট মুছে ফেলবে। আপনি কি এগিয়ে যেতে চান?)');
      if (confirmRes) {
        setLoading(true);
        try {
          setManualHeaders({
            companyName: 'Leward Garments Limited',
            name: selectedWorker.name,
            card: selectedWorker.cardNumber || '',
            month: monthNames[selectedMonth],
            section: selectedWorker.factoryName || '',
            supervisor: '',
            line: selectedWorker.lineNumber || '',
            year: selectedYear.toString()
          });

          const workerMonthLogs = workLogs.filter(log => {
            const logDate = new Date(log.date);
            return (
              log.workerId === selectedWorkerId &&
              logDate.getMonth() === selectedMonth &&
              logDate.getFullYear() === selectedYear
            );
          });

          const stylesSet = new Set<string>();
          workerMonthLogs.forEach(l => stylesSet.add(l.styleNumber));
          const foundStyles = Array.from(stylesSet);
          
          const initialColumnCount = Math.max(8, foundStyles.length);
          setColumnCount(initialColumnCount);
          
          const newStyles = Array.from({ length: initialColumnCount }, (_, i) => foundStyles[i] || '');
          setManualStyles(newStyles);

          const newGrid: Record<number, Record<number, string>> = {};
          for (let day = 1; day <= 31; day++) {
            newGrid[day] = {};
            for (let styleIdx = 0; styleIdx < initialColumnCount; styleIdx++) {
              const style = foundStyles[styleIdx];
              if (style) {
                const logVal = workerMonthLogs
                  .filter(l => new Date(l.date).getDate() === day && l.styleNumber === style)
                  .reduce((s, l) => s + l.quantity, 0);
                if (logVal > 0) newGrid[day][styleIdx] = logVal.toString();
              }
            }
          }
          setManualGrid(newGrid);
          setManualSignatures(['Operator Sign', 'Supervisor Signature', 'Manager Approval']);
          setRemarks('');
          setIsDirty(true);
          alert('Data reset to log values. Changes will be saved shortly. (ডাটা রিসেট হয়েছে। শীঘ্রই সেভ হবে।)');
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handleAddNewWorker = async () => {
    if (!newWorkerData.name) return;
    const id = uuidv4();
    try {
      await setDoc(doc(db, 'workers', id), {
        id,
        name: newWorkerData.name,
        cardNumber: newWorkerData.cardNumber,
        lineNumber: newWorkerData.lineNumber,
        joinedAt: Date.now(),
        department: 'leward',
        factoryName: selectedWorker?.factoryName || ''
      });
      setSelectedWorkerId(id);
      setIsAddingNewWorker(false);
      setNewWorkerData({ name: '', cardNumber: '', lineNumber: '' });
      alert('New worker added successfully!');
    } catch (error) {
      console.error("Error adding worker:", error);
      alert('Failed to add worker.');
    }
  };

  return (
    <div className="max-w-full mx-auto w-full flex flex-col gap-6 p-4 bg-slate-100 min-h-screen">
      
      {/* Controls Area (Hidden on Print) */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-5 rounded-3xl shadow-sm border border-slate-200 no-print">
        <div className="flex flex-wrap gap-4 items-center">
          {isAdmin && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 pr-4 group transition-all focus-within:border-indigo-400">
                <div className="p-1 px-2 text-slate-400 group-focus-within:text-indigo-500"><User size={18} /></div>
                <select 
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="bg-transparent font-black text-sm outline-none text-slate-700 py-1"
                >
                  {workers.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.cardNumber})</option>
                  ))}
                </select>
              </div>
              
              <button 
                onClick={() => setIsAddingNewWorker(true)}
                className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all border border-indigo-100 flex items-center gap-2"
                title="Add New Worker"
              >
                <UserPlus size={18} />
                <span className="text-[10px] font-black uppercase">Add New</span>
              </button>
            </div>
          )}
          
          <div className="flex flex-col">
            <div className="flex gap-3">
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 pr-4 group transition-all focus-within:border-indigo-400">
                <div className="p-1 px-2 text-slate-400 group-focus-within:text-indigo-500"><Calendar size={18} /></div>
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-transparent font-black text-sm outline-none text-slate-700 py-1"
                >
                  {monthNames.map((n, i) => <option key={i} value={i}>{n}</option>)}
                </select>
              </div>
              
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 pr-4 group transition-all focus-within:border-indigo-400">
                <div className="p-1 px-2 text-slate-400 group-focus-within:text-indigo-500"><TrendingUp size={18} /></div>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent font-black text-sm outline-none text-slate-700 py-1"
                >
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            {lastSaved && (
               <p className="text-[10px] font-bold text-slate-400 mt-1 ml-2 uppercase flex items-center gap-1.5">
                 <div className={cn("w-1 h-1 rounded-full", isDirty ? "bg-amber-400 animate-pulse" : "bg-emerald-400")}></div>
                 {isDirty ? 'Unsaved changes...' : `Last saved: ${new Date(lastSaved).toLocaleTimeString()}`}
               </p>
            )}
          </div>
          
          <div className="h-8 w-px bg-slate-200 mx-2"></div>
          
          <button 
            onClick={handleReset}
            className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors"
          >
            Reset From Logs
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleSave(false)}
            disabled={saving || !isDirty}
            className="px-6 py-3 bg-slate-100 text-slate-900 border-2 border-slate-200 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isDirty ? 'Save Now' : 'Synced'}
          </button>
          
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-3 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
          >
            <Printer size={18} />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* THE SHEET - High Fidelity Representation */}
      <div className="relative bg-white p-8 sm:p-16 shadow-xl border border-slate-200 rounded-lg overflow-x-auto print:shadow-none print:border-none print:p-0 print:rounded-none mx-auto print:mx-0 min-w-[1000px]">
        
        {loading && (
          <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-[2px] flex items-center justify-center no-print">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="font-black text-slate-800 text-sm uppercase tracking-widest">Loading Sheet...</p>
            </div>
          </div>
        )}

        {/* Company Title (New Addition) */}
        <div className="text-center mb-8">
           <input 
             type="text"
             value={manualHeaders.companyName}
             onChange={(e) => updateHeader('companyName', e.target.value)}
             className="text-4xl font-black text-slate-900 bg-transparent text-center border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none w-full uppercase tracking-tighter"
             placeholder="COMPANY NAME"
           />
           <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-[0.4em]">Monthly Production Sheet</div>
        </div>

        {/* Top Header Labels (Following the provided image exactly) */}
        <div className="flex justify-between mb-10">
          {/* Left Column Labels */}
          <div className="w-[45%] space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-slate-800 min-w-[125px]">Operator Name:=</span>
              <input 
                type="text"
                value={manualHeaders.name}
                onChange={(e) => updateHeader('name', e.target.value)}
                className="flex-1 border-b border-black h-8 bg-transparent outline-none font-black text-lg px-2 focus:bg-indigo-50/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-slate-800 min-w-[125px]">Card Number:=</span>
              <input 
                type="text"
                value={manualHeaders.card}
                onChange={(e) => updateHeader('card', e.target.value)}
                className="flex-1 border-b border-black h-8 bg-transparent outline-none font-black text-lg px-2 focus:bg-indigo-50/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-slate-800 min-w-[125px]">Month:=</span>
              <input 
                type="text"
                value={manualHeaders.month}
                onChange={(e) => updateHeader('month', e.target.value)}
                className="flex-1 border-b border-black h-8 bg-transparent outline-none font-black text-lg px-2 focus:bg-indigo-50/30"
              />
            </div>
          </div>

          {/* Right Column Labels */}
          <div className="w-[45%] space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-slate-800 min-w-[145px]">Section:=</span>
              <input 
                type="text"
                value={manualHeaders.section}
                onChange={(e) => updateHeader('section', e.target.value)}
                className="flex-1 border-b border-black h-8 bg-transparent outline-none font-black text-lg px-2 focus:bg-indigo-50/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-slate-800 min-w-[145px]">Name Of Supervisor:=</span>
              <input 
                type="text"
                value={manualHeaders.supervisor}
                onChange={(e) => updateHeader('supervisor', e.target.value)}
                className="flex-1 border-b border-black h-8 bg-transparent outline-none font-black text-lg px-2 focus:bg-indigo-50/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-slate-800 min-w-[145px]">Line Number:=</span>
              <input 
                type="text"
                value={manualHeaders.line}
                onChange={(e) => updateHeader('line', e.target.value)}
                className="flex-1 border-b border-black h-8 bg-transparent outline-none font-black text-lg px-2 focus:bg-indigo-50/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-slate-800 min-w-[145px]">Year:=</span>
              <input 
                type="text"
                value={manualHeaders.year}
                onChange={(e) => updateHeader('year', e.target.value)}
                className="flex-1 border-b border-black h-8 bg-transparent outline-none font-black text-lg px-2 focus:bg-indigo-50/30"
              />
            </div>
          </div>
        </div>

        {/* The Grid Table - Exactly like the form in image */}
        <div className="border-[2px] border-black">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-[2px] border-black h-12">
                <th className="border-r-[1.5px] border-black p-1 w-16 text-center font-black text-sm">Date</th>
                <th className="border-r-[1.5px] border-black p-1 w-20"></th>
                
                {/* Dynamic Columns of Style */}
                {manualStyles.map((_, i) => (
                  <th key={i} className="border-r-[1.5px] border-black p-0 text-[11px] font-black min-w-[80px]">
                    <div className="p-1.5 border-b border-black h-7 flex items-center justify-center italic">
                       <input 
                        type="text"
                        value={manualStyles[i]}
                        onChange={(e) => updateStyle(i, e.target.value)}
                        placeholder="Style"
                        className="w-full h-full bg-transparent text-center italic font-black outline-none border-none placeholder:text-slate-300"
                       />
                    </div>
                    <div className="h-5 flex items-center justify-center bg-slate-50 text-[9px]">QYT PCS</div>
                  </th>
                ))}
                
                <th className="border-r border-black p-0 w-10 no-print align-middle bg-slate-50">
                  <button 
                    onClick={addColumn}
                    className="w-full h-full flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-colors py-2"
                    title="Add Style Column"
                  >
                    <span className="text-xl font-bold">+</span>
                  </button>
                </th>
                
                <th className="p-1 font-black text-xs uppercase bg-slate-100 text-center">Grand Total</th>
              </tr>
            </thead>
            <tbody>
              {daysArray.map(day => {
                let rowSum = 0;
                const isOutOfMonth = day > daysInMonth;
                return (
                  <tr key={day} className={cn(
                    "border-b border-black h-8",
                    isOutOfMonth ? "bg-slate-50/50" : ""
                  )}>
                    <td className="border-r-[1.5px] border-black p-1 text-center font-bold text-xs bg-slate-50">{day}</td>
                    <td className="border-r-[1.5px] border-black p-1"></td>
                    
                    {manualStyles.map((_, i) => {
                      const qytStr = manualGrid[day]?.[i] || '';
                      rowSum += parseInt(qytStr) || 0;
                      return (
                        <td key={i} className="border-r-[1.5px] border-black p-0 text-center hover:bg-indigo-50/20 transition-colors">
                          <input 
                            type="text"
                            value={qytStr}
                            onChange={(e) => updateGrid(day, i, e.target.value)}
                            className="w-full h-full p-1 bg-transparent text-center font-bold text-sm outline-none"
                          />
                        </td>
                      );
                    })}
                    
                    <td className="border-r border-black no-print bg-slate-50/30"></td>
                    
                    <td className="p-1 text-center font-black bg-slate-200 text-sm">
                      {rowSum > 0 ? rowSum : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-200 font-black h-14 border-t-[2px] border-black">
                <td colSpan={2} className="px-4 text-left border-r-[1.5px] border-black text-xs">Total Monthly Production:</td>
                {manualStyles.map((_, i) => {
                  const rows = Object.values(manualGrid) as Record<number, string>[];
                  const styleTotal = rows.reduce((s: number, dayRow) => {
                    const val = dayRow[i] || '0';
                    return s + (parseInt(val) || 0);
                  }, 0);
                  return (
                    <td key={i} className="p-1 text-center border-r-[1.5px] border-black text-sm text-indigo-700">
                      {styleTotal > 0 ? styleTotal : ''}
                    </td>
                  );
                })}
                <td className="border-r border-black no-print"></td>
                <td className="p-1 text-center bg-indigo-700 text-white text-xl">
                  {grandTotalPcs}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer Remarks / Signature Area */}
        <div className="mt-12 w-full">
           <div className="flex gap-2 items-start">
              <span className="text-[12px] font-bold text-slate-800 min-w-[90px] pt-1">Remarks:</span>
              <textarea 
                 value={remarks}
                 onChange={(e) => {
                   setRemarks(e.target.value);
                   setIsDirty(true);
                 }}
                 className="flex-1 border-b border-black bg-transparent outline-none min-h-[60px] p-1 font-medium text-sm resize-none focus:bg-indigo-50/30"
                 placeholder="Enter any additional notes here..."
              />
           </div>
        </div>

        <div className="mt-16 flex justify-between gap-10">
          {manualSignatures.map((sign, idx) => (
            <div key={idx} className="flex flex-col items-center gap-3 w-1/3">
              <div className="w-full border-b border-black"></div>
              <input 
                type="text" 
                value={sign} 
                onChange={(e) => updateSignature(idx, e.target.value)}
                className="w-full bg-transparent text-center text-[10px] font-black uppercase text-slate-500 outline-none focus:text-indigo-600"
              />
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; margin: 1cm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .max-w-full { p-0 !important; }
          .bg-slate-100 { background: white !important; }
          input { border: none !important; }
        }
      `}} />

      {/* Add New Worker Modal */}
      <AnimatePresence>
        {isAddingNewWorker && (
          <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl relative"
            >
              <button 
                onClick={() => setIsAddingNewWorker(false)}
                className="absolute right-6 top-6 p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={20} className="text-slate-400" />
              </button>
              
              <h2 className="text-2xl font-black text-slate-800 mb-6">Add New Worker</h2>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Sumon Islam"
                    value={newWorkerData.name}
                    onChange={(e) => setNewWorkerData(prev => ({...prev, name: e.target.value}))}
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Card Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1346"
                      value={newWorkerData.cardNumber}
                      onChange={(e) => setNewWorkerData(prev => ({...prev, cardNumber: e.target.value}))}
                      className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Line Number</label>
                    <input 
                      type="text" 
                      placeholder="Line #"
                      value={newWorkerData.lineNumber}
                      onChange={(e) => setNewWorkerData(prev => ({...prev, lineNumber: e.target.value}))}
                      className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleAddNewWorker}
                  className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl mt-4 transition-all active:scale-[0.98] shadow-xl shadow-slate-200"
                >
                  Create Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

