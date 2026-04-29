
import React, { useState, useCallback } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface UploaderProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

export const Uploader: React.FC<UploaderProps> = ({ onFileSelect, selectedFile, onClear }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.zpl') || file.name.endsWith('.txt'))) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative group border-2 border-dashed rounded-2xl p-12 transition-all duration-300 flex flex-col items-center justify-center text-center",
            isDragging 
              ? "border-blue-500 bg-blue-500/5" 
              : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/50"
          )}
        >
          <input
            type="file"
            accept=".zpl,.txt"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Upload className={cn(
              "w-8 h-8 transition-colors",
              isDragging ? "text-blue-500" : "text-zinc-500"
            )} />
          </div>
          
          <h3 className="text-lg font-semibold text-white mb-2">
            Load ZPL or TXT data file
          </h3>
          <p className="text-zinc-500 text-sm max-w-xs mx-auto">
            Drag and drop your file here, or click to browse. Supports high-volume batch files.
          </p>

          <div className="mt-8 flex items-center gap-3 text-[10px] text-zinc-600 uppercase tracking-widest font-semibold bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-800">
            <AlertCircle className="w-3 h-3" />
            Max 10,000 labels per file recommended
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <FileText className="text-blue-500 w-6 h-6" />
            </div>
            <div>
              <p className="text-white font-medium">{selectedFile.name}</p>
              <p className="text-zinc-500 text-sm">{(selectedFile.size / 1024).toFixed(2)} KB • Ready for processing</p>
            </div>
          </div>
          <button
            onClick={onClear}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
