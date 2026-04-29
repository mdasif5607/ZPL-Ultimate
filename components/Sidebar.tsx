
import React from 'react';
import { Settings, History, Monitor, Info, Printer, Cpu, Maximize, Clock, Database, Usb } from 'lucide-react';
import { cn } from '../lib/utils';
import { HistoryItem } from '../types';

interface SidebarProps {
  printer: string;
  setPrinter: (p: string) => void;
  dpi: string;
  setDpi: (d: string) => void;
  labelSize: string;
  setLabelSize: (s: string) => void;
  speed: number;
  history: HistoryItem[];
  usbDevice: USBDevice | null;
  onConnectUsb: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  printer, setPrinter, dpi, setDpi, labelSize, setLabelSize, speed, history, usbDevice, onConnectUsb
}) => {
  return (
    <aside className="w-80 h-full border-r border-white/[0.08] bg-[#0c0c0c] flex flex-col shrink-0">
      <div className="p-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-4 h-4 text-zinc-500" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">System Configuration</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              <Printer className="w-3.5 h-3.5" /> Output Channel
            </label>
            <div className="space-y-3">
              <select 
                value={printer}
                onChange={(e) => setPrinter(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option>Zebra ZD421 (Default)</option>
                <option>Zebra ZT411 (Industrial)</option>
                <option>System Default Print Dialog</option>
              </select>

              <button
                onClick={onConnectUsb}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  usbDevice 
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-white/5"
                )}
              >
                <Usb className="w-3.5 h-3.5" />
                {usbDevice ? `USB CONNECTED: ${usbDevice.productName?.split(' ')[0]}` : "Connect Zebra (USB)"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                <Cpu className="w-3.5 h-3.5" /> Engine DPI
              </label>
              <select 
                value={dpi}
                onChange={(e) => setDpi(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="6dpmm">152 DPI</option>
                <option value="8dpmm">203 DPI</option>
                <option value="12dpmm">300 DPI</option>
                <option value="24dpmm">600 DPI</option>
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                  <Maximize className="w-3.5 h-3.5" /> Dimensions
                </label>
                <button 
                  onClick={() => setLabelSize(labelSize.toLowerCase() === 'auto' ? '4x6' : 'Auto')}
                  className={cn(
                    "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded transition-colors",
                    labelSize.toLowerCase() === 'auto' 
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
                      : "bg-zinc-800 text-zinc-500 border border-transparent hover:text-zinc-300"
                  )}
                >
                  {labelSize.toLowerCase() === 'auto' ? "Auto Active" : "Manual"}
                </button>
              </div>
              <input 
                value={labelSize}
                onChange={(e) => setLabelSize(e.target.value)}
                disabled={labelSize.toLowerCase() === 'auto'}
                placeholder="4x6 or 100x50mm"
                className={cn(
                  "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-opacity",
                  labelSize.toLowerCase() === 'auto' ? "opacity-50 cursor-not-allowed" : "opacity-100"
                )}
              />
              {labelSize.toLowerCase() === 'auto' && (
                <p className="text-[9px] text-zinc-600 font-medium uppercase tracking-tight">
                  Scanning coordinate bounds...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-500" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Process History</span>
          </div>
          <span className="text-[10px] font-mono text-blue-500">{history.length} ITEMS</span>
        </div>

        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center opacity-30 border border-dashed border-zinc-800 rounded-2xl">
              <Database className="w-8 h-8 mb-3 text-zinc-600" />
              <p className="text-xs text-zinc-600 uppercase tracking-wider font-semibold">Database Empty</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all group cursor-default">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold text-zinc-300 truncate w-32 leading-none">{item.fileName}</p>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border",
                    item.status === 'completed' ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : "text-rose-500 bg-rose-500/10 border-rose-500/20"
                  )}>
                    {item.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-tight text-zinc-600">
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <Maximize className="w-2.5 h-2.5" /> {item.size}{!item.size.endsWith('mm') && " IN"}
                  </div>
                  <div className="flex items-center gap-1.5">
                     <Clock className="w-2.5 h-2.5" /> {item.timestamp}
                  </div>
                </div>
                <div className="mt-2 text-[9px] font-mono text-zinc-700 flex items-center gap-1">
                   <div className="w-1 h-1 rounded-full bg-zinc-800" />
                   {item.labelCount} LABELS PROCESSED • {item.dpi.toUpperCase()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-6 border-t border-white/[0.08] bg-zinc-900/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 transition-opacity">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">System Ready</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-500">v2.6.4-BETA</div>
        </div>
        
        {speed > 0 && (
          <div className="p-3 rounded-lg bg-blue-600/10 border border-blue-500/20 mb-4 transition-all duration-300">
            <div className="flex items-center justify-between text-[10px] font-bold mb-1">
              <span className="text-blue-400 uppercase tracking-widest">Process Speed</span>
              <span className="text-white font-mono">{speed} LPS</span>
            </div>
            <div className="text-[9px] text-blue-500/60 uppercase font-bold tracking-tight">Labels Per Second</div>
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
          <Monitor className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Connected via Local Bus</span>
        </div>
      </div>
    </aside>
  );
};
