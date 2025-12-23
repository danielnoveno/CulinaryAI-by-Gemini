
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Recipe, Difficulty, Language } from "../types";

/**
 * PENTING: Ganti URL ini dengan alamat folder API di hosting Anda.
 * Pastikan folder tersebut berisi file: get-recipes.php, save-recipes.php, dll.
 */
const BACKEND_API_URL = "https://domain-anda.com/api-culinary"; 

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Fungsi utilitas untuk fetch ke PHP
 */
const syncWithDatabase = async (endpoint: string, method: "GET" | "POST", data?: any) => {
  try {
    const response = await fetch(`${BACKEND_API_URL}${endpoint}`, {
      method,
      headers: { 
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn("Backend Offline: Menggunakan mode langsung ke Gemini.");
    return null;
  }
};

export const analyzeFridgeAndSuggestRecipes = async (
  base64Image: string, 
  dietaryRestrictions: string[],
  language: Language
): Promise<{ detectedIngredients: string[], recipes: Recipe[] }> => {
  
  // Gunakan 100 karakter pertama base64 sebagai ID unik/hash sederhana
  const imageHash = btoa(base64Image.substring(0, 100)); 
  
  // 1. CEK DATABASE: Apakah foto kulkas ini sudah pernah di-scan?
  const cached = await syncWithDatabase("/get-recipes.php", "POST", { hash: imageHash });
  if (cached && cached.success) {
    return cached.data;
  }

  const ai = getAI();
  const langName = language === 'id' ? 'Indonesian' : 'English';

  const systemInstruction = `
    You are a professional chef assistant. 
    Analyze the fridge image and suggest 4 unique recipes.
    Return strictly in JSON format. Language: ${langName}.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [{
      parts: [
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
        { text: "Identify ingredients and suggest recipes." }
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

  // 2. SIMPAN KE DATABASE: Simpan hasil generate agar user lain tidak perlu bayar API lagi
  await syncWithDatabase("/save-recipes.php", "POST", { 
    hash: imageHash, 
    data: generatedData 
  });

  return generatedData;
};

export const generateRecipeImage = async (prompt: string, recipeId?: string): Promise<string | null> => {
  // 1. CEK DATABASE: Apakah gambar resep ini sudah ada?
  if (recipeId) {
    const cachedImg = await syncWithDatabase(`/get-image.php?id=${recipeId}`, "GET");
    if (cachedImg && cachedImg.url) return cachedImg.url;
  }

  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Professional food photography of: ${prompt}` }] }
    });
    
    let base64 = null;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        base64 = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    // 2. UPLOAD KE HOSTING: Kirim base64 ke PHP untuk disimpan jadi file .jpg
    if (base64 && recipeId) {
      const uploadResult = await syncWithDatabase("/upload-image.php", "POST", { 
        id: recipeId, 
        image: base64 
      });
      return uploadResult?.url || base64;
    }

    return base64;
  } catch (error) {
    return null;
  }
};

export const generateStepImage = async (stepText: string, stepId?: string): Promise<string | null> => {
  // 1. CEK DATABASE
  if (stepId) {
    const cached = await syncWithDatabase(`/get-image.php?id=${stepId}`, "GET");
    if (cached && cached.url) return cached.url;
  }

  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Cooking tutorial photo: ${stepText}` }] }
    });
    
    let base64 = null;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        base64 = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    // 2. UPLOAD KE HOSTING
    if (base64 && stepId) {
       const uploadResult = await syncWithDatabase("/upload-image.php", "POST", { 
         id: stepId, 
         image: base64 
       });
       return uploadResult?.url || base64;
    }

    return base64;
  } catch (error) {
    return null;
  }
};

export const generateDynamicTips = async (ingredients: string[], recipeTitle: string | undefined, language: Language): Promise<{ title: string, content: string }[]> => {
  const ai = getAI();
  const langName = language === 'id' ? 'Indonesian' : 'English';
  
  // Prompt yang lebih kaya untuk menghasilkan tips berkualitas tinggi
  const prompt = `You are a 3-Michelin star Executive Chef. 
  Context: User has these ingredients [${ingredients.join(", ")}] and is ${recipeTitle ? `cooking '${recipeTitle}'` : 'looking at their fridge'}.
  Task: Provide 2 highly practical, advanced professional chef hacks (under 20 words each).
  Topic focus: Flavor profiling, tool usage, or food science (e.g., Maillard reaction, emulsification).
  Output: Strict JSON array of objects with 'title' and 'content' keys.
  Language: ${langName}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("AI Tips Error:", error);
    return [];
  }
};

export const speakStep = async (text: string, language: Language) => {
  const ai = getAI();
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
};
