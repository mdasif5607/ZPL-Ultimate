
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { LogBox } from './LogBox';
import { Header } from './Header';
import { Uploader } from './Uploader';
import { ProcessMode, LogEntry, ProcessingState, HistoryItem, AppSettings } from '../types';
import { processZplToPdf, printRawZplToUsb, detectLabelSize } from '../services/zplService';
import { FileText, Download, Printer, Play, Info, CheckCircle2, User as UserIcon, LogOut, ShieldAlert, Key, Zap, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from './AuthModal';
import { logout, requestAccess, getDailyUsage, incrementDailyUsage } from '../services/firebase';

export const LabelStudio: React.FC = () => {
  const { user, profile, loading: authLoading, isAdmin, hasAccess } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [hasRequestedAccess, setHasRequestedAccess] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('zpl_settings');
    return saved ? JSON.parse(saved) : {
      printer: 'Zebra ZD421 (Default)',
      dpi: '8dpmm',
      labelSize: '4x6',
      autoPrint: false,
      useWebUSB: false
    };
  });

  const [usbDevice, setUsbDevice] = useState<USBDevice | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('zpl_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [logs, setLogs] = useState<LogEntry[]>([{ 
    id: 'init',
    message: "System Neural Link established. Processing engines online.", 
    timestamp: new Date().toLocaleTimeString(),
    type: 'info'
  }]);
  
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    total: 0,
    current: 0,
    speed: 0,
    mode: null
  });

  useEffect(() => {
    localStorage.setItem('zpl_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('zpl_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (user) {
      getDailyUsage(user.uid).then(setDailyCount);
    }
  }, [user]);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9),
      message, 
      timestamp: new Date().toLocaleTimeString(),
      type
    }].slice(-50));
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    addLog(`Buffer Loaded: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`, 'success');
  };

  const handleConnectUsb = async () => {
    try {
      const device = await navigator.usb.requestDevice({
        filters: [{ vendorId: 0x0a5f }]
      });
      await device.open();
      setUsbDevice(device);
      addLog(`USB Connected: ${device.productName}`, 'success');
    } catch (error) {
      addLog(`USB Link Failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  const clearFile = () => {
    setFile(null);
    setProcessing(prev => ({ ...prev, progress: 0, total: 0, current: 0 }));
    addLog("Input buffer cleared.");
  };

  const runTask = async (mode: ProcessMode) => {
    if (!file) return;

    if (!user) {
      const freeUsed = localStorage.getItem('zpl_free_used') === 'true';
      if (freeUsed) {
        setAuthMessage("Public quota exhausted. Please sign in to continue converting labels.");
        setShowAuthModal(true);
        return;
      }
    } else {
      if (!hasAccess) {
        setAuthMessage("Security Alert: Active subscription or authorization required for batch operations. Please request access from the dashboard.");
        setShowAuthModal(true);
        return;
      }
      
      const currentUsage = await getDailyUsage(user.uid);
      if (currentUsage >= 10 && !isAdmin) {
        addLog("Daily Protocol Limit Reached (10/10 tokens). Contact admin for quota increase.", "error");
        return;
      }
    }

    setProcessing(prev => ({ ...prev, isProcessing: true, progress: 0, speed: 0, mode }));
    addLog(`Initializing ${mode.toUpperCase()} batch pipeline...`, 'info');

    try {
      let text = await file.text();
      text = text.replace(/^\ufeff/, '');
      
      const labels: string[] = [];
      const xaRegex = /\^XA[\s\S]*?\^XZ/gi;
      let match;
      while ((match = xaRegex.exec(text)) !== null) {
        labels.push(match[0]);
      }

      const total = labels.length;
      if (total === 0) throw new Error("No valid ZPL instructions found in file (^XA tag missing).");

      let activeLabelSize = settings.labelSize;
      if (activeLabelSize.toLowerCase() === 'auto') {
        addLog("Scanning ZPL stream for dimensions...", 'info');
        activeLabelSize = detectLabelSize(text, settings.dpi);
        const unitSuffix = activeLabelSize.endsWith('mm') ? "" : " IN";
        addLog(`Auto-detected: ${activeLabelSize}${unitSuffix}`, 'success');
      }

      setProcessing(prev => ({ ...prev, total }));

      if (mode === ProcessMode.PRINT && usbDevice) {
        addLog(`Transmitting ${total} labels directly to hardware via USB...`, 'info');
        const BATCH_SIZE = 20;
        for (let i = 0; i < total; i += BATCH_SIZE) {
          const chunk = labels.slice(i, i + BATCH_SIZE).join('\n');
          await printRawZplToUsb(usbDevice, chunk);
          const current = Math.min(i + BATCH_SIZE, total);
          setProcessing(prev => ({ ...prev, current, progress: (current / total) * 100 }));
          addLog(`USB Streamed: ${current}/${total} labels`, 'info');
        }
        addLog("Hardware transmission complete. Check printer status.", 'success');
      } else {
        const startTime = Date.now();
        const estMinutes = Math.ceil((total / 50) * 5 / 60);
        addLog(`Generation started. Approx. ${estMinutes} min for ${total} labels.`, 'info');
        
        const result = await processZplToPdf(
          labels, 
          settings.dpi, 
          activeLabelSize, 
          (current) => {
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const speed = elapsedSeconds > 0 ? (current / elapsedSeconds) : 0;
            const remaining = total - current;
            const estRemainingSec = speed > 0 ? (remaining / speed) : 0;
            
            setProcessing(prev => ({
              ...prev,
              current,
              percentage: (current / total) * 100,
              progress: (current / total) * 100,
              speed: speed.toFixed(1),
              estimatedSeconds: Math.ceil(estRemainingSec)
            }));
            
            if (current % 20 === 0 || current === total) {
                addLog(`Processed ${current}/${total} labels...`, 'info');
            }
          },
          (errorMsg) => { addLog(errorMsg, 'error'); }
        );

        const { blob, failedCount, successCount } = result;

        if (blob) {
          const url = URL.createObjectURL(blob);
          if (!user) {
            localStorage.setItem('zpl_free_used', 'true');
            addLog("Public conversion credit consumed. Login required for next batch.", 'warning');
          } else {
            await incrementDailyUsage(user.uid);
            const newUsage = await getDailyUsage(user.uid);
            setDailyCount(newUsage);
          }

          if (mode === ProcessMode.PDF) {
            const link = document.createElement('a');
            link.href = url;
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            link.download = `${baseName}.pdf`;
            link.click();
            addLog(`Batch completed: ${successCount} success, ${failedCount} fail.`, successCount > 0 ? 'success' : 'error');
          } else {
            const printWindow = window.open(url);
            if (printWindow) {
              printWindow.onload = () => {
                printWindow.print();
                addLog(`Print dialog active for ${successCount} labels.`, 'success');
              };
            } else {
              addLog("Popup blocked. Printing fallback triggered.", 'warning');
              window.location.href = url;
            }
          }
        }
      }

      const newHistoryItem: HistoryItem = {
          id: Date.now().toString(),
          fileName: file.name,
          labelCount: total,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dpi: settings.dpi,
          size: activeLabelSize,
          status: 'completed'
      };
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 10));
    } catch (error) {
      addLog(`FATAL ERROR: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setProcessing(prev => ({ ...prev, isProcessing: false }));
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-blue-500/30">
      <Sidebar 
        printer={settings.printer}
        setPrinter={(v) => setSettings(s => ({...s, printer: v}))}
        dpi={settings.dpi}
        setDpi={(v) => setSettings(s => ({...s, dpi: v}))}
        labelSize={settings.labelSize}
        setLabelSize={(v) => setSettings(s => ({...s, labelSize: v}))}
        speed={processing.speed}
        history={history}
        usbDevice={usbDevice}
        onConnectUsb={handleConnectUsb}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.03),transparent_40%)]">
        <div className="p-8 max-w-6xl w-full mx-auto flex flex-col h-full overflow-y-auto scrollbar-hide">
          <Header />

          <div className="grid grid-cols-12 gap-8 flex-1">
            <div className="col-span-12 lg:col-span-7 space-y-8">
              <section className="bg-zinc-900/40 border border-white/[0.03] rounded-2xl p-6 overflow-hidden relative">
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-zinc-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        {user ? user.email : "Guest Identity"}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {!user ? (
                           <span className="text-[10px] text-zinc-500 font-mono uppercase bg-zinc-800/50 px-2 py-0.5 rounded">Public Access</span>
                        ) : (
                          <>
                            <span className={cn(
                              "text-[10px] font-mono uppercase px-2 py-0.5 rounded",
                              hasAccess ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10"
                            )}>
                              {hasAccess ? "Access Granted" : "Access Pending"}
                            </span>
                            {hasAccess && (
                              <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                                <Zap className="w-3 h-3 text-blue-500" /> {dailyCount}/10 Tokens Used
                              </span>
                            )}
                            {isAdmin && (
                              <Link 
                                to="/admin" 
                                className="text-[10px] font-mono text-blue-500 hover:text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10 flex items-center gap-1 transition-all"
                              >
                                <Shield className="w-2.5 h-2.5" /> Dashboard
                              </Link>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {user ? (
                      <>
                        {!hasAccess && !hasRequestedAccess && (
                          <button 
                            onClick={async () => {
                              await requestAccess(user);
                              setHasRequestedAccess(true);
                              addLog("Access request dispatched to JM INTERNATIONAL central hub.", 'info');
                            }}
                            className="text-[10px] font-bold uppercase tracking-widest bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-2"
                          >
                            <Key className="w-3 h-3" /> Request Access
                          </button>
                        )}
                        <button onClick={logout} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                          <LogOut className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => setShowAuthModal(true)}
                        className="text-[10px] font-bold uppercase tracking-widest bg-zinc-800 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors"
                      >
                        Sign In
                      </button>
                    )}
                  </div>
                </div>

                {user && !hasAccess && (
                  <div className="mt-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-4">
                    <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-amber-500/80 font-medium leading-relaxed">
                        Access requires authorization from JM INTERNATIONAL. Once granted, you'll receive 10 daily conversion tokens.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Data Ingestion
                  </h2>
                </div>
                <Uploader onFileSelect={handleFileSelect} selectedFile={file} onClear={clearFile} />
              </section>

              <section className="bg-zinc-900/50 border border-white/[0.05] rounded-2xl p-6">
                <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                  <Play className="w-4 h-4" /> Execution Core
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    disabled={processing.isProcessing || !file}
                    onClick={() => runTask(ProcessMode.PDF)}
                    className={cn(
                      "relative group overflow-hidden h-32 rounded-xl border transition-all duration-500",
                      !file || processing.isProcessing
                        ? "border-zinc-800 bg-zinc-900/50 opacity-40 cursor-not-allowed"
                        : "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/40"
                    )}
                  >
                    <div className="flex flex-col items-center justify-center h-full relative z-10 transition-transform group-hover:-translate-y-1">
                      <Download className={cn("w-8 h-8 mb-3", file ? "text-blue-500" : "text-zinc-500")} />
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">Generate PDF Batch</span>
                    </div>
                  </button>

                  <button 
                    disabled={processing.isProcessing || !file}
                    onClick={() => runTask(ProcessMode.PRINT)}
                    className={cn(
                      "relative group overflow-hidden h-32 rounded-xl border transition-all duration-500",
                      !file || processing.isProcessing
                        ? "border-zinc-800 bg-zinc-900/50 opacity-40 cursor-not-allowed"
                        : "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40"
                    )}
                  >
                    <div className="flex flex-col items-center justify-center h-full relative z-10 transition-transform group-hover:-translate-y-1">
                      <Printer className={cn("w-8 h-8 mb-3", file ? "text-emerald-500" : "text-zinc-500")} />
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">Direct Label Output</span>
                    </div>
                  </button>
                </div>
              </section>

              <AnimatePresence>
                {(processing.isProcessing || processing.progress > 0) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-zinc-900 border border-blue-500/20 rounded-2xl p-6 shadow-2xl shadow-blue-500/5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Pipeline State: {processing.mode === ProcessMode.PDF ? 'Exporting' : 'Printing'}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-white">{processing.current} / {processing.total}</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden mb-3">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${processing.progress}%` }} className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
                      <div className="flex items-center gap-3">
                        <span>{(processing.progress).toFixed(1)}% Completed</span>
                        {processing.isProcessing && processing.estimatedSeconds !== undefined && processing.estimatedSeconds > 0 && (
                          <span className="text-zinc-600 border-l border-zinc-800 pl-3"> ~{Math.ceil(processing.estimatedSeconds / 60)} min left </span>
                        )}
                      </div>
                      {processing.progress === 100 && (
                        <span className="text-emerald-500 flex items-center gap-1"> <CheckCircle2 className="w-3 h-3" /> Fully Synced </span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="col-span-12 lg:col-span-5 flex flex-col gap-8">
              <section className="flex flex-col flex-1">
                 <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"> <Info className="w-4 h-4" /> Operational Logs </h2>
                <LogBox logs={logs} />
              </section>
            </div>
          </div>

          <footer className="mt-12 pt-8 border-t border-white/[0.05] flex items-center justify-between italic">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium"> Proprietary Build for <span className="text-zinc-500">JM INTERNATIONAL</span> </p>
            <p className="text-[10px] text-zinc-700 font-mono"> Designed by <span className="hover:text-blue-500 cursor-pointer transition-colors">Rakibul Hasan Asif</span> </p>
          </footer>
        </div>
      </main>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} message={authMessage} />
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
};
