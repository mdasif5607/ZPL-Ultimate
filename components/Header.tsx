
import React from 'react';
import { Package, ShieldCheck, Zap } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between py-6 border-b border-white/[0.08] mb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
          <Package className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight leading-none mb-1">
            ZPL Ultimate <span className="text-blue-500">Studio</span>
          </h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-medium">
            Professional Batch Processor • JM International
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-medium text-zinc-400">Secure Protocol</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-medium text-zinc-400">Labelary v1.0 Engine</span>
        </div>
      </div>
    </header>
  );
};
