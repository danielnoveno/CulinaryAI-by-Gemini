
import React, { useState, useEffect, useRef } from 'react';
import { Recipe, Language } from '../types';
import { speakStep, generateStepImage } from '../services/gemini';
import { playRawPcm } from '../utils/audio';
import { t } from '../translations';

interface CookingModeProps {
  language: Language;
  recipe: Recipe;
  onClose: () => void;
}

const CookingMode: React.FC<CookingModeProps> = ({ language, recipe, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [isVisualLoading, setIsVisualLoading] = useState(false);
  const [visualUrl, setVisualUrl] = useState<string | null>(null);
  const [visualError, setVisualError] = useState<string | null>(null);
  
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const timerInterval = useRef<number | null>(null);

  const placeholderKitchenImg = "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1200";

  // Load visual aid automatically when currentStep changes
  useEffect(() => {
    const loadStepVisual = async () => {
      setIsVisualLoading(true);
      setVisualError(null);
      setVisualUrl(null);
      
      try {
        const stepId = `${recipe.id}-step-${currentStep}`;
        const url = await generateStepImage(recipe.steps[currentStep], stepId);
        if (url) {
          setVisualUrl(url);
        } else {
          setVisualError('videoError');
        }
      } catch (e: any) {
        console.error('Visual guide error:', e);
        setVisualError('videoError');
      } finally {
        setIsVisualLoading(false);
      }
    };

    loadStepVisual();

    // Setup timer if time is mentioned in the step
    const stepText = recipe.steps[currentStep];
    const match = stepText.match(/(\d+)\s*(minute|minutes|menit)/i);
    if (match) {
      const mins = parseInt(match[1]);
      setTimeLeft(mins * 60);
    } else {
      setTimeLeft(null);
      setTimerActive(false);
    }
  }, [currentStep, recipe.steps, recipe.id]);

  useEffect(() => {
    if (timerActive && timeLeft !== null && timeLeft > 0) {
      timerInterval.current = window.setInterval(() => {
        setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (timeLeft === 0) {
      if (timerInterval.current) clearInterval(timerInterval.current);
      setTimerActive(false);
      alert(t(language, 'timerDone'));
    }
    return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
  }, [timerActive, timeLeft, language]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleNext = () => {
    if (currentStep < recipe.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReadAloud = async () => {
    if (isReading) return;
    setIsReading(true);
    try {
      const base64 = await speakStep(recipe.steps[currentStep], language);
      if (base64) await playRawPcm(base64);
    } catch (e) {
      console.error(e);
    } finally {
      setIsReading(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="p-4 md:p-6 flex items-center justify-between border-b border-slate-100 bg-white shadow-sm z-10">
        <div className="flex items-center gap-4 flex-1">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="hidden sm:block">
            <h2 className="text-xl font-bold text-slate-800 line-clamp-1">{recipe.title}</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t(language, 'step')} {currentStep + 1} / {recipe.steps.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {timeLeft !== null && (
             <button 
              onClick={() => setTimerActive(!timerActive)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold transition-all text-sm ${
                timerActive ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600 border border-green-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {formatTime(timeLeft)}
            </button>
          )}
          
          <button 
            onClick={handleReadAloud}
            disabled={isReading}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all shadow-md text-sm ${
              isReading ? 'bg-orange-50 text-orange-400' : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {isReading ? <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>}
            {isReading ? t(language, 'reading') : t(language, 'listen')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row bg-slate-50 overflow-hidden">
        
        {/* Visual Aid Area */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-10 relative">
          <div className="relative aspect-video w-full max-w-4xl bg-slate-200 rounded-[2rem] shadow-2xl overflow-hidden border-4 border-white">
            {visualUrl ? (
              <img 
                src={visualUrl} 
                alt="Cooking Technique"
                className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-700"
              />
            ) : isVisualLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-100 z-20">
                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{t(language, 'generatingVideo')}</h3>
                <p className="text-slate-400 text-sm max-w-xs">{t(language, 'videoWait')}</p>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100">
                <img src={placeholderKitchenImg} alt="Kitchen Placeholder" className="w-full h-full object-cover opacity-20 grayscale" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <div className="bg-slate-200 p-6 rounded-full mb-4 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                   </div>
                   <p className="text-slate-500 font-bold">{t(language, 'videoError')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instruction Area */}
        <div className="md:w-1/3 bg-white border-l border-slate-100 p-8 md:p-12 flex flex-col justify-center shadow-inner">
          <div className="mb-10 animate-in slide-in-from-right duration-500">
             <span className="inline-block px-3 py-1 bg-orange-100 text-orange-600 rounded-lg text-xs font-black uppercase tracking-widest mb-4">
               {t(language, 'step')} {currentStep + 1}
             </span>
             <h3 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-slate-800 leading-tight">
               {recipe.steps[currentStep]}
             </h3>
          </div>
          
          <div className="flex gap-2">
            {recipe.steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-10 bg-orange-500' : 'w-2 bg-slate-200'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="p-6 md:p-8 bg-white border-t border-slate-100 shadow-xl z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-6">
          <button 
            onClick={handleBack} 
            disabled={currentStep === 0} 
            className="flex-1 max-w-[160px] px-6 py-4 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            {t(language, 'prev')}
          </button>
          
          <div className="text-center">
            <div className="text-xs font-black text-slate-300 uppercase tracking-widest mb-1">{t(language, 'step')}</div>
            <div className="font-black text-slate-800 text-xl">{currentStep + 1} / {recipe.steps.length}</div>
          </div>

          <button 
            onClick={handleNext} 
            disabled={currentStep === recipe.steps.length - 1} 
            className="flex-1 max-w-[160px] px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-800 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
          >
            {t(language, 'next')}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookingMode;
