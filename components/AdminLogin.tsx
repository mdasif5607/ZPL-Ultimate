
import React, { useState } from 'react';
import { Shield, Lock, ArrowRight, Loader2, Mail, Key } from 'lucide-react';
import { loginWithGoogle, loginWithEmail, signUpWithEmail } from '../services/firebase';

interface AdminLoginProps {
  onSuccess?: () => void;
  error?: string | null;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ error: externalError }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<'google' | 'email'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      let msg = err.message || 'Login failed';
      
      // If the password matches the requested one, try to create the account if it doesn't exist
      if (password === 'asif.ofc' && (msg.includes('auth/invalid-credential') || msg.includes('auth/user-not-found'))) {
        try {
          await signUpWithEmail(email, password);
          return; // Success!
        } catch (signUpErr: any) {
          msg = signUpErr.message;
        }
      }

      if (msg.includes('auth/invalid-credential')) {
        msg = "Invalid email or password. Ensure 'Email/Password' provider is ENABLED in Firebase Console > Authentication.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -top-48 -left-48 w-96 h-96 bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 mb-6 shadow-xl">
            <Lock className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-2">Admin Portal</h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest opacity-60">System Clearance Required</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
          <div className="flex border-b border-zinc-800">
            <button 
              onClick={() => setMethod('google')}
              className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${method === 'google' ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Google
            </button>
            <button 
              onClick={() => setMethod('email')}
              className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${method === 'email' ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Email/Password
            </button>
          </div>

          <div className="p-8">
            {(error || externalError) && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-tight flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span className="leading-relaxed">{error || externalError}</span>
              </div>
            )}

            {method === 'google' ? (
              <div className="space-y-4">
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 ml-1">Authentication Method</p>
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full h-14 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Continue with Google</span>
                      <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 block ml-1">Admin Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="admin@example.com"
                      className="w-full h-14 bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 block ml-1">Secret Key</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full h-14 bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <p className="text-[9px] text-zinc-600 mt-2 ml-1 font-bold italic uppercase">Note: Ensure "Email/Password" is enabled in Firebase Console.</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group shadow-[0_0_20px_rgba(37,99,235,0.2)] mt-6"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Unlock Terminal</span>
                      <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}

            <p className="text-center text-[10px] text-zinc-600 font-medium uppercase tracking-tighter mt-6">
              Only authorized <span className="text-zinc-500 font-bold tracking-widest">JM INTERNATIONAL</span> accounts can access this panel.
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all cursor-default">
            <Shield className="w-3 h-3 text-blue-500" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Protocol V4.2</span>
          </div>
          <div className="w-px h-3 bg-zinc-800" />
          <a href="/" className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">
            Return to Studio
          </a>
        </div>
      </div>
    </div>
  );
};
