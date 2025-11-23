
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { NutrientTargets, DayType, Recipe, UserPreferences, MealType } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const recipeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    mealType: { type: Type.STRING, enum: ["Breakfast", "Lunch", "Dinner", "Snack"] },
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    instructions: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    macros: {
      type: Type.OBJECT,
      properties: {
        protein: { type: Type.NUMBER },
        carbs: { type: Type.NUMBER },
        fats: { type: Type.NUMBER }
      },
      required: ["protein", "carbs", "fats"]
    },
    calories: { type: Type.NUMBER },
    prepTimeMinutes: { type: Type.NUMBER },
    cookTimeMinutes: { type: Type.NUMBER },
    difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] }
  },
  required: ["name", "description", "mealType", "ingredients", "instructions", "macros", "calories", "prepTimeMinutes", "cookTimeMinutes", "difficulty"]
};

const fullDaySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    meals: {
      type: Type.ARRAY,
      items: recipeSchema
    }
  },
  required: ["meals"]
};

// Helper to generate an image for a recipe
const generateImageForRecipe = async (recipeName: string, description: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `A professional, delicious food photography shot of ${recipeName}: ${description}. High resolution, appetizing lighting.` },
        ],
      },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  } catch (error) {
    console.warn("Failed to generate image:", error);
    return undefined;
  }
};

export const generateRecipeSuggestion = async (
  remaining: NutrientTargets,
  dayType: DayType,
  preferences: UserPreferences,
  recentHistory: Recipe[],
  mealType: MealType
): Promise<Recipe> => {
  const model = "gemini-2.5-flash";

  const cuisineString = preferences.cuisines.length > 0 
    ? `Preferred cuisines: ${preferences.cuisines.join(", ")}.` 
    : "No specific cuisine preferences.";

  const restrictionString = preferences.dietaryRestrictions.length > 0
    ? `Dietary restrictions: ${preferences.dietaryRestrictions.join(", ")}.`
    : "No dietary restrictions.";

  const historyString = recentHistory.length > 0
    ? `Recently suggested/eaten recipes: ${recentHistory.slice(0, 3).map(r => r.name).join(", ")}. Try to suggest something different.`
    : "";

  const prompt = `
    I need a SINGLE SERVING ${mealType} recipe suggestion for a ${dayType} day.
    
    My remaining budget for the day is:
    - Protein: ${Math.max(0, remaining.protein)}g
    - Carbs: ${Math.max(0, remaining.carbs)}g
    - Fats: ${Math.max(0, remaining.fats)}g
    - Calories: ${Math.max(0, remaining.calories)} kcal
    
    User Profile:
    ${cuisineString}
    ${restrictionString}
    ${historyString}

    Instructions:
    1. The recipe MUST be a decent meal for ONE person.
    2. IMPORTANT: You do NOT need to use up all the remaining Carbs or Fats. 
       - If I have a lot remaining (e.g. 200g carbs), suggest a normal, healthy portion size (e.g. 60g carbs) rather than forcing an unrealistic amount.
       - The recipe just needs to fit *within* the remaining budget.
    3. However, if the remaining budget is LOW (e.g. < 20g carbs), you MUST respect that limit strictly.
    4. Prioritize high protein if the budget allows.
    5. Ensure ingredients are commonly available.
    6. Make it delicious!
    7. Set the 'mealType' field to "${mealType}".
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
        systemInstruction: "You are a world-class nutritionist and chef. You generate single-serving recipes that fit within a user's remaining macro budget. You prioritize meal quality and standard portion sizes over mathematically exhausting the budget.",
        temperature: 0.7,
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from AI");
    }
    
    const recipe = JSON.parse(text) as Recipe;

    // Generate image in parallel/sequence
    const image = await generateImageForRecipe(recipe.name, recipe.description);
    
    // Ensure mealType is set correctly
    return { ...recipe, image, mealType };

  } catch (error) {
    console.error("Error generating recipe:", error);
    throw error;
  }
};

export const generateFullDayPlan = async (
  targets: NutrientTargets,
  preferences: UserPreferences
): Promise<Recipe[]> => {
  const model = "gemini-2.5-flash";

  const cuisineString = preferences.cuisines.length > 0 
    ? `Preferred cuisines: ${preferences.cuisines.join(", ")}.` 
    : "No specific cuisine preferences.";

  const restrictionString = preferences.dietaryRestrictions.length > 0
    ? `Dietary restrictions: ${preferences.dietaryRestrictions.join(", ")}.`
    : "No dietary restrictions.";

  const prompt = `
    Generate a complete daily meal plan consisting of exactly 4 meals: Breakfast, Lunch, Dinner, and a Snack.
    
    The TOTAL combined macros of all 4 meals must hit these daily targets as closely as possible:
    - Protein: ${targets.protein}g
    - Carbs: ${targets.carbs}g
    - Fats: ${targets.fats}g
    - Calories: ${targets.calories} kcal
    
    User Preferences:
    ${cuisineString}
    ${restrictionString}

    Instructions:
    1. Distribute macros logically across the day (e.g., substantial breakfast/lunch/dinner, lighter snack).
    2. Ensure variety in ingredients.
    3. Respect dietary restrictions.
    4. Return a JSON object with a 'meals' array containing the 4 recipes.
    5. Ensure the 'mealType' field is correctly set for each recipe (Breakfast, Lunch, Dinner, Snack).
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: fullDaySchema,
        systemInstruction: "You are a world-class nutritionist. Create a balanced full-day meal plan that hits the user's macro targets perfectly.",
        temperature: 0.7,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const parsed = JSON.parse(text);
    const meals: Recipe[] = parsed.meals;

    // Generate images for all meals in parallel
    const mealsWithImages = await Promise.all(
      meals.map(async (meal) => {
        const image = await generateImageForRecipe(meal.name, meal.description);
        return { ...meal, image };
      })
    );

    return mealsWithImages;

  } catch (error) {
    console.error("Error generating full day plan:", error);
    throw error;
  }
};
