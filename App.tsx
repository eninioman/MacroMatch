
import React, { useState, useEffect } from 'react';
import { NutrientTargets, DailyTargets, DayType, Recipe, UserProfile, MealType } from './types';
import { generateRecipeSuggestion, generateFullDayPlan } from './services/geminiService';
import { Settings, Dumbbell, Coffee, Loader2, Sparkles, Utensils, History, Trash2, Sun, Moon, Sunrise, Cookie, CalendarDays, Printer, Heart } from 'lucide-react';
import { SettingsPanel } from './components/SettingsPanel';
import { ProgressBar } from './components/ProgressBar';
import { RecipeCard } from './components/RecipeCard';
import clsx from 'clsx';

// Initial Defaults
const DEFAULT_TARGETS: DailyTargets = {
  training: { protein: 200, carbs: 250, fats: 70, calories: 2430 },
  rest: { protein: 180, carbs: 100, fats: 80, calories: 1840 }
};

const DEFAULT_PROFILE: UserProfile = {
    targets: DEFAULT_TARGETS,
    preferences: { cuisines: [], dietaryRestrictions: [] },
    history: [],
    favorites: []
};

const MEAL_TYPES: { type: MealType; icon: React.ReactNode }[] = [
    { type: 'Breakfast', icon: <Sunrise className="w-4 h-4" /> },
    { type: 'Lunch', icon: <Sun className="w-4 h-4" /> },
    { type: 'Dinner', icon: <Moon className="w-4 h-4" /> },
    { type: 'Snack', icon: <Cookie className="w-4 h-4" /> },
];

type ActiveTab = 'suggestions' | 'history' | 'favorites';

const App: React.FC = () => {
  // --- State ---
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('userProfile');
    if (!saved) {
        const oldTargets = localStorage.getItem('macroTargets');
        // If migration from old version, we might need to fill in default calories if missing
        return oldTargets ? { ...DEFAULT_PROFILE, targets: JSON.parse(oldTargets) } : DEFAULT_PROFILE;
    }
    
    const parsed = JSON.parse(saved);
    
    // Migration Check: Ensure calories exist on loaded profile
    if (parsed.targets.training.calories === undefined) {
        parsed.targets.training.calories = 
            parsed.targets.training.protein * 4 + 
            parsed.targets.training.carbs * 4 + 
            parsed.targets.training.fats * 9;
    }
    if (parsed.targets.rest.calories === undefined) {
        parsed.targets.rest.calories = 
            parsed.targets.rest.protein * 4 + 
            parsed.targets.rest.carbs * 4 + 
            parsed.targets.rest.fats * 9;
    }
    // Migration Check: Ensure favorites exist
    if (!parsed.favorites) {
        parsed.favorites = [];
    }
    
    return parsed;
  });
  
  const [dayType, setDayType] = useState<DayType>('TRAINING');
  const [mealType, setMealType] = useState<MealType>('Lunch');
  const [consumed, setConsumed] = useState<NutrientTargets>({ protein: 0, carbs: 0, fats: 0, calories: 0 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('suggestions');
  
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [mealPlan, setMealPlan] = useState<Recipe[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Derived State ---
  const currentTarget = dayType === 'TRAINING' ? profile.targets.training : profile.targets.rest;
  const remaining: NutrientTargets = {
    protein: currentTarget.protein - consumed.protein,
    carbs: currentTarget.carbs - consumed.carbs,
    fats: currentTarget.fats - consumed.fats,
    calories: currentTarget.calories - consumed.calories,
  };

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(profile));
  }, [profile]);

  // --- Handlers ---
  const handleConsumedChange = (field: keyof NutrientTargets, value: string) => {
    const num = Math.max(0, parseInt(value) || 0);
    setConsumed(prev => ({ ...prev, [field]: num }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setRecipe(null);
    setMealPlan(null);
    setActiveTab('suggestions');
    
    try {
      const result = await generateRecipeSuggestion(remaining, dayType, profile.preferences, profile.history, mealType);
      setRecipe(result);
    } catch (err) {
      setError("Failed to generate recipe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFullDay = async () => {
    setLoading(true);
    setError(null);
    setRecipe(null);
    setMealPlan(null);
    setActiveTab('suggestions');

    try {
        const result = await generateFullDayPlan(currentTarget, profile.preferences);
        setMealPlan(result);
    } catch (err) {
        setError("Failed to generate meal plan. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const handleLogRecipe = (recipeToLog: Recipe) => {
      // Update consumed macros
      setConsumed(prev => ({
          protein: prev.protein + recipeToLog.macros.protein,
          carbs: prev.carbs + recipeToLog.macros.carbs,
          fats: prev.fats + recipeToLog.macros.fats,
          calories: prev.calories + recipeToLog.calories
      }));

      // Add to history
      setProfile(prev => ({
          ...prev,
          history: [{ ...recipeToLog, timestamp: Date.now() }, ...prev.history]
      }));
  };

  const handleToggleFavorite = (recipe: Recipe) => {
      setProfile(prev => {
          const isFav = prev.favorites.some(r => r.name === recipe.name);
          let newFavorites;
          if (isFav) {
              newFavorites = prev.favorites.filter(r => r.name !== recipe.name);
          } else {
              newFavorites = [{ ...recipe, isFavorite: true, timestamp: Date.now() }, ...prev.favorites];
          }
          return { ...prev, favorites: newFavorites };
      });
  };

  const isRecipeFavorite = (recipeName: string) => {
      return profile.favorites.some(r => r.name === recipeName);
  };

  const handleClearHistory = () => {
      if(confirm('Are you sure you want to clear your recipe history?')) {
          setProfile(prev => ({ ...prev, history: [] }));
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
                <Utensils className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">MacroMatch AI</h1>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
          >
            <span className="text-sm font-medium hidden sm:block">Profile & Goals</span>
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* Day Type Toggle */}
        <div className="grid grid-cols-2 bg-slate-900 p-1 rounded-xl mb-8 border border-slate-800 print:hidden">
          <button
            onClick={() => setDayType('TRAINING')}
            className={clsx(
              "flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all",
              dayType === 'TRAINING' 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Dumbbell className="w-4 h-4" />
            Training Day
          </button>
          <button
            onClick={() => setDayType('REST')}
            className={clsx(
              "flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all",
              dayType === 'REST' 
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Coffee className="w-4 h-4" />
            Rest Day
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start mb-8 print:hidden">
          
          {/* Input Section */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-slate-200">
                Today's Progress
                <span className="text-xs font-normal text-slate-500 px-2 py-1 bg-slate-800 rounded-md">Input consumed</span>
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Protein (Consumed)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={consumed.protein}
                    onChange={(e) => handleConsumedChange('protein', e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                  <span className="text-slate-500 font-medium">/ {currentTarget.protein}g</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Carbs (Consumed)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={consumed.carbs}
                    onChange={(e) => handleConsumedChange('carbs', e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  <span className="text-slate-500 font-medium">/ {currentTarget.carbs}g</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Fats (Consumed)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={consumed.fats}
                    onChange={(e) => handleConsumedChange('fats', e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                  />
                  <span className="text-slate-500 font-medium">/ {currentTarget.fats}g</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <label className="block text-sm font-medium text-slate-300 mb-2">Calories (Consumed)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={consumed.calories}
                    onChange={(e) => handleConsumedChange('calories', e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-semibold"
                  />
                  <span className="text-slate-400 font-medium">/ {currentTarget.calories} kcal</span>
                </div>
              </div>
            </div>
          </section>

          {/* Visualization Section */}
          <section className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
               <h2 className="text-lg font-semibold mb-6 text-slate-200">Remaining Daily Targets</h2>
               <ProgressBar 
                 label="Protein" 
                 current={consumed.protein} 
                 max={currentTarget.protein} 
                 colorClass="bg-emerald-500" 
               />
               <ProgressBar 
                 label="Carbohydrates" 
                 current={consumed.carbs} 
                 max={currentTarget.carbs} 
                 colorClass="bg-blue-500" 
               />
               <ProgressBar 
                 label="Fats" 
                 current={consumed.fats} 
                 max={currentTarget.fats} 
                 colorClass="bg-amber-500" 
               />
               <div className="mt-8 pt-4 border-t border-slate-800">
                   <ProgressBar 
                     label="Total Calories" 
                     current={consumed.calories} 
                     max={currentTarget.calories} 
                     colorClass="bg-purple-500" 
                     unit=" kcal"
                   />
               </div>
            </div>

            <div className="space-y-3">
                <label className="text-sm font-medium text-slate-400 ml-1">Select Meal Type</label>
                <div className="grid grid-cols-4 gap-2">
                    {MEAL_TYPES.map((item) => (
                        <button
                            key={item.type}
                            onClick={() => setMealType(item.type)}
                            className={clsx(
                                "flex flex-col items-center justify-center py-3 px-1 rounded-xl border transition-all duration-200",
                                mealType === item.type
                                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg scale-[1.02]"
                                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800"
                            )}
                        >
                            {item.icon}
                            <span className="text-xs font-medium mt-1.5">{item.type}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className={clsx(
                        "flex-1 py-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all shadow-lg",
                        loading 
                            ? "bg-slate-800 cursor-not-allowed text-slate-400" 
                            : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25 active:scale-[0.98]"
                    )}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin mr-2" />
                            Thinking...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2" />
                            Generate {mealType}
                        </>
                    )}
                </button>
                <button
                    onClick={handleGenerateFullDay}
                    disabled={loading}
                    className={clsx(
                        "px-4 rounded-xl font-bold transition-all shadow-lg flex flex-col items-center justify-center text-xs",
                        loading
                            ? "bg-slate-800 cursor-not-allowed text-slate-400"
                            : "bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200"
                    )}
                    title="Generate a plan for the whole day to hit targets"
                >
                    <CalendarDays className="w-5 h-5 mb-1" />
                    Full Day
                </button>
            </div>
            
            {error && (
                <div className="p-4 bg-red-900/20 border border-red-800 text-red-200 rounded-xl text-sm text-center">
                    {error}
                </div>
            )}
          </section>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-slate-800 pb-1 print:hidden">
            <button 
                onClick={() => setActiveTab('suggestions')}
                className={clsx(
                    "pb-3 px-4 text-sm font-medium transition-all relative flex items-center gap-2",
                    activeTab === 'suggestions' ? "text-white" : "text-slate-500 hover:text-slate-300"
                )}
            >
                <Sparkles className="w-4 h-4" />
                Suggestions
                {activeTab === 'suggestions' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-full"></div>}
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={clsx(
                    "pb-3 px-4 text-sm font-medium transition-all relative flex items-center gap-2",
                    activeTab === 'history' ? "text-white" : "text-slate-500 hover:text-slate-300"
                )}
            >
                <History className="w-4 h-4" />
                History
                {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-full"></div>}
            </button>
            <button 
                onClick={() => setActiveTab('favorites')}
                className={clsx(
                    "pb-3 px-4 text-sm font-medium transition-all relative flex items-center gap-2",
                    activeTab === 'favorites' ? "text-white" : "text-slate-500 hover:text-slate-300"
                )}
            >
                <Heart className="w-4 h-4" />
                Favorites
                {activeTab === 'favorites' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-full"></div>}
            </button>
        </div>

        {/* Content Area */}
        <div className="min-h-[300px]">
            {activeTab === 'suggestions' && (
                // Display Mode: Single Recipe vs Meal Plan vs Empty State
                mealPlan ? (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex items-center justify-between mb-2">
                             <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <CalendarDays className="w-5 h-5 text-indigo-400" />
                                Your Full Day Plan
                             </h3>
                             <div className="flex gap-2 print:hidden">
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-2 px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print Plan
                                </button>
                                <span className="text-sm text-slate-400 self-center">Total: {mealPlan.reduce((acc, curr) => acc + curr.calories, 0)} kcal</span>
                             </div>
                        </div>
                        {mealPlan.map((planRecipe, idx) => (
                            <RecipeCard 
                                key={idx} 
                                recipe={planRecipe} 
                                onLogRecipe={handleLogRecipe} 
                                onToggleFavorite={handleToggleFavorite}
                                isFavorite={isRecipeFavorite(planRecipe.name)}
                                className="mt-0"
                            />
                        ))}
                        <div className="flex justify-center pt-4 print:hidden">
                            <button
                                onClick={() => {
                                    mealPlan.forEach(r => handleLogRecipe(r));
                                    setMealPlan(null);
                                    setActiveTab('history');
                                }}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all"
                            >
                                Log All Meals
                            </button>
                        </div>
                    </div>
                ) : recipe ? (
                    <RecipeCard 
                        recipe={recipe} 
                        onLogRecipe={handleLogRecipe} 
                        onToggleFavorite={handleToggleFavorite}
                        isFavorite={isRecipeFavorite(recipe.name)}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 border border-dashed border-slate-800 rounded-2xl print:hidden animate-fade-in">
                        <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                        <p>Enter your consumed macros and click "Generate"</p>
                    </div>
                )
            )}

            {activeTab === 'history' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center print:hidden">
                        <h3 className="text-lg font-semibold text-slate-200">Logged Meals</h3>
                        {profile.history.length > 0 && (
                            <button onClick={handleClearHistory} className="text-xs text-red-400 hover:text-red-300 flex items-center">
                                <Trash2 className="w-3 h-3 mr-1" /> Clear History
                            </button>
                        )}
                    </div>
                    
                    {profile.history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500 border border-dashed border-slate-800 rounded-2xl print:hidden">
                            <History className="w-12 h-12 mb-4 opacity-20" />
                            <p>No meals logged yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {profile.history.map((histRecipe, index) => (
                                <div key={index} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                    <div className="flex items-start gap-3">
                                        {histRecipe.image && (
                                            <img src={histRecipe.image} alt={histRecipe.name} className="w-16 h-16 rounded-md object-cover border border-slate-700" />
                                        )}
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-white">{histRecipe.name}</h4>
                                                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                                                    {histRecipe.calories} kcal
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-400 flex gap-3">
                                                <span>P: {histRecipe.macros.protein}g</span>
                                                <span>C: {histRecipe.macros.carbs}g</span>
                                                <span>F: {histRecipe.macros.fats}g</span>
                                                <span className="text-slate-600">•</span>
                                                <span>{new Date(histRecipe.timestamp || 0).toLocaleDateString()} {new Date(histRecipe.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3 sm:mt-0 print:hidden">
                                        <button 
                                            onClick={() => handleToggleFavorite(histRecipe)}
                                            className={clsx(
                                                "p-2 rounded-lg transition-colors",
                                                isRecipeFavorite(histRecipe.name) ? "text-rose-500 hover:bg-rose-500/20" : "text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                                            )}
                                            title="Toggle Favorite"
                                        >
                                            <Heart className={clsx("w-5 h-5", isRecipeFavorite(histRecipe.name) && "fill-current")} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'favorites' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center print:hidden">
                         <h3 className="text-lg font-semibold text-slate-200">Favorite Recipes</h3>
                    </div>

                    {profile.favorites.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500 border border-dashed border-slate-800 rounded-2xl print:hidden">
                            <Heart className="w-12 h-12 mb-4 opacity-20" />
                            <p>No favorites yet. Click the heart on a recipe to save it.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {profile.favorites.map((favRecipe, index) => (
                                <RecipeCard 
                                    key={index} 
                                    recipe={favRecipe} 
                                    onLogRecipe={handleLogRecipe} 
                                    onToggleFavorite={handleToggleFavorite}
                                    isFavorite={true}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>

      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsPanel 
            profile={profile} 
            onClose={() => setIsSettingsOpen(false)}
            onSave={(newProfile) => {
                setProfile(newProfile);
                setIsSettingsOpen(false);
            }}
        />
      )}
    </div>
  );
};

export default App;
