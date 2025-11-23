
export interface Macros {
  protein: number;
  carbs: number;
  fats: number;
}

export interface NutrientTargets extends Macros {
  calories: number;
}

export interface DailyTargets {
  training: NutrientTargets;
  rest: NutrientTargets;
}

export interface Recipe {
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  macros: Macros;
  calories: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timestamp?: number; // For history
  image?: string; // Base64 data URL
  mealType?: string;
  isFavorite?: boolean;
}

export type DayType = 'TRAINING' | 'REST';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface UserPreferences {
  cuisines: string[];
  dietaryRestrictions: string[];
}

export interface UserProfile {
  targets: DailyTargets;
  preferences: UserPreferences;
  history: Recipe[];
  favorites: Recipe[];
}
