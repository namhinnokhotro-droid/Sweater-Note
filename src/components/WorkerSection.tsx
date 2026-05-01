import React, { useState, useRef, useCallback } from 'react';
import { Plus, User, Phone, Trash2, X, Camera, Upload, ChevronRight, ArrowLeft, ClipboardList, History, Check, Scissors, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../lib/utils';
import { Worker, Sweater, WorkLog, OperationType } from '../types';
import { db, handleFirestoreError } from '../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { WorkerPortal } from './WorkerPortal';
import Cropper from 'react-easy-crop';

interface Props {
  workers: Worker[];
  sweaters: Sweater[];
  workLogs: WorkLog[];
  department?: 'leward' | 'complete';
  isAdmin: boolean;
  currentUser: Worker | null;
}

export function WorkerSection({ workers, sweaters, workLogs, department = 'leward', isAdmin, currentUser }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newWorker, setNewWorker] = useState<Partial<Worker>>({ 
    name: '', 
    phone: '', 
    cardNumber: '', 
    lineNumber: '',
    image: ''
  });
  
  // Cropper State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  const getCroppedImg = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    const image = new Image();
    image.src = imageToCrop;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, x, y } = croppedAreaPixels;
    
    // Output size (thumb)
    const TARGET_SIZE = 400;
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;

    ctx.drawImage(
      image,
      x,
      y,
      width,
      height,
      0,
      0,
      TARGET_SIZE,
      TARGET_SIZE
    );

    const croppedImage = canvas.toDataURL('image/jpeg', 0.8);
    setNewWorker(prev => ({ ...prev, image: croppedImage }));
    setIsCropping(false);
    setImageToCrop(null);
  };

  const handleAddWorker = async () => {
    if (!newWorker.name) return;
    const id = uuidv4();
    try {
        await setDoc(doc(db, 'workers', id), {
          id,
          name: newWorker.name,
          phone: newWorker.phone || '',
          cardNumber: newWorker.cardNumber || '',
          lineNumber: newWorker.lineNumber || '',
          image: newWorker.image || '',
          joinedAt: Date.now(),
          department,
        });
      setIsAdding(false);
      setNewWorker({ name: '', phone: '', cardNumber: '', lineNumber: '', image: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `workers/${id}`);
    }
  };

  const selectedWorker = workers.find(w => w.id === selectedWorkerId);

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      alert("Only admins can delete worker profiles. (শুধুমাত্র এডমিন ডিলিট করতে পারবেন)");
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'workers', id));
      alert('Worker profile deleted (কর্মী তথ্য মুছে ফেলা হয়েছে)');
    } catch (error: any) {
      console.error("Delete worker failed:", error);
      alert("Deletion failed: " + (error.message || "Error"));
      try { handleFirestoreError(error, OperationType.DELETE, `workers/${id}`); } catch (e) {}
    }
  };

  if (selectedWorker) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedWorkerId(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold text-sm"
        >
          <ArrowLeft size={18} />
          <span>Back to List (তালিকায় ফিরুন)</span>
        </button>
        <WorkerPortal 
          worker={selectedWorker} 
          sweaters={sweaters} 
          workLogs={workLogs.filter(l => l.workerId === selectedWorker.id)} 
          department={department}
          isAdmin={isAdmin}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {department === 'leward' ? 'Leward Worker Profiles' : 'Complete Worker Profiles'}
          </h2>
          <p className="text-xs font-medium text-slate-400">Manage {department} staff & record work</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold text-sm"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Add Worker</span>
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 bg-white rounded-2xl border border-indigo-100 shadow-xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Add New Worker</h3>
              <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center gap-3">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex items-center justify-center overflow-hidden cursor-pointer group hover:border-indigo-300 transition-colors relative"
                >
                  {newWorker.image ? (
                    <img src={newWorker.image} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center">
                      <Camera size={32} />
                      <span className="text-[10px] font-bold mt-1">Upload Photo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload size={20} className="text-indigo-600" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  {newWorker.image ? 'Change Photo' : 'Choose Photo'}
                </button>
              </div>

              {/* Info Section */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</label>
                  <input
                    type="text"
                    value={newWorker.name}
                    onChange={e => setNewWorker(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                    placeholder="Enter worker name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Line Number</label>
                  <input
                    type="text"
                    value={newWorker.lineNumber}
                    onChange={e => setNewWorker(prev => ({ ...prev, lineNumber: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                    placeholder="Line #"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Card Number</label>
                  <input
                    type="text"
                    value={newWorker.cardNumber}
                    onChange={e => setNewWorker(prev => ({ ...prev, cardNumber: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                    placeholder="Card #"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone (Mobile)</label>
                  <input
                    type="text"
                    value={newWorker.phone}
                    onChange={e => setNewWorker(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                    placeholder="Mobile number"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleAddWorker}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 mt-2"
            >
              Save Worker Profile
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map(worker => (
          <div 
            key={worker.id} 
            onClick={() => {
              if (isAdmin || (currentUser && currentUser.id === worker.id)) {
                setSelectedWorkerId(worker.id);
              } else {
                alert("This is a private profile. You can only enter your own profile. (এটি একটি ব্যক্তিগত প্রোফাইল। আপনি শুধুমাত্র আপনার নিজের প্রোফাইলে প্রবেশ করতে পারবেন।)");
              }
            }}
            className={cn(
              "p-4 bg-white rounded-2xl border shadow-sm flex items-center justify-between group cursor-pointer transition-all active:scale-[0.98]",
              (isAdmin || (currentUser && currentUser.id === worker.id)) 
                ? "border-gray-100 hover:border-indigo-200 hover:shadow-md" 
                : "border-slate-100 opacity-80"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden ring-1",
                (isAdmin || (currentUser && currentUser.id === worker.id))
                  ? "bg-indigo-50 text-indigo-600 ring-indigo-100"
                  : "bg-slate-50 text-slate-400 ring-slate-100"
              )}>
                {worker.image ? (
                  <img src={worker.image} alt={worker.name} className={cn(
                    "w-full h-full object-cover",
                    !(isAdmin || (currentUser && currentUser.id === worker.id)) && "grayscale blur-[2px]"
                  )} />
                ) : (
                  <User size={24} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-gray-900 leading-tight">{worker.name}</h4>
                  {worker.lineNumber && (
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase">
                      Line: {worker.lineNumber}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 mt-1">
                  {worker.cardNumber && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                      <span className="text-indigo-400">Card:</span> {worker.cardNumber}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 transition-colors">
                {isAdmin || (currentUser && currentUser.id === worker.id) ? (
                  <ChevronRight size={20} className="text-indigo-400 group-hover:text-indigo-600" />
                ) : (
                  <Lock size={18} className="text-slate-300" />
                )}
              </div>
              {isAdmin && (
                <div className="relative flex items-center justify-end">
                  <AnimatePresence mode="wait">
                    {confirmDeleteId === worker.id ? (
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0, scale: 0.8, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: 20 }}
                        className="absolute right-0 top-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-2 flex items-center gap-2 border border-red-100 z-10 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(worker.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg"
                        >
                          Confirm
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="trash"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setConfirmDeleteId(worker.id);
                        }}
                        className="p-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all shadow-sm flex items-center justify-center border border-red-100"
                        title="Delete Worker"
                      >
                        <Trash2 size={20} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {workers.length === 0 && !isAdding && (
        <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <User className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 font-medium whitespace-pre-wrap">No workers found.
Please add worker profiles to start keeping records.</p>
        </div>
      )}

      {/* Image Cropper Modal */}
      <AnimatePresence>
        {isCropping && imageToCrop && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            <div className="relative flex-1">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="bg-white p-6 sm:p-8 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Adjust Photo</h3>
                  <p className="text-sm text-gray-500">Zoom and drag to fit your profile photo</p>
                </div>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Scissors size={20} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <span>Zoom</span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsCropping(false)}
                  className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={getCroppedImg}
                  className="flex-3 py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"
                >
                  <Check size={20} />
                  <span>Save Photo</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
