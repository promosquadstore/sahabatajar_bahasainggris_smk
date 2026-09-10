import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BrainCircuit, FileText, CheckCircle2 } from 'lucide-react';

const loadingMessages = [
  { text: "Menganalisis Prota & Prosem...", icon: BrainCircuit },
  { text: "Menyelaraskan Capaian Pembelajaran...", icon: FileText },
  { text: "Menyusun skenario interaktif...", icon: Sparkles },
  { text: "Sedikit lagi selesai...", icon: CheckCircle2 }
];

export function LoadingOverlay({ isVisible, title = "Menyusun Perangkat" }: { isVisible: boolean, title?: string }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1 < loadingMessages.length ? prev + 1 : prev));
    }, 3000);

    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white p-8 rounded-3xl shadow-2xl border border-brand-primary/10 max-w-sm w-full flex flex-col items-center text-center"
          >
            <div className="relative w-20 h-20 mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                className="absolute inset-0 rounded-full border-[3px] border-dashed border-brand-primary/30"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                className="absolute inset-2 rounded-full border-[3px] border-dashed border-brand-accent/50"
              />
              <div className="absolute inset-0 flex items-center justify-center text-brand-primary">
                <Sparkles size={32} />
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
            
            <div className="h-8 relative w-full overflow-hidden">
              <AnimatePresence mode="popLayout">
                {(() => {
                  const CurrentIcon = loadingMessages[messageIndex].icon;
                  return (
                    <motion.div
                      key={messageIndex}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-slate-500 font-medium"
                    >
                      {CurrentIcon && 
                        <CurrentIcon size={16} className="text-brand-accent" />
                      }
                      {loadingMessages[messageIndex].text}
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
            
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-6 overflow-hidden">
              <motion.div 
                className="bg-brand-primary h-full rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${((messageIndex + 1) / loadingMessages.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
