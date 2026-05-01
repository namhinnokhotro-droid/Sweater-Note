import React, { useState, useEffect } from 'react';
import { ExternalLink, X, Megaphone, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { OperationType } from '../types';

interface Ad {
  id: string;
  title: string;
  description: string;
  image?: string;
  link: string;
  color: string;
  createdAt: number;
}

const FALLBACK_ADS: Ad[] = [
  {
    id: 'fallback-1',
    title: 'Leward Professional Services',
    description: 'Expert consultation for garment manufacturing efficiency. Reach your targets faster.',
    link: '#',
    color: 'from-indigo-600 to-blue-600',
    createdAt: Date.now()
  }
];

export const AdSection: React.FC = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentAdIdx, setCurrentAdIdx] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'ads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ad));
      setAds(adsData.length > 0 ? adsData : FALLBACK_ADS);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'ads');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAdIdx(prev => (prev + 1) % ads.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [ads.length]);

  if (!isVisible || (loading && ads.length === 0)) return null;

  const currentAd = ads[currentAdIdx];
  if (!currentAd) return null;

  return (
    <div className="no-print mb-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAd.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`relative overflow-hidden rounded-[2rem] p-6 text-white shadow-xl bg-gradient-to-br ${currentAd.color}`}
        >
          {/* Background Decorative Elements */}
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Megaphone size={120} />
          </div>
          
          <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={14} />
          </button>

          <div className="relative z-10 flex gap-6 items-center">
            {currentAd.image && (
              <div className="hidden sm:block w-32 h-32 rounded-2xl overflow-hidden shadow-lg border-2 border-white/20 shrink-0">
                <img 
                  src={currentAd.image} 
                  alt={currentAd.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Sparkles size={16} className="text-yellow-300" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Sponsored Content</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black leading-tight">{currentAd.title}</h3>
                <p className="text-xs font-bold text-white/80 leading-relaxed max-w-md">
                  {currentAd.description}
                </p>
              </div>

              <a 
                href={currentAd.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-black self-start hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                <span>Learn More</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Progress Indicator */}
          {ads.length > 1 && (
            <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full overflow-hidden">
              <motion.div 
                key={currentAdIdx}
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                transition={{ duration: 8, ease: "linear" }}
                className="h-full bg-white/60 w-full"
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
