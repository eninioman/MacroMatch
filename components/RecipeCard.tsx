
import React, { useState } from 'react';
import { Recipe } from '../types';
import { Clock, ChefHat, Flame, Activity, PlusCircle, Printer, Scale, Heart } from 'lucide-react';
import clsx from 'clsx';

interface RecipeCardProps {
  recipe: Recipe;
  onLogRecipe?: (recipe: Recipe) => void;
  onToggleFavorite?: (recipe: Recipe) => void;
  isFavorite?: boolean;
  className?: string;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ 
  recipe, 
  onLogRecipe, 
  onToggleFavorite, 
  isFavorite = false,
  className = "mt-8" 
}) => {
  const [multiplier, setMultiplier] = useState(1);

  // Helper to scale ingredient strings
  const scaleIngredient = (ingredient: string, scale: number): string => {
    if (scale === 1) return ingredient;
    // Regex matches start of string: integers, decimals, or simple fractions (e.g., "1/2")
    return ingredient.replace(/^(\d+(?:\.\d+)?|\d+\/\d+)/, (match) => {
      let amount = 0;
      if (match.includes('/')) {
          const [num, den] = match.split('/');
          amount = parseFloat(num) / parseFloat(den);
      } else {
          amount = parseFloat(match);
      }
      
      if (isNaN(amount)) return match;
      
      const newAmount = amount * scale;
      // Format to remove trailing zeros, max 2 decimals (e.g., 1.50 -> 1.5)
      return parseFloat(newAmount.toFixed(2)).toString();
    });
  };

  // derived values
  const scaledCalories = Math.round(recipe.calories * multiplier);
  const scaledMacros = {
    protein: Math.round(recipe.macros.protein * multiplier),
    carbs: Math.round(recipe.macros.carbs * multiplier),
    fats: Math.round(recipe.macros.fats * multiplier),
  };

  const handleLog = () => {
    if (onLogRecipe) {
        // Create a new recipe object with scaled values to log
        const scaledRecipe: Recipe = {
            ...recipe,
            calories: scaledCalories,
            macros: scaledMacros,
            // We append the scale note to the name so it's clear in history
            name: multiplier === 1 ? recipe.name : `${recipe.name} (${multiplier}x)`,
        };
        onLogRecipe(scaledRecipe);
    }
  };

  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl animate-fade-in recipe-card ${className}`}>
      {recipe.image && (
        <div className="w-full h-48 sm:h-64 relative overflow-hidden group">
            <img 
                src={recipe.image} 
                alt={recipe.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60 print:hidden"></div>
            {recipe.mealType && (
                <div className="absolute top-4 left-4 print:hidden">
                    <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider rounded-lg border border-white/10 shadow-lg">
                        {recipe.mealType}
                    </span>
                </div>
            )}
        </div>
      )}
      
      <div className="p-6 relative">
          {/* Meal Type Badge for Print (or no image) */}
          {(!recipe.image && recipe.mealType) && (
             <div className="mb-3">
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider rounded-lg border border-indigo-500/30">
                    {recipe.mealType}
                </span>
             </div>
          )}
          {/* Visible only on print if image exists (since overlay badge is hidden) */}
          {recipe.image && recipe.mealType && (
            <div className="hidden print:block mb-2">
                 <span className="font-bold uppercase text-sm border border-black px-2 py-1 rounded">
                    {recipe.mealType}
                </span>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl font-bold text-white mb-2">{recipe.name}</h2>
              <p className="text-slate-400 text-sm italic">{recipe.description}</p>
            </div>
            
            <div className="flex flex-col items-end gap-4 mt-4 md:mt-0 w-full md:w-auto">
                {/* Macro Badge */}
                <div className="flex items-center bg-slate-900 px-4 py-2 rounded-lg border border-slate-700 w-full md:w-auto justify-center md:justify-start">
                    <div className="mr-3 text-center">
                        <span className="block text-xs text-slate-500 uppercase font-bold">Prot</span>
                        <span className="text-lg font-bold text-emerald-400">{scaledMacros.protein}g</span>
                    </div>
                    <div className="mr-3 w-px h-8 bg-slate-700"></div>
                    <div className="mr-3 text-center">
                        <span className="block text-xs text-slate-500 uppercase font-bold">Carb</span>
                        <span className="text-lg font-bold text-blue-400">{scaledMacros.carbs}g</span>
                    </div>
                    <div className="mr-3 w-px h-8 bg-slate-700"></div>
                    <div className="text-center">
                        <span className="block text-xs text-slate-500 uppercase font-bold">Fat</span>
                        <span className="text-lg font-bold text-amber-400">{scaledMacros.fats}g</span>
                    </div>
                </div>

                {/* Actions Row */}
                <div className="flex gap-2 w-full md:w-auto items-center justify-end print:hidden">
                    {/* Portion Scaler */}
                    <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-700 mr-2">
                        <Scale className="w-4 h-4 text-indigo-400" />
                        <div className="flex flex-col w-24">
                           <div className="flex justify-between text-[10px] text-slate-400 font-medium uppercase mb-1">
                                <span>Portion</span>
                                <span className="text-white">{multiplier}x</span>
                           </div>
                           <input 
                              type="range" 
                              min="0.5" 
                              max="2" 
                              step="0.25" 
                              value={multiplier}
                              onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                           />
                        </div>
                    </div>

                    {onToggleFavorite && (
                        <button
                            onClick={() => onToggleFavorite(recipe)}
                            className={clsx(
                                "flex items-center justify-center p-2 rounded-lg font-medium transition-colors h-[42px] w-[42px]",
                                isFavorite 
                                    ? "bg-rose-500/20 text-rose-500 border border-rose-500/50 hover:bg-rose-500/30" 
                                    : "bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white"
                            )}
                            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                        >
                            <Heart className={clsx("w-5 h-5", isFavorite && "fill-current")} />
                        </button>
                    )}

                    <button
                        onClick={() => window.print()}
                        className="flex items-center justify-center p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors h-[42px] w-[42px]"
                        title="Print Recipe"
                    >
                        <Printer className="w-5 h-5" />
                    </button>

                    {onLogRecipe && (
                        <button 
                            onClick={handleLog}
                            className="flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors h-[42px]"
                        >
                            <PlusCircle className="w-5 h-5 mr-2" />
                            Log
                        </button>
                    )}
                </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center text-slate-300">
              <Clock className="w-4 h-4 mr-2 text-indigo-400" />
              <span className="text-sm">Prep: {recipe.prepTimeMinutes}m</span>
            </div>
            <div className="flex items-center text-slate-300">
              <Flame className="w-4 h-4 mr-2 text-orange-400" />
              <span className="text-sm">Cook: {recipe.cookTimeMinutes}m</span>
            </div>
            <div className="flex items-center text-slate-300">
              <Activity className="w-4 h-4 mr-2 text-red-400" />
              <span className="text-sm">{scaledCalories} kcal</span>
            </div>
            <div className="flex items-center text-slate-300">
              <ChefHat className="w-4 h-4 mr-2 text-purple-400" />
              <span className="text-sm">{recipe.difficulty}</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 border-b border-slate-700 pb-2 flex justify-between items-end">
                Ingredients 
                {multiplier !== 1 && <span className="text-xs text-indigo-400 font-normal lowercase">(scaled {multiplier}x)</span>}
              </h3>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing, idx) => (
                  <li key={idx} className="flex items-start text-slate-300 text-sm">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    <span>{scaleIngredient(ing, multiplier)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 border-b border-slate-700 pb-2">Instructions</h3>
              <ol className="space-y-4">
                {recipe.instructions.map((inst, idx) => (
                  <li key={idx} className="flex items-start text-slate-300 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold mr-3 mt-[-2px]">
                      {idx + 1}
                    </span>
                    <span>{inst}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
      </div>
    </div>
  );
};
