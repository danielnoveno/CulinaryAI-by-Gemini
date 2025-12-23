
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Recipe, Difficulty, Language } from "../types";

/**
 * Fungsi pembantu untuk mendapatkan API Key secara aman dari environment.
 */
const getSafeApiKey = () => {
  try {
    // @ts-ignore
    return typeof process !== 'undefined' ? process.env.API_KEY : undefined;
  } catch (e) {
    return undefined;
  }
};

/**
 * Konfigurasi Backend URL
 */
const getBackendUrl = () => {
  try {
    // @ts-ignore
    return (typeof process !== 'undefined' && process.env.VITE_BACKEND_API_URL) || "http://localhost/api-culinary";
  } catch (e) {
    return "http://localhost/api-culinary";
  }
};

/**
 * Inisialisasi Google GenAI. 
 * Kita membuat instance baru setiap kali fungsi dipanggil untuk memastikan
 * kita menggunakan API Key paling baru (terutama setelah user memilih key via dialog).
 */
const createAIClient = () => {
  const apiKey = getSafeApiKey();
  return new GoogleGenAI({ apiKey: apiKey || "" });
};

/**
 * Sinkronisasi Database
 */
const syncWithDatabase = async (endpoint: string, method: "GET" | "POST", data?: any) => {
  const url = getBackendUrl();
  try {
    const response = await fetch(`${url}${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn("Backend Offline: Menggunakan mode Standalone AI.");
    return null;
  }
};

export const analyzeFridgeAndSuggestRecipes = async (
  base64Image: string, 
  dietaryRestrictions: string[],
  language: Language
): Promise<{ detectedIngredients: string[], recipes: Recipe[] }> => {
  
  const imageHash = btoa(base64Image.substring(0, 100)); 
  const cached = await syncWithDatabase("/get-recipes.php", "POST", { hash: imageHash });
  if (cached && cached.success) return cached.data;

  const ai = createAIClient();
  const langName = language === 'id' ? 'Indonesian' : 'English';

  const systemInstruction = `
    You are a professional Executive Chef. 
    Analyze the image and suggest 4 unique recipes.
    Return STRICT JSON. Language: ${langName}.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [{
      parts: [
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
        { text: "Analyze fridge and suggest recipes in JSON." }
      ]
    }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detectedIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
          recipes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                difficulty: { type: Type.STRING, enum: Object.values(Difficulty) },
                prepTime: { type: Type.STRING },
                calories: { type: Type.NUMBER },
                nutrition: {
                  type: Type.OBJECT,
                  properties: {
                    protein: { type: Type.NUMBER },
                    fat: { type: Type.NUMBER },
                    carbs: { type: Type.NUMBER }
                  },
                  required: ["protein", "fat", "carbs"]
                },
                estimatedCost: { type: Type.NUMBER },
                imageUrl: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
                defaultServings: { type: Type.INTEGER },
                ingredients: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      amount: { type: Type.STRING },
                      owned: { type: Type.BOOLEAN }
                    },
                    required: ["name", "amount", "owned"]
                  }
                },
                steps: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["id", "title", "difficulty", "prepTime", "calories", "nutrition", "ingredients", "steps", "imageUrl", "imagePrompt", "defaultServings"]
            }
          }
        },
        required: ["detectedIngredients", "recipes"]
      }
    }
  });

  const generatedData = JSON.parse(response.text || '{"detectedIngredients": [], "recipes": []}');
  await syncWithDatabase("/save-recipes.php", "POST", { hash: imageHash, data: generatedData });

  return generatedData;
};

export const generateRecipeImage = async (prompt: string, recipeId?: string): Promise<string | null> => {
  if (recipeId) {
    const cachedImg = await syncWithDatabase(`/get-image.php?id=${recipeId}`, "GET");
    if (cachedImg && cachedImg.url) return cachedImg.url;
  }

  const ai = createAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ text: `Professional food photography of: ${prompt}` }] 
      },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });
    
    let base64 = null;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        base64 = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (base64 && recipeId) {
      await syncWithDatabase("/upload-image.php", "POST", { id: recipeId, image: base64 });
    }

    return base64;
  } catch (error) {
    return null;
  }
};

export const generateStepImage = async (stepText: string, stepId?: string): Promise<string | null> => {
  const ai = createAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ text: `Cooking tutorial photo: ${stepText}` }] 
      },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });
    
    let base64 = null;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        base64 = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }
    return base64;
  } catch (error) {
    return null;
  }
};

export const generateDynamicTips = async (ingredients: string[], recipeTitle: string | undefined, language: Language): Promise<{ title: string, content: string }[]> => {
  const ai = createAIClient();
  const langName = language === 'id' ? 'Indonesian' : 'English';
  
  const prompt = `Advanced chef tips for ingredients: [${ingredients.join(", ")}]. JSON array with 'title' and 'content'. Language: ${langName}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    return [];
  }
};

export const speakStep = async (text: string, language: Language) => {
  const ai = createAIClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    return null;
  }
};
