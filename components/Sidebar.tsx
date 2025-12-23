
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { DietaryRestriction, DIETARY_OPTIONS, Recipe, Language } from '../types';
import { t } from '../translations';
import { generateDynamicTips } from '../services/gemini';

interface SidebarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  selectedDiet: DietaryRestriction;
  onSelectDiet: (diet: DietaryRestriction) => void;
  maxPrepTime: number;
  onMaxPrepTimeChange: (time: number) => void;
  detectedIngredients: string[];
  activeRecipe: Recipe | null;
}

interface CookingTip {
  title: string;
  content: string;
  isAI?: boolean;
}

const STATIC_TIPS: { id: string, keywords: { en: string[], id: string[] }, title: { en: string, id: string }, content: { en: string, id: string } }[] = [
  {
    id: 'garlic-peel',
    keywords: { en: ['garlic'], id: ['bawang putih'] },
    title: { en: 'Garlic Hack', id: 'Trik Bawang Putih' },
    content: { 
      en: 'Crush garlic cloves with the flat side of your knife to make peeling effortless.',
      id: 'Geprek bawang putih dengan sisi datar pisau agar lebih mudah dikupas.'
    }
  },
  {
    id: 'egg-freshness',
    keywords: { en: ['egg'], id: ['telur'] },
    title: { en: 'Egg Float Test', id: 'Tes Kesegaran Telur' },
    content: {
      en: 'Fresh eggs sink; old eggs float. Check yours in a bowl of water before cracking!',
      id: 'Telur segar akan tenggelam; telur lama akan mengapung. Cek dulu sebelum dimasak!'
    }
  },
  {
    id: 'meat-sear',
    keywords: { en: ['chicken', 'meat', 'beef'], id: ['ayam', 'daging', 'sapi'] },
    title: { en: 'Perfect Sear', id: 'Teknik Menumis' },
    content: {
      en: 'Always pat meat dry with a paper towel before cooking to get a golden-brown crust.',
      id: 'Selalu keringkan daging dengan tisu dapur sebelum dimasak agar mendapat kerak kecokelatan yang sempurna.'
    }
  },
  {
    id: 'herb-freshness',
    keywords: { en: ['herb', 'parsley', 'cilantro', 'basil'], id: ['herba', 'seledri', 'daun', 'kemangi'] },
    title: { en: 'Herb Life', id: 'Kesegaran Herba' },
    content: {
      en: 'Store fresh herbs like a bouquet of flowers in a glass of water to keep them crisp.',
      id: 'Simpan herba segar seperti buket bunga dalam segelas air agar tetap renyah.'
    }
  },
  {
    id: 'onion-cry',
    keywords: { en: ['onion'], id: ['bawang bombay'] },
    title: { en: 'No More Tears', id: 'Tanpa Air Mata' },
    content: {
      en: 'Chilling onions in the fridge for 15 minutes before cutting reduces eye irritation.',
      id: 'Dinginkan bawang di kulkas selama 15 menit sebelum dipotong untuk mengurangi iritasi mata.'
    }
  },
  {
    id: 'salt-balance',
    keywords: { en: ['soup', 'salty', 'potato'], id: ['sup', 'asin', 'kentang'] },
    title: { en: 'Salty Soup Fix', id: 'Solusi Sup Terlalu Asin' },
    content: {
      en: 'If a soup is too salty, drop in a raw potato; it will absorb some of the excess salt.',
      id: 'Jika sup terlalu asin, masukkan kentang mentah; kentang akan menyerap sebagian kelebihan garam.'
    }
  },
  {
    id: 'knife-sharp',
    keywords: { en: ['knife', 'cut', 'slice'], id: ['pisau', 'potong', 'iris'] },
    title: { en: 'Knife Safety', id: 'Keamanan Pisau' },
    content: {
      en: 'A sharp knife is safer than a dull one. It requires less pressure and is less likely to slip.',
      id: 'Pisau tajam lebih aman daripada pisau tumpul. Memerlukan lebih sedikit tekanan dan jarang meleset.'
    }
  }
];

const Sidebar: React.FC<SidebarProps> = ({ 
  language,
  onLanguageChange,
  selectedDiet, 
  onSelectDiet, 
  maxPrepTime, 
  onMaxPrepTimeChange,
  detectedIngredients,
  activeRecipe
}) => {
  const [dynamicTips, setDynamicTips] = useState<CookingTip[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchTips = useCallback(async () => {
    if (detectedIngredients.length === 0 && !activeRecipe) {
      setDynamicTips([]);
      return;
    }
    
    setIsGenerating(true);
    try {
      const ingredients = activeRecipe 
        ? activeRecipe.ingredients.map(i => i.name) 
        : detectedIngredients;
      
      const tips = await generateDynamicTips(ingredients, activeRecipe?.title, language);
      if (tips && tips.length > 0) {
        setDynamicTips(tips.map(t => ({ ...t, isAI: true })));
      } else {
        setDynamicTips([]);
      }
    } catch (err) {
      setDynamicTips([]);
    } finally {
      setIsGenerating(false);
    }
  }, [detectedIngredients, activeRecipe, language]);

  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  const fallbackTips = useMemo(() => {
    const contextStrings = [
      ...detectedIngredients.map(i => i.toLowerCase()),
      ...(activeRecipe?.ingredients.map(i => i.name.toLowerCase()) || []),
      activeRecipe?.title.toLowerCase() || ''
    ];

    const matched = STATIC_TIPS.filter(tip => {
      const keywords = [...tip.keywords.en, ...tip.keywords.id];
      return keywords.some(keyword => contextStrings.some(ctx => ctx.includes(keyword.toLowerCase())));
    });

    // Take matches, or random if no matches
    let results = matched.length > 0 ? matched : [];
    
    // Fill with random if we have fewer than 2 matches
    if (results.length < 2) {
      const remaining = STATIC_TIPS.filter(t => !results.includes(t));
      const shuffled = [...remaining].sort(() => 0.5 - Math.random());
      results = [...results, ...shuffled].slice(0, 2);
    } else {
      results = results.slice(0, 2);
    }
    
    return results.map(t => ({
      title: t.title[language],
      content: t.content[language],
      isAI: false
    }));
  }, [detectedIngredients, activeRecipe, language]);

  const displayTips = dynamicTips.length > 0 ? dynamicTips : fallbackTips;

  return (
    <div className="w-full md:w-64 space-y-6">
      {/* Language Toggle */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-2">{t(language, 'language')}</h3>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => onLanguageChange('en')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${language === 'en' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            English
          </button>
          <button 
            onClick={() => onLanguageChange('id')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${language === 'id' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Indonesia
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit space-y-8">
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            {t(language, 'filters')}
          </h2>
          
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t(language, 'dietaryPref')}</p>
            <div className="flex flex-col gap-2">
              {DIETARY_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => onSelectDiet(option)}
                  className={`text-left px-4 py-3 rounded-xl transition-all ${
                    selectedDiet === option 
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-100' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-50">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t(language, 'maxTime')}</p>
            <span className="text-orange-600 font-bold text-sm bg-orange-50 px-2 py-0.5 rounded-lg">
              {maxPrepTime === 120 ? t(language, 'any') : `${maxPrepTime}m`}
            </span>
          </div>
          <input 
            type="range" 
            min="5" 
            max="120" 
            step="5" 
            value={maxPrepTime}
            onChange={(e) => onMaxPrepTimeChange(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-800 text-white overflow-hidden relative group">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all"></div>
        
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3 3 0 0014 18.25V19a2 2 0 11-4 0v-.75a3 3 0 00-.817-2.103l-.546-.547z"/></svg>
            {t(language, 'chefSecrets')}
          </h3>
          <button 
            onClick={() => fetchTips()}
            disabled={isGenerating}
            className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${isGenerating ? 'animate-spin opacity-50' : 'opacity-70 hover:opacity-100'}`}
            title="Refresh Tips"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>

        <div className="space-y-5 relative z-10">
          {displayTips.length === 0 && !isGenerating ? (
            <p className="text-xs text-slate-500 italic">Scan ingredients for custom secrets.</p>
          ) : (
            displayTips.map((tip, idx) => (
              <div key={`${idx}-${tip.title}`} className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="text-orange-400 opacity-80">
                    {tip.isAI ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                    )}
                  </div>
                  <h4 className={`text-[10px] font-black uppercase tracking-widest ${tip.isAI ? 'text-orange-300' : 'text-slate-400'}`}>
                    {tip.title}
                  </h4>
                </div>
                <p className="text-sm text-slate-300 leading-snug">{tip.content}</p>
              </div>
            ))
          )}
          
          {isGenerating && (
            <div className="flex flex-col gap-4">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-2 w-24 bg-slate-800 rounded mb-2"></div>
                  <div className="h-3 w-full bg-slate-800 rounded mb-1"></div>
                  <div className="h-3 w-4/5 bg-slate-800 rounded"></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
