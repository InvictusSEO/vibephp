import type { GeneratedFilesResponse, Message, File } from '../types';
import { MODEL_NAME, SYSTEM_INSTRUCTION } from '../constants';

// Removed top-level import to prevent loading issues on startup
// import { GoogleGenAI, Type } from "@google/genai";

export const generateAppCode = async (
  prompt: string, 
  currentFiles: File[],
  history: Message[]
): Promise<GeneratedFilesResponse> => {
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
     throw new Error("API Key not found in process.env.API_KEY");
  }

  // DYNAMIC IMPORT STRATEGY
  // Robustly attempt to load the SDK from multiple sources to handle CDN variability.
  let GoogleGenAI, Type;
  const errors = [];

  const strategies = [
    // 1. Try Import Map (fastest if cached)
    async () => import("@google/genai"),
    // 2. Try explicit esm.sh URL (standard)
    async () => import("https://esm.sh/@google/genai@0.2.1"),
    // 3. Try bundled esm.sh URL (handles internal deps differently)
    async () => import("https://esm.sh/@google/genai@0.2.1?bundle"),
    // 4. Try JSDelivr as a last resort
    async () => import("https://esm.run/@google/genai")
  ];

  for (const strategy of strategies) {
    try {
      const module = await strategy();
      if (module && module.GoogleGenAI) {
        GoogleGenAI = module.GoogleGenAI;
        Type = module.Type;
        break; // Success!
      }
    } catch (err) {
      errors.push(err);
      console.warn("AI SDK load strategy failed, trying next...", err);
    }
  }

  if (!GoogleGenAI) {
    console.error("All AI SDK import strategies failed", errors);
    throw new Error("Failed to initialize AI SDK. Please check your internet connection and try again.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const fileContext = currentFiles.map(f => `File: ${f.path}\nContent:\n${f.content}\n---`).join('\n');
  
  const fullPrompt = `
    Current File State:
    ${fileContext}

    User Request: ${prompt}

    Generate or Update the files to satisfy the request. 
    Return the COMPLETE content for any file you modify. 
    If a file is unchanged, do not include it.
    If it is a new app, generate all necessary files.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: fullPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: {
              type: Type.STRING,
              description: "A brief explanation of the changes or the app created."
            },
            files: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  path: { type: Type.STRING, description: "Relative file path, e.g., index.php" },
                  content: { type: Type.STRING, description: "Full file content" }
                },
                required: ["path", "content"]
              }
            }
          },
          required: ["files"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as GeneratedFilesResponse;
      return data;
    }
    
    throw new Error("No response text from Gemini");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};