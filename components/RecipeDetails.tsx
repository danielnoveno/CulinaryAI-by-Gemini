
import React, { useState } from 'react';
import { Recipe, Ingredient, Language } from '../types';
import { t } from '../translations';

interface RecipeDetailsProps {
  language: Language;
  recipe: Recipe;
  onCook: () => void;
  onAddToShoppingList: (item: string) => void;
}

interface Knowledge {
  en: string;
  id: string;
  sub?: { en: string; id: string };
}

const INGREDIENT_KNOWLEDGE: Record<string, Knowledge> = {
  'egg': { 
    en: 'Store in the main body of the fridge.', 
    id: 'Simpan di bagian tengah kulkas.',
    sub: { en: 'Applesauce or silken tofu (for baking).', id: 'Saus apel atau tahu sutra (untuk kue).' }
  },
  'telur': { 
    en: 'Store in the main body of the fridge.', 
    id: 'Simpan di bagian tengah kulkas.',
    sub: { en: 'Applesauce or silken tofu (for baking).', id: 'Saus apel atau tahu sutra (untuk kue).' }
  },
  'milk': { 
    en: 'Keep in the coldest part of the fridge.', 
    id: 'Simpan di bagian paling dingin.',
    sub: { en: 'Almond or oat milk.', id: 'Susu almond atau gandum.' }
  },
  'susu': { 
    en: 'Keep in the coldest part of the fridge.', 
    id: 'Simpan di bagian paling dingin.',
    sub: { en: 'Almond or oat milk.', id: 'Susu almond atau gandum.' }
  },
  'garlic': {
    en: 'Store in a cool, dark, dry place with good ventilation.',
    id: 'Simpan di tempat sejuk, gelap, dan kering dengan ventilasi baik.',
    sub: { en: 'Shallots or garlic powder.', id: 'Bawang merah atau bubuk bawang putih.' }
  },
  'bawang putih': {
    en: 'Store in a cool, dark, dry place with good ventilation.',
    id: 'Simpan di tempat sejuk, gelap, dan kering dengan ventilasi baik.',
    sub: { en: 'Shallots or garlic powder.', id: 'Bawang merah atau bubuk bawang putih.' }
  },
  'butter': {
    en: 'Keep refrigerated in its original wrap.',
    id: 'Simpan di kulkas dengan pembungkus aslinya.',
    sub: { en: 'Margarine or coconut oil.', id: 'Margarin atau minyak kelapa.' }
  },
  'mentega': {
    en: 'Keep refrigerated in its original wrap.',
    id: 'Simpan di kulkas dengan pembungkus aslinya.',
    sub: { en: 'Margarine or coconut oil.', id: 'Margarin atau minyak kelapa.' }
  }
};

const IngredientInfoBox: React.FC<{ language: Language; ingredient: Ingredient }> = ({ language, ingredient }) => {
  const lowerName = ingredient.name.toLowerCase();
  const info = INGREDIENT_KNOWLEDGE[lowerName] || { 
    en: 'Store in airtight container.', 
    id: 'Simpan di wadah kedap udara.' 
  };

  return (
    <div className="absolute z-50 bottom-full left-0 mb-3 w-72 bg-slate-900 text-white p-5 rounded-2xl shadow-2xl text-xs ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between items-start mb-3 border-b border-white/10 pb-2">
        <h4 className="font-bold text-orange-400 uppercase tracking-widest">{ingredient.name}</h4>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Storage Tip</p>
          <p className="leading-relaxed text-slate-200">{info[language]}</p>
        </div>
        {info.sub && (
          <div>
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-tighter mb-1">Substitutions</p>
            <p className="leading-relaxed text-slate-200">{info.sub[language]}</p>
          </div>
        )}
      </div>
      <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-slate-900 rotate-45 border-r border-b border-white/10"></div>
    </div>
  );
};

const RecipeDetails: React.FC<RecipeDetailsProps> = ({ language, recipe, onCook, onAddToShoppingList }) => {
  const [hoveredIng, setHoveredIng] = useState<string | null>(null);
  const [servings, setServings] = useState(recipe.defaultServings || 2);
  const [imgError, setImgError] = useState(false);

  const scaleFactor = servings / (recipe.defaultServings || 2);
  const fallbackUrl = `https://loremflickr.com/1200/600/food,${recipe.id}`;

  const getScaledAmount = (amountStr: string) => {
    return amountStr.replace(/(\d+(\.\d+)?)/g, (match) => {
      const num = parseFloat(match);
      const scaled = num * scaleFactor;
      return Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(2);
    });
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
      <div className="h-64 md:h-96 relative bg-slate-100">
        <img 
          src={imgError ? fallbackUrl : (recipe.imageUrl || fallbackUrl)} 
          alt={recipe.title} 
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end">
          <div className="p-8 text-white w-full">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">{recipe.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm font-semibold">
              <span className="bg-orange-500 text-white px-4 py-1.5 rounded-full">{recipe.difficulty}</span>
              <span className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full">{recipe.prepTime}</span>
              <span className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full">{Math.round(recipe.calories * scaleFactor)} kcal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1">
          <h3 className="text-xl font-bold text-slate-800 mb-2">{t(language, 'ingredients')}</h3>
          <div className="flex items-center gap-3 mb-8 bg-slate-50 p-2 rounded-2xl w-fit">
            <button onClick={() => setServings(Math.max(1, servings - 1))} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center">-</button>
            <div className="px-2 text-center">
              <span className="block text-lg font-black text-slate-800 leading-none">{servings}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t(language, 'servings')}</span>
            </div>
            <button onClick={() => setServings(Math.min(20, servings + 1))} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center">+</button>
          </div>
          <ul className="space-y-4">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-center justify-between text-slate-600 border-b border-slate-50 pb-3">
                <div className="relative group/ing">
                  <div 
                    onMouseEnter={() => setHoveredIng(ing.name)}
                    onMouseLeave={() => setHoveredIng(null)}
                    className="cursor-help py-1"
                  >
                    <span className="text-orange-500 text-sm font-black tabular-nums mr-2">{getScaledAmount(ing.amount)}</span>
                    <span className="font-bold text-slate-800 group-hover/ing:text-orange-500 transition-colors underline decoration-dotted decoration-slate-300 underline-offset-4">{ing.name}</span>
                    {hoveredIng === ing.name && <IngredientInfoBox language={language} ingredient={ing} />}
                  </div>
                </div>
                {!ing.owned && (
                  <button 
                    onClick={() => onAddToShoppingList(ing.name)} 
                    className="w-8 h-8 flex items-center justify-center bg-orange-50 text-orange-500 rounded-full hover:bg-orange-500 hover:text-white transition-all text-xl font-bold"
                  >
                    +
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="lg:col-span-2">
          <h3 className="text-xl font-bold text-slate-800 mb-6">{t(language, 'overview')}</h3>
          <p className="text-slate-600 leading-relaxed text-lg mb-10">{recipe.summary}</p>
          <div className="bg-slate-900 p-8 rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-white">
              <p className="font-bold text-2xl">{t(language, 'readyToCook')}</p>
            </div>
            <button onClick={onCook} className="px-12 py-5 bg-orange-500 text-white rounded-2xl font-black text-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-900/20">{t(language, 'launchChef')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetails;
