
export interface LogEntry {
  id: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export enum ProcessMode {
  PDF = 'pdf',
  PRINT = 'print'
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  total: number;
  current: number;
  speed: string | number;
  mode: ProcessMode | null;
  percentage: number;
  estimatedSeconds?: number;
}

export interface HistoryItem {
  id: string;
  fileName: string;
  labelCount: number;
  timestamp: string;
  dpi: string;
  size: string;
  status: 'completed' | 'failed';
}

export interface AppSettings {
  printer: string;
  dpi: string;
  labelSize: string;
  autoPrint: boolean;
  useWebUSB: boolean;
}
