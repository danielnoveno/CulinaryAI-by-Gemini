
import React from 'react';
import { Language } from '../types';
import { t } from '../translations';

interface ShoppingListProps {
  language: Language;
  items: string[];
  onRemove: (index: number) => void;
  onClear: () => void;
}

const ShoppingList: React.FC<ShoppingListProps> = ({ language, items, onRemove, onClear }) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
        <h2 className="text-xl font-bold text-slate-800">{t(language, 'navShopping')}</h2>
        {items.length > 0 && (
          <button 
            onClick={onClear}
            className="text-sm text-slate-400 hover:text-red-500 transition-colors"
          >
            {t(language, 'clear')}
          </button>
        )}
      </div>
      <div className="p-6">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">{t(language, 'shoppingEmpty')}</p>
            <p className="text-xs text-slate-400 mt-1">{t(language, 'shoppingSubtitle')}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item, idx) => (
              <li 
                key={idx} 
                className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group transition-all hover:bg-orange-50"
              >
                <span className="text-slate-700 font-medium">{item}</span>
                <button 
                  onClick={() => onRemove(idx)}
                  className="p-1 text-slate-300 hover:text-red-500 transition-all"
                >
                  {t(language, 'clear')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ShoppingList;
