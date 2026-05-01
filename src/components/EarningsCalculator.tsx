import React, { useState, useEffect } from 'react';
import { Calculator, Plus, Trash2, ArrowLeft, Download, Hash, Banknote, RefreshCcw, Save, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface CalcRow {
  id: string;
  piece: number;
  rate: number;
}

export function EarningsCalculator() {
  const [rows, setRows] = useState<CalcRow[]>([
    { id: '1', piece: 0, rate: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  const calcId = `calc_${auth.currentUser?.uid || 'anonymous'}`;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'calculators', calcId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRows(docSnap.data().rows);
          setLastSaved(docSnap.data().updatedAt);
        }
      } catch (error) {
        console.error("Error loading calculator data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [calcId]);

  const handleSave = async (silent = false) => {
    if (!silent) setSaving(true);
    try {
      const docRef = doc(db, 'calculators', calcId);
      await setDoc(docRef, {
        rows,
        updatedAt: Date.now()
      });
      setLastSaved(Date.now());
      if (!silent) alert('Calculator data saved! (হিসাবটি সেভ করা হয়েছে!)');
    } catch (error) {
      console.error("Error saving calculator data:", error);
      if (!silent) alert('Failed to save data.');
    } finally {
      if (!silent) setSaving(false);
    }
  };

  // Auto save
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSave(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [rows]);

  const addRow = () => {
    setRows([...rows, { id: Math.random().toString(36).substr(2, 9), piece: 0, rate: 0 }]);
  };

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      setRows([{ id: '1', piece: 0, rate: 0 }]);
      return;
    }
    setRows(rows.filter(row => row.id !== id));
  };

  const updateRow = (id: string, field: keyof CalcRow, value: string | number) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const resetAll = () => {
    if (confirm('Are you sure you want to clear all rows? (আপনি কি নিশ্চিত যে সব মুছে ফেলতে চান?)')) {
      setRows([{ id: '1', piece: 0, rate: 0 }]);
    }
  };

  const totalEarnings = rows.reduce((acc, row) => acc + (row.piece * row.rate), 0);
  const totalPieces = rows.reduce((acc, row) => acc + (Number(row.piece) || 0), 0);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Calculator size={24} />
          </div>
          Earnings Calculator (আয়ের হিসাব)
        </h2>
        <p className="text-slate-500 text-sm font-medium">
          Calculate your total earnings based on piece rates. (আপনার পিস রেট অনুযায়ী মোট আয় হিসাব করুন।)
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[350px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-wider w-8 text-center">#</th>
              <th className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Piece (পিস)</th>
              <th className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Rate (রেট)</th>
              <th className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Total</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <AnimatePresence mode="popLayout">
              {rows.map((row, index) => (
                <motion.tr 
                  key={row.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-2 py-1.5 text-[10px] font-bold text-slate-400 text-center">
                    {index + 1}
                  </td>
                  <td className="px-2 py-1.5">
                    <input 
                      type="number"
                      value={row.piece || ''}
                      onChange={(e) => updateRow(row.id, 'piece', Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-2 py-1.5 bg-slate-50 border-none rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-[13px] font-bold transition-all text-center"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input 
                      type="number"
                      value={row.rate || ''}
                      onChange={(e) => updateRow(row.id, 'rate', Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-2 py-1.5 bg-slate-50 border-none rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-[13px] font-bold transition-all text-center"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className="text-[13px] font-black text-slate-700">
                      {(row.piece * row.rate).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button 
                      onClick={() => removeRow(row.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
          <tfoot>
            <tr className="bg-indigo-50/50 border-t border-indigo-100">
              <td className="px-3 py-2 text-[11px] font-black text-indigo-900">
                Total
              </td>
              <td className="px-3 py-2 text-center">
                <span className="text-[11px] font-black text-indigo-700">{totalPieces}</span>
              </td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2 text-right">
                <span className="text-[11px] font-black text-indigo-700">{totalEarnings.toLocaleString()} ৳</span>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={addRow}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
            <Plus size={18} />
            Add Row (আরো যোগ করুন)
          </button>
          <button 
            onClick={resetAll}
            className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            <RefreshCcw size={18} />
            Reset (ক্লিয়ার করুন)
          </button>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6 px-8">
           <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400">Total Pieces</span>
              <span className="text-lg font-black text-slate-800">{totalPieces}</span>
           </div>
           <div className="w-px h-8 bg-slate-100" />
           <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400">Total Earnings</span>
              <span className="text-2xl font-black text-indigo-600">{totalEarnings.toLocaleString()} ৳</span>
           </div>
        </div>
      </div>
    </div>
  );
}
