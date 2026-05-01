import React, { useState, useRef, useEffect } from 'react';
import { Plus, LayoutGrid, Search, Image as ImageIcon, X, ChevronRight, Calculator, SlidersHorizontal, Users, History, ClipboardCheck, MessageSquare, AlertCircle, User, Wallet, FileText, Zap, Megaphone, Trophy, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { Sweater, initialCosting, Worker, WorkLog, OperationType } from './types';
import { SweaterCard } from './components/SweaterCard';
import { CostingForm } from './components/CostingForm';
import { WorkerSection } from './components/WorkerSection';
import { WorkLogSection } from './components/WorkLogSection';
import { GlobalChat } from './components/GlobalChat';
import { cn } from './lib/utils';
import { db, handleFirestoreError } from './lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

import { Settings, LogOut, Shield } from 'lucide-react';

import { ProblemSection } from './components/ProblemSection';
import { RegistrationModal } from './components/RegistrationModal';
import { QISection } from './components/QISection';
import { AIAgent } from './components/AIAgent';
import { EarningsCalculator } from './components/EarningsCalculator';
import { SalarySection } from './components/SalarySection';
import { ManpowerReport } from './components/ManpowerReport';
import { ProductionReport } from './components/ProductionReport';
import { AdSection } from './components/AdSection';
import { AdManagement } from './components/AdManagement';
import { SupervisorReport } from './components/SupervisorReport';
import ImportantNotesSection from './components/ImportantNotesSection';


import { ImageCropper } from './components/ImageCropper';

export default function App() {
  const [view, setView] = useState<'sweaters' | 'workers' | 'finishing' | 'chat' | 'problem' | 'qi' | 'calculator' | 'salary' | 'manpower' | 'production' | 'ads' | 'supervisor' | 'notes'>('sweaters');
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('isAdmin') === 'true');
  const [currentUser, setCurrentUser] = useState<Worker | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [showLogin, setShowLogin] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [croppingMode, setCroppingMode] = useState<'sweater' | 'profile' | null>(null);

  useEffect(() => {
    localStorage.setItem('isAdmin', isAdmin.toString());
  }, [isAdmin]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  // Redirect to registration if no user and not admin
  useEffect(() => {
    if (!currentUser && !isAdmin && !isLoading) {
      setShowRegistration(true);
    }
  }, [currentUser, isAdmin, isLoading]);
  const [sweaters, setSweaters] = useState<Sweater[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSweater, setCurrentSweater] = useState<Partial<Sweater> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create context for AI
  const workerSummary = workers.map(w => `${w.name} (Card: ${w.cardNumber}, Line: ${w.lineNumber})`).join(', ');
  const productionSummary = workLogs.slice(0, 10).map(l => {
    const worker = workers.find(w => w.id === l.workerId);
    return `${worker?.name || 'Unknown'} did ${l.quantity} pcs of Style ${l.styleNumber} (${l.operation})`;
  }).join('; ');

  const aiContext = `
    Factory Name: ${currentUser?.factoryName || 'N/A'}
    Current State:
    - Workers: ${workerSummary}
    - Recent Production: ${productionSummary}
    - Total Designs: ${sweaters.length}
    - Current View: ${view}
    - Current User: ${currentUser?.name || 'Guest'}
    
    Misti, you know these people personally. Be friendly and playful with this info!
  `;

  // Subscribe to Firestore updates
  useEffect(() => {
    // Sweaters sub
    const qSweaters = query(collection(db, 'sweaters'), orderBy('createdAt', 'desc'));
    const unsubSweaters = onSnapshot(qSweaters, (snapshot) => {
      setSweaters(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Sweater[]);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sweaters');
      setIsLoading(false);
    });

    // Workers sub
    const qWorkers = query(collection(db, 'workers'), orderBy('joinedAt', 'desc'));
    const unsubWorkers = onSnapshot(qWorkers, (snapshot) => {
      setWorkers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Worker[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'workers'));

    // Logs sub
    const qLogs = query(collection(db, 'workLogs'), orderBy('date', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setWorkLogs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as WorkLog[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'workLogs'));

    return () => {
      unsubSweaters();
      unsubWorkers();
      unsubLogs();
    };
  }, []);

  const handleAddNew = (companyName?: string) => {
    setCurrentSweater({
      id: uuidv4(),
      name: '',
      image: '',
      factoryName: companyName || currentUser?.factoryName || '',
      createdAt: Date.now(),
      costing: { ...initialCosting },
    });
    setIsEditing(true);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!currentSweater || !currentSweater.id) return;
    setIsSaving(true);

    const newSweater = { ...currentSweater } as Sweater;
    
    // Check data size (Firestore 1MB limit)
    const dataSize = JSON.stringify(newSweater).length;
    if (dataSize > 900000) {
      alert("Design data is too large (likely the image). Please try a smaller image or no image.");
      setIsSaving(false);
      return;
    }

    // Use style number as name if name is empty
    if (!newSweater.name) {
      newSweater.name = newSweater.costing.styleNumber || 'Untitled Design';
    }
    
    try {
      console.log("Attempting to save to Firestore. Data size:", dataSize, "bytes");
      
      const saveToFirestore = async (data: Sweater) => {
        const docRef = doc(db, 'sweaters', data.id);
        await setDoc(docRef, data);
      };

      const timeoutPromise = (ms: number) => new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Network timeout: The connection is too slow.")), ms)
      );

      try {
        // Try saving with image first (12 second timeout)
        await Promise.race([saveToFirestore(newSweater), timeoutPromise(12000)]);
        window.alert("Saved Successfully! (সফলভাবে সংরক্ষিত হয়েছে)");
      } catch (firstError) {
        console.warn("First save attempt failed:", firstError);
        
        // If it failed or timed out, and there's an image, try one last time WITHOUT the image
        if (newSweater.image) {
          const confirmWithoutImage = window.confirm("Uploading the photo is taking too long or failing. Do you want to save the data WITHOUT the photo?");
          if (confirmWithoutImage) {
            const strippedSweater = { ...newSweater, image: "" };
            await Promise.race([saveToFirestore(strippedSweater), timeoutPromise(10000)]);
            alert("Saved successfully (without photo).");
          } else {
            throw firstError; // User wants the photo, so propagate the original error
          }
        } else {
          throw firstError;
        }
      }
      
      console.log("Save complete");
      setIsEditing(false);
      setCurrentSweater(null);
    } catch (error: any) {
      console.error("Final save error:", error);
      let errorMsg = "Failed to save.";
      if (error instanceof Error) {
        errorMsg += " " + error.message;
      } else if (typeof error === 'object') {
        errorMsg += " " + JSON.stringify(error);
      }
      alert(errorMsg);
      handleFirestoreError(error, OperationType.WRITE, `sweaters/${newSweater.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    console.log("Attempting to delete sweater document with ID:", id);
    if (!isAdmin) {
      alert("Only admins can delete designs. (শুধুমাত্র এডমিন ডিলিট করতে পারবেন)");
      return;
    }
    
    try {
      const docRef = doc(db, 'sweaters', id);
      console.log("Document reference created for deletion:", docRef.path);
      await deleteDoc(docRef);
      console.log("Successfully deleted document:", id);
      alert('Design deleted successfully. (ডিজাইনটি সফলভাবে মুছে ফেলা হয়েছে)');
    } catch (error: any) {
      console.error("Delete failed in App.tsx:", error);
      alert("Failed to delete from database: " + (error.message || "Unknown error"));
      try {
        handleFirestoreError(error, OperationType.DELETE, `sweaters/${id}`);
      } catch (e) {}
    }
  };

  const resizeImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 800;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = base64Str;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large. Please select an image under 10MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImage(reader.result as string);
        setCroppingMode('sweater');
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredSweaters = sweaters.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.costing.styleNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1994') {
      setIsAdmin(true);
      setShowLogin(false);
      setPassword('');
      alert('Admin Login Successful');
    } else {
      alert('Wrong password!');
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans selection:bg-indigo-100 p-3 sm:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-4 sm:gap-6">
        <AIAgent context={aiContext} />
      {/* Image Cropper Modal */}
      <AnimatePresence>
        {rawImage && (
          <ImageCropper 
            image={rawImage}
            onCancel={() => {
              setRawImage(null);
              setCroppingMode(null);
            }}
            onCropComplete={async (cropped) => {
              if (croppingMode === 'sweater') {
                setCurrentSweater(prev => prev ? ({ ...prev, image: cropped }) : null);
              } else if (croppingMode === 'profile' && currentUser) {
                try {
                  await updateDoc(doc(db, 'workers', currentUser.id), { image: cropped });
                  const updatedUser = { ...currentUser, image: cropped };
                  setCurrentUser(updatedUser);
                  localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                } catch (err) {
                  console.error("Failed to update profile photo:", err);
                  alert("Failed to save photo to database.");
                }
              }
              setRawImage(null);
              setCroppingMode(null);
            }}
            onSkip={async () => {
              if (rawImage) {
                const resized = await resizeImage(rawImage);
                if (croppingMode === 'sweater') {
                  setCurrentSweater(prev => prev ? ({ ...prev, image: resized }) : null);
                } else if (croppingMode === 'profile' && currentUser) {
                  try {
                    await updateDoc(doc(db, 'workers', currentUser.id), { image: resized });
                    const updatedUser = { ...currentUser, image: resized };
                    setCurrentUser(updatedUser);
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                  } catch (err) {
                    console.error("Failed to update profile photo:", err);
                  }
                }
              }
              setRawImage(null);
              setCroppingMode(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Registration Modal */}
      {showRegistration && !isAdmin && (
        <RegistrationModal 
          onComplete={(user) => {
            setCurrentUser(user);
            setShowRegistration(false);
          }} 
        />
      )}
      {/* Profile Edit Modal */}
      <AnimatePresence>
        {showProfileEdit && currentUser && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative"
            >
              <button onClick={() => setShowProfileEdit(false)} className="absolute right-6 top-6 p-2 hover:bg-slate-100 rounded-xl transition-all">
                <X size={20} className="text-slate-400" />
              </button>
              <h2 className="text-2xl font-black text-slate-800 mb-6">Edit Profile</h2>
              
              <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-[2rem] overflow-hidden bg-slate-100 ring-4 ring-indigo-50">
                    {currentUser.image ? (
                      <img src={currentUser.image} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={40} /></div>
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center cursor-pointer hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
                    <ImageIcon size={20} />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            alert("Photo must be less than 10MB");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setRawImage(reader.result as string);
                            setCroppingMode('profile');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="text-center">
                  <p className="font-black text-slate-800 text-lg">{currentUser.name}</p>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Worker Card: {currentUser.cardNumber}</p>
                </div>
                <button 
                  onClick={() => setShowProfileEdit(false)}
                  className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl transition-all active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showLogin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
            >
              <div className="flex flex-col items-center gap-4 mb-8">
                <div className="w-20 h-20 bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-100 border border-emerald-50 p-2 overflow-hidden group">
                  <svg viewBox="0 0 100 100" className="w-full h-full group-hover:scale-105 transition-all duration-700">
                    <rect width="100" height="100" rx="28" fill="#065F46" />
                    <circle cx="50" cy="50" r="35" fill="#059669" />
                    <circle cx="50" cy="50" r="18" fill="#EF4444" />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Admin Control</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized Personnel Only</p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter PIN"
                  autoFocus
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-2xl font-black tracking-[0.5em] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowLogin(false)}
                    className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
                  >
                    Login
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Panel */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 gap-4 sm:gap-6">
        <div className="flex items-center justify-between w-full lg:w-auto">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100 border border-emerald-50 p-1 overflow-hidden group">
              <svg viewBox="0 0 100 100" className="w-full h-full group-hover:scale-110 transition-all duration-700 ease-out">
                {/* Background Base */}
                <rect width="100" height="100" rx="24" fill="#065F46" />
                
                {/* Outter Circle (Green) */}
                <circle cx="50" cy="50" r="35" fill="#059669" />
                
                {/* Inner Circle (Red) */}
                <circle cx="50" cy="50" r="18" fill="#EF4444" />
                
                {/* Pulse Glow */}
                <circle cx="50" cy="50" r="45" stroke="white" strokeWidth="1" opacity="0.1" fill="none">
                  <animate attributeName="r" from="35" to="48" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.2" to="0" dur="3s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Sweater <span className="text-indigo-600">Note</span></h1>
              <p className="text-slate-500 text-[10px] sm:text-sm font-medium">Smart Manufacturing Management (স্মার্ট উৎপাদন ব্যবস্থাপনা)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            {!isAdmin ? (
              <button 
                onClick={() => setShowLogin(true)}
                className="p-2 bg-slate-50 text-slate-600 rounded-xl transition-all"
              >
                <Shield size={20} />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-md font-black uppercase">Admin Active</span>
                <button 
                  onClick={() => setIsAdmin(false)}
                  className="p-2 bg-red-50 text-red-600 rounded-xl transition-all"
                >
                  <LogOut size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-100 p-1.5 rounded-[2rem] shadow-inner">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-1.5 text-center">
            <button
              onClick={() => setView('sweaters')}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11px] sm:text-sm font-black transition-all",
                view === 'sweaters' ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
              )}
            >
              <LayoutGrid size={16} strokeWidth={2.5} />
              <span>Style (ডিজাইন)</span>
            </button>
            <button
              onClick={() => setView('workers')}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11px] sm:text-sm font-black transition-all",
                view === 'workers' ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
              )}
            >
              <Users size={16} strokeWidth={2.5} />
              <span>Leward Note</span>
            </button>
            <button
              onClick={() => setView('finishing')}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11px] sm:text-sm font-black transition-all",
                view === 'finishing' ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
              )}
            >
              <ClipboardCheck size={16} strokeWidth={2.5} />
              <span>Complete Note</span>
            </button>
            <button
              onClick={() => setView('chat')}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11px] sm:text-sm font-black transition-all",
                view === 'chat' ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
              )}
            >
              <MessageSquare size={16} strokeWidth={2.5} />
              <span>Chat (আলোচনা)</span>
            </button>
            <button
              onClick={() => setView('problem')}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11px] sm:text-sm font-black transition-all",
                view === 'problem' ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
              )}
            >
              <AlertCircle size={16} strokeWidth={2.5} />
              <span>Problem</span>
            </button>
            <button
              onClick={() => setView('qi')}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11px] sm:text-sm font-black transition-all",
                view === 'qi' ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
              )}
            >
              <ClipboardCheck size={16} strokeWidth={2.5} />
              <span>QI (কিউআই)</span>
            </button>
            <button
              onClick={() => setView('calculator')}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11px] sm:text-sm font-black transition-all",
                view === 'calculator' ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
              )}
            >
              <Calculator size={16} strokeWidth={2.5} />
              <span>Calc (হিসাব)</span>
            </button>
            <button
              onClick={() => setView('salary')}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11px] sm:text-sm font-black transition-all",
                view === 'salary' ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
              )}
            >
              <Wallet size={16} strokeWidth={2.5} />
              <span>Salary (বেতন)</span>
            </button>
            <button
              onClick={() => setView('manpower')}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11px] sm:text-sm font-black transition-all",
                view === 'manpower' ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
              )}
            >
              <FileText size={16} strokeWidth={2.5} />
              <span>Manpower (জনশক্তি)</span>
            </button>
            <button
              onClick={() => setView('production')}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11px] sm:text-sm font-black transition-all",
                view === 'production' ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
              )}
            >
              <Zap size={16} strokeWidth={2.5} />
              <span>Production (উৎপাদন)</span>
            </button>

            <button
              onClick={() => setView('notes')}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11px] sm:text-sm font-black transition-all",
                view === 'notes' ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
              )}
            >
              <Star size={16} strokeWidth={2.5} />
              <span>VIP Notes (নোট)</span>
            </button>

            <button
              onClick={() => setView('supervisor')}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11px] sm:text-sm font-black transition-all",
                view === 'supervisor' ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
              )}
            >
              <FileText size={16} strokeWidth={2.5} />
              <span>Supervisor (সুপারভাইজার)</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setView('ads')}
                className={cn(
                  "flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[11px] sm:text-sm font-black transition-all",
                  view === 'ads' ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
                )}
              >
                <Megaphone size={16} strokeWidth={2.5} />
                <span>Ads (বিজ্ঞাপন)</span>
              </button>
            )}

          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          {currentUser && !isAdmin && (
            <div className="flex items-center gap-3 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 mr-2">
              <button 
                onClick={() => setShowProfileEdit(true)}
                className="w-8 h-8 rounded-full overflow-hidden bg-white ring-2 ring-indigo-100 hover:ring-indigo-400 transition-all"
              >
                {currentUser.image ? (
                  <img src={currentUser.image} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={16} /></div>
                )}
              </button>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-indigo-900 leading-none">{currentUser.name}</span>
                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tight mt-1 truncate max-w-[100px]">
                  {currentUser.factoryName}
                </span>
                <span className="text-[8px] font-bold text-indigo-400 mt-0.5">Card: {currentUser.cardNumber}</span>
              </div>
              <button 
                onClick={() => {
                  if(window.confirm('Log out from this profile?')) {
                    setCurrentUser(null);
                  }
                }}
                className="p-1 text-indigo-300 hover:text-red-500 transition-colors"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 hidden lg:flex mr-2">
            {!isAdmin ? (
              <button 
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 hover:text-indigo-600 rounded-xl font-bold text-xs transition-all"
              >
                <Shield size={16} />
                <span>Admin</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-black uppercase tracking-wider shadow-lg shadow-red-100 animate-pulse">Admin Mode</span>
                <button 
                  onClick={() => setIsAdmin(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-xs transition-all border border-red-100"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search (খুঁজুন)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs"
            />
          </div>
          {view === 'sweaters' && (
            <button
              onClick={handleAddNew}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 text-xs"
            >
              <Plus size={16} /> New Design (নতুন ডিজাইন)
            </button>
          )}
        </div>
      </header>

      <main className="flex-1">
        <AdSection />
        {view === 'sweaters' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-1">
            <AnimatePresence mode="popLayout">
              {filteredSweaters.map(sweater => (
                <SweaterCard
                  key={sweater.id}
                  sweater={sweater}
                  isAdmin={isAdmin}
                  currentUser={currentUser}
                  onDelete={handleDelete}
                  onSelect={(s) => {
                    setCurrentSweater(s);
                    setIsEditing(true);
                  }}
                />
              ))}
            </AnimatePresence>

            {filteredSweaters.length === 0 && (
              <div className="col-span-full py-20 bg-white/50 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center text-indigo-500 mb-4">
                  <ImageIcon size={32} />
                </div>
                <p className="font-bold text-slate-700">No designs found</p>
                <p className="text-sm text-slate-400 mt-1">Use the button above to add a new design costing</p>
              </div>
            )}
          </div>
        )}

        {view === 'workers' && (
          <WorkerSection 
            workers={workers.filter(w => !w.department || w.department === 'leward')} 
            sweaters={sweaters} 
            workLogs={workLogs} 
            department="leward"
            isAdmin={isAdmin}
            currentUser={currentUser}
          />
        )}

        {view === 'finishing' && (
          <WorkerSection 
            workers={workers.filter(w => w.department === 'complete')} 
            sweaters={sweaters} 
            workLogs={workLogs} 
            department="complete"
            isAdmin={isAdmin}
            currentUser={currentUser}
          />
        )}

        {view === 'chat' && (
          <GlobalChat workers={workers} isAdmin={isAdmin} currentUser={currentUser} />
        )}

        {view === 'problem' && (
          <ProblemSection workers={workers} isAdmin={isAdmin} currentUser={currentUser} />
        )}

        {view === 'qi' && (
          <QISection workers={workers} isAdmin={isAdmin} currentUser={currentUser} />
        )}

        {view === 'calculator' && (
          <EarningsCalculator />
        )}

        {view === 'salary' && (
          <SalarySection 
            workers={workers} 
            workLogs={workLogs} 
            currentUser={currentUser} 
            isAdmin={isAdmin} 
          />
        )}

        {view === 'manpower' && (
          <ManpowerReport isAdmin={isAdmin} />
        )}

        {view === 'production' && (
          <ProductionReport isAdmin={isAdmin} />
        )}

        {view === 'notes' && (
          <ImportantNotesSection />
        )}

        {view === 'supervisor' && (
          <SupervisorReport isAdmin={isAdmin} />
        )}

        {view === 'ads' && isAdmin && (
          <AdManagement />
        )}


      </main>

      {/* Edit/Add Drawer */}
      <AnimatePresence>
        {isEditing && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-xl bg-white z-50 shadow-2xl flex flex-col"
            >
              <header className="px-5 sm:px-8 py-5 sm:py-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900">Design Details</h2>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium tracking-tight">Configure costing and specification</p>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="flex-grow overflow-y-auto px-5 sm:px-8 py-6 sm:py-8 space-y-8 sm:space-y-10">
                {/* Image Section */}
                <section>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "relative aspect-[4/3] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all group",
                      currentSweater?.image ? "border-indigo-100 bg-gray-50" : "border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50"
                    )}
                  >
                    {currentSweater?.image ? (
                      <>
                        <img src={currentSweater.image} className="w-full h-full object-cover" alt="Preview" />
                        <div className="absolute inset-0 bg-indigo-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Plus size={24} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                          <ImageIcon size={24} />
                        </div>
                        <span className="text-xs font-bold text-gray-700">Select Image</span>
                        <span className="text-[10px] text-gray-400 mt-1 text-center px-6">Click here to upload a photo</span>
                      </>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </div>
                </section>

                {/* Info Section */}
                <section className="space-y-6 sm:space-y-8">
                  <CostingForm
                    costing={currentSweater?.costing || initialCosting}
                    onChange={(newCosting) => setCurrentSweater(prev => ({ ...prev, costing: newCosting }))}
                  />
                </section>
              </div>

              <footer className="px-5 sm:px-8 py-5 sm:py-6 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    "w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] text-sm",
                    isSaving && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {isSaving ? "Saving..." : "Save to Collection"} 
                  {!isSaving && <ChevronRight size={18} />}
                </button>
              </footer>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
