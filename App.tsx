
import React, { useState, useEffect } from 'react';
import FridgeScanner from './components/FridgeScanner';
import RecipeCard from './components/RecipeCard';
import RecipeDetails from './components/RecipeDetails';
import CookingMode from './components/CookingMode';
import Sidebar from './components/Sidebar';
import ShoppingList from './components/ShoppingList';
import { AppState, Recipe, DietaryRestriction, Language } from './types';
import { analyzeFridgeAndSuggestRecipes, generateRecipeImage } from './services/gemini';
import { t } from './translations';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    // @ts-ignore
    const savedFavs = typeof localStorage !== 'undefined' ? localStorage.getItem('culinary-favs') : null;
    // @ts-ignore
    const savedShopping = typeof localStorage !== 'undefined' ? localStorage.getItem('culinary-shopping') : null;
    // @ts-ignore
    const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('culinary-lang') as Language : 'en';
    
    return {
      language: savedLang || 'en',
      detectedIngredients: [],
      recipes: [],
      favorites: savedFavs ? JSON.parse(savedFavs) : [],
      shoppingList: savedShopping ? JSON.parse(savedShopping) : [],
      activeRecipe: null,
      isCooking: false,
      filters: {
        dietary: ['None'],
        maxPrepTime: 120
      }
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'home' | 'recipes' | 'shopping' | 'favorites'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasApiKey, setHasApiKey] = useState(true);

  // Check for API Key on mount
  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelection = async () => {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasApiKey(true); // Assume success to unblock UI
    }
  };

  useEffect(() => {
    localStorage.setItem('culinary-favs', JSON.stringify(state.favorites));
  }, [state.favorites]);

  useEffect(() => {
    localStorage.setItem('culinary-shopping', JSON.stringify(state.shoppingList));
  }, [state.shoppingList]);

  useEffect(() => {
    localStorage.setItem('culinary-lang', state.language);
  }, [state.language]);

  const handleLanguageChange = (lang: Language) => {
    setState(prev => ({ ...prev, language: lang }));
  };

  const handleImageCapture = async (base64: string) => {
    setIsLoading(true);
    try {
      const data = await analyzeFridgeAndSuggestRecipes(base64, state.filters.dietary, state.language);
      
      setState(prev => ({
        ...prev,
        detectedIngredients: data.detectedIngredients,
        recipes: data.recipes
      }));
      setView('recipes');

      // Async Image Generation
      data.recipes.forEach(async (recipe: any) => {
        const aiImageUrl = await generateRecipeImage(recipe.imagePrompt, recipe.id);
        if (aiImageUrl) {
          setState(prev => ({
            ...prev,
            recipes: prev.recipes.map(r => r.id === recipe.id ? { ...r, imageUrl: aiImageUrl } : r)
          }));
        }
      });

    } catch (error: any) {
      console.error("Failed to analyze fridge:", error);
      if (error?.message?.includes("entity was not found")) {
        setHasApiKey(false);
      } else {
        alert("Error analyzing fridge. Please check your connection or API Key.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const addToShoppingList = (item: string) => {
    if (!state.shoppingList.includes(item)) {
      setState(prev => ({ ...prev, shoppingList: [...prev.shoppingList, item] }));
    }
  };

  const toggleFavorite = (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    setState(prev => {
      const isFav = prev.favorites.some(f => f.id === recipe.id);
      if (isFav) {
        return { ...prev, favorites: prev.favorites.filter(f => f.id !== recipe.id) };
      } else {
        return { ...prev, favorites: [...prev.favorites, recipe] };
      }
    });
  };

  const getNumericPrepTime = (timeStr: string): number => {
    const match = timeStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const filteredRecipes = (view === 'favorites' ? state.favorites : state.recipes).filter(r => {
    const terms = searchQuery.toLowerCase().split(/[,|\s]+/).map(t => t.trim()).filter(t => t.length > 0);
    const passesPrepTimeFilter = state.filters.maxPrepTime === 120 || getNumericPrepTime(r.prepTime) <= state.filters.maxPrepTime;
    
    if (terms.length === 0) return passesPrepTimeFilter;
    
    const matchesSearch = terms.every(term => 
      r.title.toLowerCase().includes(term) || r.ingredients.some(ing => ing.name.toLowerCase().includes(term))
    );
    
    return matchesSearch && passesPrepTimeFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* API Key Selection Overlay */}
      {!hasApiKey && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-4">{t(state.language, 'selectKeyTitle')}</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">{t(state.language, 'selectKeyDesc')}</p>
            <div className="space-y-4">
              <button 
                onClick={handleOpenKeySelection}
                className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all active:scale-95"
              >
                {t(state.language, 'selectKeyButton')}
              </button>
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noreferrer"
                className="block text-sm text-slate-400 font-medium hover:text-orange-500 transition-colors"
              >
                {t(state.language, 'billingDoc')}
              </a>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setView('home'); setState(prev => ({ ...prev, activeRecipe: null })); }}>
            <div className="bg-orange-500 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t(state.language, 'appName')}<span className="text-orange-500">{t(state.language, 'appTarget')}</span></h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            <button onClick={() => { setView('recipes'); setState(prev => ({ ...prev, activeRecipe: null })); }} className={`px-4 py-2 rounded-full font-medium transition-all ${view === 'recipes' ? 'text-orange-600 bg-orange-50' : 'text-slate-600 hover:bg-slate-100'}`}>{t(state.language, 'navRecipes')}</button>
            <button onClick={() => { setView('favorites'); setState(prev => ({ ...prev, activeRecipe: null })); }} className={`px-4 py-2 rounded-full font-medium transition-all ${view === 'favorites' ? 'text-orange-600 bg-orange-50' : 'text-slate-600 hover:bg-slate-100'}`}>{t(state.language, 'navFavorites')}</button>
            <button onClick={() => setView('shopping')} className={`px-4 py-2 rounded-full font-medium transition-all relative ${view === 'shopping' ? 'text-orange-600 bg-orange-50' : 'text-slate-600 hover:bg-slate-100'}`}>
              {t(state.language, 'navShopping')}
              {state.shoppingList.length > 0 && <span className="absolute top-1 right-0 w-4 h-4 bg-orange-500 text-white text-[10px] flex items-center justify-center rounded-full animate-pulse">{state.shoppingList.length}</span>}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            {view === 'home' && (
              <div className="max-w-2xl mx-auto py-12">
                <div className="text-center mb-12">
                  <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">{t(state.language, 'homeTitle')}</h2>
                  <p className="text-lg text-slate-500">{t(state.language, 'homeSubtitle')}</p>
                </div>
                <FridgeScanner language={state.language} onImageCaptured={handleImageCapture} isLoading={isLoading} />
              </div>
            )}

            {(view === 'recipes' || view === 'favorites') && !state.activeRecipe && (
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <h2 className="text-3xl font-bold text-slate-800">
                    {view === 'favorites' ? t(state.language, 'favTitle') : (state.recipes.length > 0 ? t(state.language, 'suggestedTitle') : t(state.language, 'scanFridge'))}
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder={t(state.language, 'searchPlaceholder')} 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-full md:w-80 transition-all shadow-sm"
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                  </div>
                </div>

                {filteredRecipes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRecipes.map((recipe) => (
                      <RecipeCard key={recipe.id} recipe={recipe} isFavorite={state.favorites.some(f => f.id === recipe.id)} onToggleFavorite={toggleFavorite} onSelect={(r) => setState(prev => ({ ...prev, activeRecipe: r }))} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                    <p className="text-slate-400 mb-6">{view === 'favorites' ? t(state.language, 'noFavs') : t(state.language, 'noRecipes')}</p>
                    <button onClick={() => { setView('home'); setSearchQuery(''); }} className="px-6 py-3 bg-orange-500 text-white rounded-full font-bold shadow-lg shadow-orange-100 transition-transform active:scale-95">
                      {t(state.language, 'scanFridge')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {view === 'recipes' && state.activeRecipe && (
              <div>
                <button onClick={() => setState(prev => ({ ...prev, activeRecipe: null }))} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                  {t(state.language, 'back')}
                </button>
                <RecipeDetails language={state.language} recipe={state.activeRecipe} onCook={() => setState(prev => ({ ...prev, isCooking: true }))} onAddToShoppingList={addToShoppingList} />
              </div>
            )}

            {view === 'shopping' && (
              <div className="max-w-2xl mx-auto">
                <ShoppingList language={state.language} items={state.shoppingList} onRemove={(idx) => setState(prev => ({ ...prev, shoppingList: prev.shoppingList.filter((_, i) => i !== idx) }))} onClear={() => setState(prev => ({ ...prev, shoppingList: [] }))} />
              </div>
            )}
          </div>

          <div className="md:w-64 space-y-8">
            <Sidebar 
              language={state.language}
              onLanguageChange={handleLanguageChange}
              selectedDiet={state.filters.dietary[0] as DietaryRestriction} 
              onSelectDiet={(diet) => setState(prev => ({ ...prev, filters: { ...prev.filters, dietary: [diet] } }))} 
              maxPrepTime={state.filters.maxPrepTime}
              onMaxPrepTimeChange={(time) => setState(prev => ({ ...prev, filters: { ...prev.filters, maxPrepTime: time } }))}
              detectedIngredients={state.detectedIngredients}
              activeRecipe={state.activeRecipe}
            />
          </div>
        </div>
      </main>

      {state.isCooking && state.activeRecipe && (
        <CookingMode language={state.language} recipe={state.activeRecipe} onClose={() => setState(prev => ({ ...prev, isCooking: false }))} />
      )}
    </div>
  );
};

export default App;
