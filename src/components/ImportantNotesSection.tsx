import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Trash2, Edit3, ShieldAlert, CheckCircle2, AlertCircle, Save, Loader2, X, Plus } from 'lucide-react';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { ImportantNote, OperationType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';

export default function ImportantNotesSection() {
  const [notes, setNotes] = useState<ImportantNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<ImportantNote>>({
    personName: '',
    role: '',
    content: '',
    priority: 'medium'
  });

  useEffect(() => {
    const q = query(collection(db, 'important_notes'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImportantNote));
      setNotes(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'important_notes');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!formData.personName || !formData.content) return;
    setSaving(true);
    const id = formData.id || uuidv4();
    try {
      await setDoc(doc(db, 'important_notes', id), {
        ...formData,
        id,
        updatedAt: Date.now()
      });
      setIsAdding(false);
      setFormData({ personName: '', role: '', content: '', priority: 'medium' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `important_notes/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await deleteDoc(doc(db, 'important_notes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `important_notes/${id}`);
    }
  };

  const filteredNotes = notes.filter(n => 
    n.personName.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    n.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">
            VIP Notes & Contacts
          </h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            গুরুত্বপূর্ণ ব্যক্তিদের জন্য বার্তা ও নোট
          </p>
        </div>
        
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 transition-all shadow-xl shadow-slate-100 active:scale-95"
        >
          <Plus size={18} />
          Create New Note
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Search VIPs, roles or notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredNotes.map((note) => (
            <motion.div
              layout
              key={note.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group bg-white border border-slate-200 p-6 rounded-[2rem] hover:ring-2 hover:ring-indigo-500 transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-white font-black",
                      note.priority === 'high' ? 'bg-red-500' : note.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                    )}>
                      {note.personName[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg leading-tight uppercase tracking-tighter">
                        {note.personName}
                      </h3>
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                        {note.role || 'Personnel'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(note.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-2xl mb-4 min-h-[100px]">
                  <p className="text-sm font-medium text-slate-600 italic whitespace-pre-wrap">
                    "{note.content}"
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 text-[10px] uppercase font-black tracking-widest text-slate-400">
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    note.priority === 'high' ? 'bg-red-500' : note.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                  )}></div>
                  {note.priority} Priority
                </div>
                <div>
                  Updated {new Date(note.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">New Note</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add information about important person</p>
              </div>
              <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400 hover:text-red-500"><X /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Name (নাম)</label>
                <input 
                  value={formData.personName}
                  onChange={(e) => setFormData({...formData, personName: e.target.value})}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                  placeholder="e.g. Abdur Rahman"
                />
              </div>

              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Role/Title (পদবী)</label>
                <input 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                  placeholder="e.g. Managing Director"
                />
              </div>

              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Note Content (বিস্তারিত বার্তা)</label>
                <textarea 
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold min-h-[120px]"
                  placeholder="Type your important note here..."
                />
              </div>

              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Priority (গুরুত্ব)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setFormData({...formData, priority: p})}
                      className={cn(
                        "py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border-2 transition-all",
                        formData.priority === p 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={() => setIsAdding(false)}
                className="flex-1 px-6 py-4 bg-slate-100 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={saving || !formData.personName || !formData.content}
                className="flex-3 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-indigo-100"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Save Private Note
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
