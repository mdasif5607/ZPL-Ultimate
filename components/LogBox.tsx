
import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { cn } from '../lib/utils';
import { ChevronRight, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface LogBoxProps {
  logs: LogEntry[];
}

export const LogBox: React.FC<LogBoxProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'error': return <XCircle className="w-3.5 h-3.5 text-rose-500" />;
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
      default: return <ChevronRight className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  return (
    <div className="bg-[#0c0c0c] border border-white/[0.08] rounded-2xl flex flex-col h-[300px] overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Terminal Output</span>
        </div>
        <div className="text-[10px] font-mono text-zinc-600">STDOUT • UTC-TIME</div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs bg-[rgba(0,0,0,0.2)]"
      >
        {logs.map((log) => (
          <div key={log.id} className="group flex items-start gap-3 py-0.5 hover:bg-white/[0.02] transition-colors rounded px-2">
            <span className="text-zinc-700 shrink-0 select-none">[{log.timestamp}]</span>
            <div className="flex items-center gap-2 flex-1">
              {getIcon(log.type)}
              <span className={cn(
                "break-all",
                log.type === 'error' ? "text-rose-400" : 
                log.type === 'success' ? "text-emerald-400" : 
                log.type === 'warning' ? "text-amber-400" : "text-zinc-300"
              )}>
                {log.message}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
