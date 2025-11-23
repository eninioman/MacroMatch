
import React from 'react';
import { UserProfile, NutrientTargets } from '../types';
import { X, Save } from 'lucide-react';

interface SettingsPanelProps {
  profile: UserProfile;
  onSave: (newProfile: UserProfile) => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ profile, onSave, onClose }) => {
  const [localProfile, setLocalProfile] = React.useState<UserProfile>(profile);
  const [cuisineInput, setCuisineInput] = React.useState(profile.preferences.cuisines.join(', '));
  const [restrictionInput, setRestrictionInput] = React.useState(profile.preferences.dietaryRestrictions.join(', '));

  const calculateCalories = (p: number, c: number, f: number) => {
    return (p * 4) + (c * 4) + (f * 9);
  };

  const handleTargetChange = (
    type: 'training' | 'rest',
    field: keyof NutrientTargets,
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    
    setLocalProfile(prev => {
      const currentTarget = prev.targets[type];
      const updates: Partial<NutrientTargets> = { [field]: numValue };

      // Auto-calculate calories if a macro is changed
      if (field !== 'calories') {
        const p = field === 'protein' ? numValue : currentTarget.protein;
        const c = field === 'carbs' ? numValue : currentTarget.carbs;
        const f = field === 'fats' ? numValue : currentTarget.fats;
        updates.calories = calculateCalories(p, c, f);
      }

      return {
        ...prev,
        targets: {
          ...prev.targets,
          [type]: {
            ...prev.targets[type],
            ...updates
          }
        }
      };
    });
  };

  const handleSave = () => {
    const updatedProfile = {
        ...localProfile,
        preferences: {
            cuisines: cuisineInput.split(',').map(s => s.trim()).filter(s => s.length > 0),
            dietaryRestrictions: restrictionInput.split(',').map(s => s.trim()).filter(s => s.length > 0)
        }
    };
    onSave(updatedProfile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 relative shadow-2xl my-8">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
            <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6">User Profile & Goals</h2>

        <div className="space-y-6">
            {/* Preferences Section */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Preferences</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Preferred Cuisines (comma separated)</label>
                        <input 
                            type="text" 
                            placeholder="Italian, Japanese, Mexican..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-600"
                            value={cuisineInput}
                            onChange={(e) => setCuisineInput(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Dietary Restrictions</label>
                        <input 
                            type="text" 
                            placeholder="Vegan, Gluten-Free, Nut-Free..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-600"
                            value={restrictionInput}
                            onChange={(e) => setRestrictionInput(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Training Day Section */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-indigo-400 mb-4 flex items-center">
                    Training Day Targets
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Protein (g)</label>
                        <input 
                            type="number" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={localProfile.targets.training.protein}
                            onChange={(e) => handleTargetChange('training', 'protein', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Carbs (g)</label>
                        <input 
                            type="number" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={localProfile.targets.training.carbs}
                            onChange={(e) => handleTargetChange('training', 'carbs', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Fats (g)</label>
                        <input 
                            type="number" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={localProfile.targets.training.fats}
                            onChange={(e) => handleTargetChange('training', 'fats', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Calories (kcal)</label>
                        <input 
                            type="number" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-indigo-300 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={localProfile.targets.training.calories}
                            onChange={(e) => handleTargetChange('training', 'calories', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Rest Day Section */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center">
                    Rest Day Targets
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Protein (g)</label>
                        <input 
                            type="number" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={localProfile.targets.rest.protein}
                            onChange={(e) => handleTargetChange('rest', 'protein', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Carbs (g)</label>
                        <input 
                            type="number" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={localProfile.targets.rest.carbs}
                            onChange={(e) => handleTargetChange('rest', 'carbs', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Fats (g)</label>
                        <input 
                            type="number" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={localProfile.targets.rest.fats}
                            onChange={(e) => handleTargetChange('rest', 'fats', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Calories (kcal)</label>
                        <input 
                            type="number" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-emerald-300 font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={localProfile.targets.rest.calories}
                            onChange={(e) => handleTargetChange('rest', 'calories', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>

        <button 
            onClick={handleSave}
            className="mt-6 w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-all"
        >
            <Save className="w-5 h-5 mr-2" />
            Save Profile & Goals
        </button>
      </div>
    </div>
  );
};
