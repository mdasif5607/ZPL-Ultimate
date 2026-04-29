import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { loginWithGoogle, auth, loginWithEmail, signUpWithEmail } from '../services/firebase';
import { Lock, LogIn, X, Mail, Key } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, message }) => {
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      onClose();
    } catch (e: any) {
      setError(e.message || "An error occurred. Please check your credentials.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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
            
            <div className="flex flex-col items-center relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-blue-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight text-center">Access Restricted</h2>
              <p className="text-zinc-400 text-sm mb-6 leading-relaxed text-center">
                {message || "Authentication is required to unlock full batch processing capabilities."}
              </p>

              {error && (
                <div className="w-full mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-500 font-bold uppercase tracking-widest leading-relaxed">
                  {error}
                </div>
              )}
              
              {!user ? (
                <div className="w-full space-y-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input 
                        type="email"
                        placeholder="Email Address"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-800 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                      />
                    </div>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input 
                        type="password"
                        placeholder="Password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-zinc-800 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-wait uppercase tracking-widest text-xs"
                    >
                      {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                    </button>
                  </form>

                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/5"></div>
                    </div>
                    <span className="relative z-10 px-4 bg-zinc-900 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">OR</span>
                  </div>

                  <button 
                    onClick={async () => {
                      setError(null);
                      try {
                        await loginWithGoogle();
                        onClose();
                      } catch (e: any) {
                        if (e.code === 'auth/popup-closed-by-user') {
                          setError("Login popup was closed before completion.");
                        } else if (e.code === 'auth/unauthorized-domain') {
                          setError(
                            "DOMAIN UNAUTHORIZED: \n" +
                            "Please add these domains to Authorized Domains in Firebase Console (Authentication > Settings):\n" +
                            "1. " + window.location.hostname + "\n" +
                            "2. zplpro.vercel.app\n" +
                            "3. ais-dev-vpbt3harx5gun6jcjphjny-767779968473.asia-southeast1.run.app\n" +
                            "4. ais-pre-vpbt3harx5gun6jcjphjny-767779968473.asia-southeast1.run.app\n" +
                            "Wait 2 minutes after adding."
                          );
                        } else if (e.code === 'auth/operation-not-allowed') {
                          setError("AUTH DISABLED: Enable 'Google' AND 'Email/Password' in Firebase Console > Authentication > Sign-in method.");
                        } else if (e.code === 'auth/network-request-failed') {
                          setError("NETWORK ERROR: Please check your connection. If using a custom domain, ensure 'authDomain' in config matches your Firebase project.");
                        } else if (e.message?.includes('requested action is invalid')) {
                          setError("INVALID ACTION: This usually means Google Login is NOT enabled in Firebase Console > Authentication > Sign-in method.");
                        } else {
                          setError(e.message || "An error occurred during login.");
                        }
                      }
                    }}
                    className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors uppercase tracking-widest text-xs"
                  >
                    <LogIn className="w-4 h-4" />
                    Continue with Google
                  </button>

                  <p className="text-center text-xs text-zinc-500">
                    {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                    <button 
                      onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                      className="text-blue-500 font-bold hover:underline"
                    >
                      {mode === 'login' ? 'Sign Up' : 'Log In'}
                    </button>
                  </p>
                </div>
              ) : (
                <button 
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-3 bg-zinc-800 text-white font-bold py-4 rounded-xl hover:bg-zinc-700 transition-colors uppercase tracking-widest text-xs"
                >
                  Acknowledge
                </button>
              )}
              
              <p className="mt-8 text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-black">
                Daily Public Quota: 1 File Conversion
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
