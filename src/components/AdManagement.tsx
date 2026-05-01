import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Save, X, ExternalLink, Megaphone, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { OperationType } from '../types';

interface Ad {
  id: string;
  title: string;
  description: string;
  link: string;
  color: string;
  image?: string;
  createdAt: number;
}

const COLOR_OPTIONS = [
  { name: 'Indigo', value: 'from-indigo-600 to-blue-600' },
  { name: 'Dark Slate', value: 'from-slate-800 to-slate-900' },
  { name: 'Rose', value: 'from-rose-500 to-pink-600' },
  { name: 'Emerald', value: 'from-emerald-600 to-teal-700' },
  { name: 'Amber', value: 'from-amber-500 to-orange-600' }
];

export const AdManagement: React.FC = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAd, setEditingAd] = useState<Partial<Ad> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'ads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ad));
      setAds(adsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'ads');
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!editingAd?.title || !editingAd?.description || !editingAd?.link) {
      alert("Please fill in all fields.");
      return;
    }

    setSaving(true);
    try {
      if (editingAd.id) {
        // Update
        const adId = editingAd.id;
        const adRef = doc(db, 'ads', adId);
        try {
          await updateDoc(adRef, {
            title: editingAd.title,
            description: editingAd.description,
            link: editingAd.link,
            color: editingAd.color || COLOR_OPTIONS[0].value,
            image: editingAd.image || null,
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `ads/${adId}`);
        }
      } else {
        // Create
        try {
          await addDoc(collection(db, 'ads'), {
            title: editingAd.title,
            description: editingAd.description,
            link: editingAd.link,
            color: editingAd.color || COLOR_OPTIONS[0].value,
            image: editingAd.image || null,
            createdAt: Date.now()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'ads');
        }
      }
      setEditingAd(null);
    } catch (error) {
      console.error("Error saving ad:", error);
      // alert is handled by the thrown error if missing or insufficient perms
      // for other errors, we can keep the alert if we want, but handleFirestoreError throws
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ad?")) return;
    try {
      await deleteDoc(doc(db, 'ads', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `ads/${id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <Megaphone size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Ad Management</h1>
            <p className="text-sm font-bold text-slate-400">Create and manage your in-app advertisements</p>
          </div>
        </div>
        {!editingAd && (
          <button 
            onClick={() => setEditingAd({ color: COLOR_OPTIONS[0].value })}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
          >
            <Plus size={18} />
            Add New Ad
          </button>
        )}
      </div>

      <AnimatePresence>
        {editingAd && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-200 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">{editingAd.id ? 'Edit Advertisement' : 'Create New Advertisement'}</h2>
              <button 
                onClick={() => setEditingAd(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                disabled={saving}
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Headline</label>
                  <input 
                    type="text"
                    value={editingAd.title || ''}
                    onChange={(e) => setEditingAd({...editingAd, title: e.target.value})}
                    placeholder="e.g., Summer Collection 2026"
                    className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none font-black text-slate-900 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Description</label>
                  <textarea 
                    value={editingAd.description || ''}
                    onChange={(e) => setEditingAd({...editingAd, description: e.target.value})}
                    placeholder="Describe your offer in a few words..."
                    rows={3}
                    className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none font-bold text-slate-700 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Target Link URL</label>
                  <input 
                    type="text"
                    value={editingAd.link || ''}
                    onChange={(e) => setEditingAd({...editingAd, link: e.target.value})}
                    placeholder="https://example.com/promo"
                    className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none font-bold text-slate-900 transition-all font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Ad Image (Optional)</label>
                  <div className="bg-slate-50 p-4 rounded-2xl space-y-4 border-2 border-dashed border-slate-200">
                    {editingAd.image ? (
                       <div className="relative w-full aspect-video rounded-xl overflow-hidden group border-2 border-white shadow-md">
                          <img src={editingAd.image} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={() => setEditingAd({...editingAd, image: undefined})}
                              className="p-3 bg-red-600 text-white rounded-full hover:scale-110 transition-transform active:scale-95"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                       </div>
                    ) : (
                       <div className="flex flex-col items-center justify-center py-6 gap-3">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-300">
                            <ImageIcon size={24} />
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Upload visual asset</p>
                            <label className="cursor-pointer px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-50 transition-all active:scale-95 inline-block shadow-sm">
                              Choose Image
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setEditingAd({...editingAd, image: reader.result as string});
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                       </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Theme Color</label>
                  <div className="grid grid-cols-2 gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button 
                        key={color.value}
                        onClick={() => setEditingAd({...editingAd, color: color.value})}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-xl border-2 transition-all",
                          editingAd.color === color.value ? "border-indigo-600 bg-indigo-50" : "border-slate-100 bg-white hover:border-slate-200"
                        )}
                      >
                        <div className={cn("w-4 h-4 rounded-full bg-gradient-to-br", color.value)}></div>
                        <span className="text-[10px] font-black uppercase text-slate-600">{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Live Preview</label>
                  <div className={cn(
                    "rounded-2xl p-6 text-white bg-gradient-to-br shadow-inner",
                    editingAd.color || COLOR_OPTIONS[0].value
                  )}>
                     <h3 className="font-black leading-tight text-lg">{editingAd.title || 'Headline'}</h3>
                     <p className="text-xs font-bold text-white/80 mt-1 line-clamp-2">{editingAd.description || 'Description will appear here...'}</p>
                     <div className="mt-4 inline-flex items-center gap-2 bg-white text-slate-900 px-3 py-1.5 rounded-lg text-[10px] font-black">
                        LEARN MORE <ExternalLink size={10} />
                     </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button 
                onClick={() => setEditingAd(null)}
                className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save Advertisement
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          Array(2).fill(0).map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-[2.5rem]"></div>
          ))
        ) : ads.length === 0 ? (
          <div className="md:col-span-2 bg-white p-12 rounded-[2.5rem] border-4 border-dashed border-slate-100 text-center space-y-4">
             <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                <Megaphone size={32} />
             </div>
             <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">No Advertisements Yet</h3>
                <p className="text-slate-400 font-bold max-w-xs mx-auto text-sm">Create your first ad to show promotional content throughout the app.</p>
             </div>
          </div>
        ) : (
          ads.map((ad) => (
            <div key={ad.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 group hover:shadow-xl transition-all space-y-4 relative overflow-hidden">
               <div className={cn(
                 "h-2 w-full absolute top-0 left-0 bg-gradient-to-r",
                 ad.color
               )}></div>
               
               <div className="flex items-center justify-between pt-2">
                 <h3 className="font-black text-slate-900 truncate pr-4">{ad.title}</h3>
                 <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingAd(ad)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(ad.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                 </div>
               </div>

               {ad.image && (
                 <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-inner bg-slate-50">
                    <img src={ad.image} alt={ad.title} className="w-full h-full object-cover" />
                 </div>
               )}

               <p className="text-sm font-bold text-slate-500 line-clamp-2 leading-relaxed">{ad.description}</p>
               
               <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Added {new Date(ad.createdAt).toLocaleDateString()}</span>
                  <a href={ad.link} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg">
                    <ExternalLink size={14} />
                  </a>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
