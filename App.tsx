
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
    const savedFavs = localStorage.getItem('culinary-favs');
    const savedShopping = localStorage.getItem('culinary-shopping');
    const savedLang = localStorage.getItem('culinary-lang') as Language;
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

      // Async AI Image Generation to replace placeholders
      data.recipes.forEach(async (recipe: Recipe & { imagePrompt: string }) => {
        const aiImageUrl = await generateRecipeImage(recipe.imagePrompt);
        if (aiImageUrl) {
          setState(prev => ({
            ...prev,
            recipes: prev.recipes.map(r => r.id === recipe.id ? { ...r, imageUrl: aiImageUrl } : r)
          }));
        }
      });

    } catch (error) {
      console.error("Failed to analyze fridge:", error);
      alert("Failed to analyze fridge image.");
    } finally {
      setIsLoading(false);
    }
  };

  const addToShoppingList = (item: string) => {
    if (!state.shoppingList.includes(item)) {
      setState(prev => ({ ...prev, shoppingList: [...prev.shoppingList, item] }));
    }
  };

  const removeFromShoppingList = (index: number) => {
    setState(prev => ({
      ...prev,
      shoppingList: prev.shoppingList.filter((_, i) => i !== index)
    }));
  };

  const clearShoppingList = () => {
    setState(prev => ({ ...prev, shoppingList: [] }));
  };

  const clearFavorites = () => {
    if (window.confirm(t(state.language, 'confirmClearFavs'))) {
      setState(prev => ({ ...prev, favorites: [] }));
    }
  };

  const handleDietaryChange = (diet: DietaryRestriction) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, dietary: [diet] }
    }));
  };

  const handleMaxPrepTimeChange = (time: number) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, maxPrepTime: time }
    }));
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

  const isFavorite = (id: string) => state.favorites.some(f => f.id === id);

  const getNumericPrepTime = (timeStr: string): number => {
    const match = timeStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const filteredRecipes = (view === 'favorites' ? state.favorites : state.recipes).filter(r => {
    const terms = searchQuery.toLowerCase().split(/[,|\s]+/).map(t => t.trim()).filter(t => t.length > 0);
    if (terms.length === 0) {
      return state.filters.maxPrepTime === 120 || getNumericPrepTime(r.prepTime) <= state.filters.maxPrepTime;
    }
    const matchesSearch = terms.every(term => {
      return r.title.toLowerCase().includes(term) || r.ingredients.some(ing => ing.name.toLowerCase().includes(term));
    });
    const passesPrepTimeFilter = state.filters.maxPrepTime === 120 || getNumericPrepTime(r.prepTime) <= state.filters.maxPrepTime;
    return matchesSearch && passesPrepTimeFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
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
                      <RecipeCard key={recipe.id} recipe={recipe} isFavorite={isFavorite(recipe.id)} onToggleFavorite={toggleFavorite} onSelect={(r) => setState(prev => ({ ...prev, activeRecipe: r }))} />
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
                <ShoppingList language={state.language} items={state.shoppingList} onRemove={removeFromShoppingList} onClear={clearShoppingList} />
              </div>
            )}
          </div>

          <div className="md:w-64 space-y-8">
            <Sidebar 
              language={state.language}
              onLanguageChange={handleLanguageChange}
              selectedDiet={state.filters.dietary[0] as DietaryRestriction} 
              onSelectDiet={handleDietaryChange} 
              maxPrepTime={state.filters.maxPrepTime}
              onMaxPrepTimeChange={handleMaxPrepTimeChange}
              detectedIngredients={state.detectedIngredients}
              activeRecipe={state.activeRecipe}
            />
            {state.detectedIngredients.length > 0 && (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4">{t(state.language, 'detectedItems')}</h3>
                <div className="flex flex-wrap gap-2">
                  {state.detectedIngredients.map((item, idx) => (
                    <span key={idx} className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-xl text-sm font-medium">{item}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {state.isCooking && state.activeRecipe && (
        <CookingMode language={state.language} recipe={state.activeRecipe} onClose={() => setState(prev => ({ ...prev, isCooking: false }))} />
      )}

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-slate-100 flex items-center justify-around h-20 px-4 z-40">
        <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1 ${view === 'home' ? 'text-orange-500' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </button>
        <button onClick={() => { setView('recipes'); setState(prev => ({ ...prev, activeRecipe: null })); }} className={`flex flex-col items-center gap-1 ${view === 'recipes' ? 'text-orange-500' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </button>
        <button onClick={() => { setView('favorites'); setState(prev => ({ ...prev, activeRecipe: null })); }} className={`flex flex-col items-center gap-1 ${view === 'favorites' ? 'text-orange-500' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <button onClick={() => setView('shopping')} className={`flex flex-col items-center gap-1 relative ${view === 'shopping' ? 'text-orange-500' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          {state.shoppingList.length > 0 && <span className="absolute -top-1 right-0 w-4 h-4 bg-orange-500 text-white text-[10px] flex items-center justify-center rounded-full">{state.shoppingList.length}</span>}
        </button>
      </nav>
    </div>
  );
};

export default App;
