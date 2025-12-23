
export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard'
}

export type Language = 'en' | 'id';

export interface Ingredient {
  name: string;
  amount: string;
  owned: boolean;
}

export interface Nutrition {
  protein: number;
  fat: number;
  carbs: number;
}

export interface Recipe {
  id: string;
  title: string;
  difficulty: Difficulty;
  prepTime: string;
  calories: number;
  nutrition: Nutrition;
  estimatedCost: number;
  ingredients: Ingredient[];
  steps: string[];
  summary: string;
  imageUrl: string;
  defaultServings: number;
}

export interface AppState {
  language: Language;
  detectedIngredients: string[];
  recipes: Recipe[];
  favorites: Recipe[];
  shoppingList: string[];
  activeRecipe: Recipe | null;
  isCooking: boolean;
  filters: {
    dietary: string[];
    maxPrepTime: number;
  };
}

export type DietaryRestriction = 'None' | 'Vegetarian' | 'Vegan' | 'Keto' | 'Paleo' | 'Gluten-Free' | 'Dairy-Free';

export const DIETARY_OPTIONS: DietaryRestriction[] = [
  'None', 'Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Gluten-Free', 'Dairy-Free'
];
