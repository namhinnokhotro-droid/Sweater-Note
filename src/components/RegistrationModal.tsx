import React, { useState, useRef } from 'react';
import { User, Phone, CreditCard, Hash, Camera, Shield, CheckCircle2, Loader2, Factory, LogIn, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { Worker } from '../types';
import { db } from '../lib/firebase';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { cn } from '../lib/utils';

interface Props {
  onComplete: (user: Worker) => void;
}

export function RegistrationModal({ onComplete }: Props) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [step, setStep] = useState<'info' | 'verify'>('info');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    factoryName: '',
    cardNumber: '',
    lineNumber: '',
    image: ''
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      alert("Photo is too large. Please use a smaller photo (max 500KB).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup') {
      if (!formData.name || !formData.phone || !formData.cardNumber || !formData.factoryName || !formData.image) {
        setError('Please fill all fields including Photo (সবগুলো তথ্য ও ছবি দিন)');
        return;
      }
    } else {
      if (!formData.phone || !formData.cardNumber) {
        setError('Phone & Card Number required for login');
        return;
      }
    }
    setStep('verify');
    setError('');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode !== '1234') { // Mock verification code
      setError('Invalid verification code. Use 1234 (ভুল কোড, ১২৩৪ ব্যবহার করুন)');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      if (mode === 'login') {
        const q = query(
          collection(db, 'workers'),
          where('phone', '==', formData.phone),
          where('cardNumber', '==', formData.cardNumber)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          setError('User not found. Please Sign Up instead.');
          setIsVerifying(false);
          return;
        }
        const existingUser = snapshot.docs[0].data() as Worker;
        onComplete(existingUser);
      } else {
        const userId = uuidv4();
        const newUser: Worker = {
          id: userId,
          name: formData.name,
          phone: formData.phone,
          factoryName: formData.factoryName,
          cardNumber: formData.cardNumber,
          lineNumber: formData.lineNumber,
          image: formData.image,
          joinedAt: Date.now(),
          isVerified: true
        };
        await setDoc(doc(db, 'workers', userId), newUser);
        onComplete(newUser);
      }
    } catch (err) {
      console.error("Auth failed:", err);
      setError('Operation failed. Please check connection.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                {mode === 'signup' ? 'Create Profile' : 'Welcome Back'}
              </h2>
              <p className="text-slate-500 font-medium">
                {mode === 'signup' ? 'নতুন প্রোফাইল তৈরি করুন' : 'লগইন করে পুনরায় শুরু করুন'}
              </p>
            </div>
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors",
              mode === 'signup' ? "bg-indigo-600 text-white" : "bg-emerald-600 text-white"
            )}>
              {mode === 'signup' ? <UserPlus size={24} /> : <LogIn size={24} />}
            </div>
          </div>

          {/* Mode Switcher */}
          {step === 'info' && (
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
              <button 
                onClick={() => setMode('signup')}
                className={cn(
                  "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  mode === 'signup' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Sign Up
              </button>
              <button 
                onClick={() => setMode('login')}
                className={cn(
                  "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  mode === 'login' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Log In
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 'info' ? (
              <motion.form 
                key="info"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleInfoSubmit}
                className="space-y-5"
              >
                {mode === 'signup' && (
                  <div className="flex justify-center mb-2">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-24 h-24 bg-slate-100 rounded-[1.5rem] border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden group"
                    >
                      {formData.image ? (
                        <img src={formData.image} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera size={20} className="text-slate-400 mb-1 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-bold text-slate-400 text-center px-2">Profile Photo<br/>(প্রয়োজনীয়)</span>
                        </>
                      )}
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {mode === 'signup' && (
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text"
                        placeholder="Full Name (নাম)"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text"
                        placeholder="Card ID"
                        value={formData.cardNumber}
                        onChange={e => setFormData({...formData, cardNumber: e.target.value})}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold"
                      />
                    </div>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text"
                        placeholder="Line No"
                        value={formData.lineNumber}
                        onChange={e => setFormData({...formData, lineNumber: e.target.value})}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="tel"
                      placeholder="Phone Number"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold"
                    />
                  </div>

                  {mode === 'signup' && (
                    <div className="relative">
                      <Factory className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text"
                        placeholder="Factory Name (ফ্যাক্টরির নাম)"
                        value={formData.factoryName}
                        onChange={e => setFormData({...formData, factoryName: e.target.value})}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold"
                      />
                    </div>
                  )}
                </div>

                {error && <p className="text-red-500 text-xs font-bold text-center px-4">{error}</p>}

                <button 
                  type="submit"
                  className={cn(
                    "w-full text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98]",
                    mode === 'signup' ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                  )}
                >
                  {mode === 'signup' ? 'Create Account' : 'Verify Identity'}
                </button>
              </motion.form>
            ) : (
              <motion.form 
                key="verify"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={handleVerify}
                className="space-y-6 text-center"
              >
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield size={40} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Verify Identity</h3>
                  <p className="text-slate-500 text-sm font-medium mt-1">
                    Demo Code: <b>1234</b>
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  <input 
                    type="text"
                    maxLength={4}
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value)}
                    className="w-32 text-center text-3xl font-black tracking-[0.5em] py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all"
                    placeholder="0000"
                  />
                </div>

                {error && <p className="text-red-500 text-xs font-bold">{error}</p>}

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setStep('info')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    disabled={isVerifying}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                  >
                    {isVerifying ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                    {mode === 'signup' ? 'Register' : 'Open App'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
