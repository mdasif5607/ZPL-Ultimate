
import React from 'react';
import { AdminDashboard } from './AdminDashboard';
import { Shield, ArrowLeft, LogOut, ShieldAlert, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { logout } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { SystemDiagnostics } from './SystemDiagnostics';
import { AdminLogin } from './AdminLogin';

export const AdminPanel: React.FC = () => {
  const { user, isAdmin, loading, error: authError } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-blue-500 font-mono text-sm animate-pulse">AUTHORIZING SECURE ACCESS...</div>
      </div>
    );
  }

  // If no user is logged in, show the dedicated Admin Login page
  if (!user) {
    return <AdminLogin error={authError} />;
  }

  // If logged in but not an admin, show Access Denied
  if (!isAdmin) {
    return (
      <div className="h-screen w-full bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative z-10">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-red-500/10">
            <UserX className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-widest">Access Restricted</h1>
          <p className="text-zinc-500 max-w-md mx-auto mb-10 leading-relaxed font-medium uppercase text-[10px] tracking-widest">
            Identity <span className="text-zinc-400">[{user.email}]</span> does not possess required administrative clearance for this terminal.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={logout}
              className="w-full sm:w-auto px-8 py-4 bg-white text-black text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-200 transition-all shadow-xl"
            >
              Change Account
            </button>
            <Link to="/" className="w-full sm:w-auto px-8 py-4 bg-zinc-900 text-zinc-400 text-xs font-black uppercase tracking-widest rounded-2xl border border-zinc-800 hover:text-white hover:bg-zinc-800 transition-all">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-zinc-300 font-sans p-8 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-xl shadow-blue-500/5">
              <Shield className="w-7 h-7 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight uppercase">Central Intelligence</h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">Admin Panel // Node {user?.uid.slice(0, 8)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-white/5 hover:bg-zinc-800 transition-all text-xs font-bold uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4" /> Terminal
            </Link>
            <button 
              onClick={logout}
              className="p-2 text-zinc-500 hover:text-white hover:bg-red-500/10 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="space-y-12">
          <section className="bg-zinc-900/40 border border-white/[0.03] rounded-3xl p-8 backdrop-blur-sm">
            <AdminDashboard />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900/40 border border-white/[0.03] rounded-3xl p-8">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">System Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Database Engine</span>
                  <span className="text-emerald-500 font-mono">Firestore v2 Online</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Authentication</span>
                  <span className="text-emerald-500 font-mono">Verified (Google)</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Encryption</span>
                  <span className="text-emerald-500 font-mono">AES-256 Enabled</span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-white/[0.03] rounded-3xl p-8">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Usage Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Total Requests</span>
                  <span className="text-blue-500 font-mono">Calculated on Sync</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Active Grants</span>
                  <span className="text-blue-500 font-mono">Reviewing...</span>
                </div>
              </div>
            </div>
          </section>
        </main>

        <div className="mt-12">
           <SystemDiagnostics />
        </div>
      </div>
      
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-red-600/5 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
};
