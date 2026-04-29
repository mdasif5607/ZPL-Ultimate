
import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Loader2, Globe, Server, Database, User } from 'lucide-react';
import { auth, testFirestoreConnection } from '../services/firebase';

interface DiagnosticResult {
  title: string;
  status: 'loading' | 'success' | 'error';
  message: string;
  details?: string;
  icon: any;
}

export const SystemDiagnostics: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([
    { title: 'Current Domain', status: 'loading', message: 'Checking hostname...', icon: Globe },
    { title: 'Firebase Authentication', status: 'loading', message: 'Checking auth state...', icon: User },
    { title: 'Firestore Database', status: 'loading', message: 'Checking connection...', icon: Database },
    { title: 'Authorized Domains', status: 'loading', message: 'Verifying configuration...', icon: Shield },
  ]);

  const runDiagnostics = async () => {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost';
    const isRunApp = hostname.includes('.run.app');
    
    // 1. Domain Diagnostics
    const domainStatus = results[0];
    domainStatus.message = hostname;
    domainStatus.status = 'success';
    domainStatus.details = `This domain must be added to Firebase Console > Authentication > Settings > Authorized Domains.`;

    // 2. Auth Diagnostics
    const authStatus = results[1];
    const user = auth.currentUser;
    if (user) {
      authStatus.status = 'success';
      authStatus.message = `Signed in as ${user.email}`;
    } else {
      authStatus.status = 'error';
      authStatus.message = 'No user signed in';
    }

    // 3. Firestore Diagnostics
    const dbStatus = results[2];
    const test = await testFirestoreConnection();
    if (test.success) {
      dbStatus.status = 'success';
      dbStatus.message = test.message || 'Connected to Firestore';
    } else {
      dbStatus.status = 'error';
      dbStatus.message = 'Database unreachable';
      dbStatus.details = test.error;
    }

    // 4. Authorized Domains Check (Heuristic)
    const settingsStatus = results[3];
    if (isLocal || isRunApp) {
      settingsStatus.status = 'success';
      settingsStatus.message = 'Standard environment detected';
      settingsStatus.details = 'This domain is usually pre-authorized.';
    } else {
      settingsStatus.status = 'error';
      settingsStatus.message = 'External domain: ' + hostname;
      settingsStatus.details = `CRITICAL: You MUST add '${hostname}' to "Authorized Domains" in Firebase Console > Authentication > Settings. Without this, Google Login and Firestore may fail.`;
    }

    setResults([...results]);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/40">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-indigo-500" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">System Diagnostics & Setup</h2>
        </div>
        <button 
          onClick={runDiagnostics}
          className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors px-3 py-1 bg-zinc-800/50 rounded-lg"
        >
          Re-Run Tests
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((res, i) => (
          <div key={i} className={`flex gap-4 p-4 rounded-xl border transition-all duration-300 ${
            res.status === 'success' ? 'bg-emerald-500/5 border-emerald-500/20' : 
            res.status === 'error' ? 'bg-red-500/5 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 
            'bg-zinc-900/40 border-zinc-800'
          }`}>
            <div className={`p-2.5 rounded-lg shrink-0 ${
              res.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 
              res.status === 'error' ? 'bg-red-500/10 text-red-500' : 
              'bg-zinc-500/10 text-zinc-500'
            }`}>
              <res.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                res.status === 'success' ? 'text-emerald-500/70' : 
                res.status === 'error' ? 'text-red-500/70' : 
                'text-zinc-500'
              }`}>{res.title}</h3>
              <div className="flex items-center gap-2">
                {res.status === 'loading' && <Loader2 className="w-3 h-3 animate-spin text-zinc-600" />}
                <p className={`text-sm font-bold truncate ${
                  res.status === 'success' ? 'text-zinc-100' : 
                  res.status === 'error' ? 'text-red-400' : 
                  'text-zinc-500'
                }`}>
                  {res.message}
                </p>
              </div>
              {res.details && (
                <p className={`text-[10px] mt-2 leading-relaxed ${
                  res.status === 'error' ? 'text-red-400/80 font-medium' : 'text-zinc-500'
                }`}>
                  {res.details}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 py-4 bg-zinc-900/40 border-t border-zinc-800">
        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Live Support Checklist</h4>
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2 text-[10px] text-zinc-500">
            <CheckCircle className="w-3 h-3 text-emerald-500/50" />
            <span>Go to <b>Auth Settings</b> and whitelist <b>zplpro.vercel.app</b></span>
          </li>
          <li className="flex items-center gap-2 text-[10px] text-zinc-500">
            <CheckCircle className="w-3 h-3 text-emerald-500/50" />
            <span>Enable <b>Email/Password</b> & <b>Google Sign-In</b> in your project console.</span>
          </li>
          <li className="flex items-center gap-2 text-[10px] text-zinc-500">
            <CheckCircle className="w-3 h-3 text-emerald-500/50" />
            <span>Disable ad-blockers for this domain.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
