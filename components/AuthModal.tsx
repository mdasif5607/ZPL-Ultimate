import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { loginWithGoogle, auth } from '../services/firebase';
import { Lock, LogIn, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, message }) => {
  const user = auth.currentUser;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-zinc-900 border border-white/[0.1] rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors z-20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-[60px] pointer-events-none" />
            
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-blue-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Access Restricted</h2>
              <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                {message || "Authentication is required to unlock full batch processing capabilities and extended quotas."}
              </p>
              
              {!user ? (
                <button 
                  onClick={async () => {
                    try {
                      await loginWithGoogle();
                      onClose();
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  <LogIn className="w-5 h-5" />
                  Sign in with Google
                </button>
              ) : (
                <button 
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-3 bg-zinc-800 text-white font-bold py-4 rounded-xl hover:bg-zinc-700 transition-colors"
                >
                  Acknowledge
                </button>
              )}
              
              <p className="mt-6 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                Daily Public Quota: 1 File Conversion
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
