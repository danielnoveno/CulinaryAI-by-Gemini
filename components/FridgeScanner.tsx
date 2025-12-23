
import React, { useRef, useState } from 'react';
import { Language } from '../types';
import { t } from '../translations';

interface FridgeScannerProps {
  language: Language;
  onImageCaptured: (base64: string) => void;
  isLoading: boolean;
}

const FridgeScanner: React.FC<FridgeScannerProps> = ({ language, onImageCaptured, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result?.toString().split(',')[1];
      if (base64) onImageCaptured(base64);
    };
    reader.readAsDataURL(file);
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div 
      className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
        dragActive ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white'
      } ${isLoading ? 'opacity-50 pointer-events-none' : 'hover:border-orange-300'}`}
      onDragEnter={onDrag}
      onDragLeave={onDrag}
      onDragOver={onDrag}
      onDrop={onDrop}
    >
      <input 
        ref={inputRef}
        type="file" 
        accept="image/*" 
        capture="environment"
        className="hidden" 
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">{t(language, 'scanTitle')}</h3>
          <p className="text-slate-500 mt-1">{t(language, 'scanSubtitle')}</p>
        </div>
        <button 
          onClick={() => inputRef.current?.click()}
          className="mt-4 px-8 py-3 bg-orange-500 text-white rounded-full font-semibold shadow-lg shadow-orange-100 hover:bg-orange-600 active:scale-95 transition-all"
        >
          {t(language, 'selectImage')}
        </button>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-3xl z-10">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 font-medium text-orange-600 animate-pulse">{t(language, 'analyzing')}</p>
        </div>
      )}
    </div>
  );
};

export default FridgeScanner;
