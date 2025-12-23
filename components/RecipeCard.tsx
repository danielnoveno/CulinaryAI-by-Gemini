
import React, { useState } from 'react';
import { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  onSelect: (recipe: Recipe) => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent, recipe: Recipe) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onSelect, isFavorite, onToggleFavorite }) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const fallbackUrl = `https://loremflickr.com/400/300/food,${recipe.id}`;

  return (
    <div 
      onClick={() => onSelect(recipe)}
      className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-orange-100 transition-all cursor-pointer group relative flex flex-col h-full"
    >
      <div className="relative h-48 overflow-hidden shrink-0 bg-slate-100">
        {!imgLoaded && (
          <div className="absolute inset-0 animate-pulse bg-slate-200 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
        )}
        <img 
          src={imgError ? fallbackUrl : (recipe.imageUrl || fallbackUrl)} 
          alt={recipe.title} 
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-700 shadow-sm border border-white/20">
          {recipe.difficulty}
        </div>
        <button 
          onClick={(e) => onToggleFavorite(e, recipe)}
          className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur-md transition-all ${
            isFavorite ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-white/80 text-slate-400 hover:text-red-500 hover:bg-white'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-orange-600 transition-colors">{recipe.title}</h3>
        
        {/* Macros Section */}
        <div className="flex gap-4 mt-2 mb-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Protein</span>
            <span className="text-xs font-bold text-slate-700">{recipe.nutrition?.protein || 0}g</span>
          </div>
          <div className="flex flex-col border-l border-slate-100 pl-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Fat</span>
            <span className="text-xs font-bold text-slate-700">{recipe.nutrition?.fat || 0}g</span>
          </div>
          <div className="flex flex-col border-l border-slate-100 pl-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Carbs</span>
            <span className="text-xs font-bold text-slate-700">{recipe.nutrition?.carbs || 0}g</span>
          </div>
        </div>

        {/* Enhanced Ingredient Preview Section */}
        <div className="flex flex-wrap gap-1.5 h-16 overflow-hidden content-start">
          {recipe.ingredients.slice(0, 4).map((ing, i) => (
            <div 
              key={i} 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all text-[10px] ${
                ing.owned 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {ing.owned && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
              <div className="flex items-center gap-1">
                <span className={`font-black uppercase tracking-tight ${ing.owned ? 'text-green-800' : 'text-slate-800'}`}>
                  {ing.amount}
                </span>
                <span className="truncate max-w-[90px] font-medium opacity-80">{ing.name}</span>
              </div>
            </div>
          ))}
          {recipe.ingredients.length > 4 && (
            <div className="flex items-center text-[9px] text-slate-400 font-bold bg-white px-2 py-1 rounded-full border border-slate-200">
              +{recipe.ingredients.length - 4} MORE
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 mt-4 line-clamp-2 leading-relaxed italic">
          {recipe.summary || 'A delicious dish tailored to your ingredients.'}
        </p>
        
        <div className="mt-auto pt-4 flex items-center justify-between text-slate-600 text-sm border-t border-slate-50">
          <div className="flex items-center gap-1.5 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {recipe.prepTime}
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            {recipe.calories} kcal
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
