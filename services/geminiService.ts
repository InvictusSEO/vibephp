import OpenAI from 'openai';
import type { GeneratedFilesResponse, Message, File } from '../types';
import { MODEL_NAME, SYSTEM_INSTRUCTION } from '../constants';

/**
 * Generate PHP application code using Nebius API
 * @param prompt - User's request
 * @param currentFiles - Current file state
 * @param history - Conversation history
 * @param userApiKey - API key from user (stored in localStorage)
 */
export const generateAppCode = async (
  prompt: string, 
  currentFiles: File[],
  history: Message[],
  userApiKey?: string
): Promise<GeneratedFilesResponse> => {
  
  // Get API key from parameter (passed from App component)
  const apiKey = import.meta.env.VITE_NEBIUS_API_KEY || userApiKey;
  
  if (!apiKey) {
    throw new Error(
      "API Key Required\n\n" +
      "Please enter your Nebius API key in the settings.\n\n" +
      "Get a free key at: https://studio.nebius.ai"
    );
  }

  // Initialize OpenAI client with Nebius endpoint
  const client = new OpenAI({
    baseURL: 'https://api.tokenfactory.nebius.com/v1/',
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Required for browser environment
  });
  
  // Build file context for the AI
  const fileContext = currentFiles
    .map(f => `File: ${f.path}\nContent:\n${f.content}\n---`)
    .join('\n');
  
  const fullPrompt = `
Current File State:
${fileContext}

User Request: ${prompt}

Generate or Update the files to satisfy the request. 
Return the COMPLETE content for any file you modify. 
If a file is unchanged, do not include it.
If it is a new app, generate all necessary files.

IMPORTANT: You must output strictly valid JSON. 
The response should contain ONLY the JSON object, no markdown formatting, no code blocks.

JSON Schema:
{
  "explanation": "string describing what you built",
  "files": [
    { "path": "string", "content": "string" }
  ]
}
`;

  // Filter conversation history
  const validHistory = history
    .filter(m => !m.isLoading && m.role !== 'system')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }));

  const messages = [
    { role: "system", content: SYSTEM_INSTRUCTION } as const,
    ...validHistory,
    { role: "user", content: fullPrompt } as const
  ];

  try {
    console.log('[VibePHP] Sending request to Nebius API...');
    console.log('[VibePHP] Model:', MODEL_NAME);
    
    const response = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: messages,
      temperature: 0.7,
      max_tokens: 4096
    });

    const content = response.choices[0]?.message?.content;
    console.log('[VibePHP] Response received, length:', content?.length);
    
    if (!content) {
      throw new Error("No content received from Nebius API");
    }
    
    // Clean up the response (remove markdown if present)
    let cleanJson = content.trim();
    
    // Remove markdown code blocks
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson
        .replace(/^```(?:json)?\s*/, '')
        .replace(/\s*```$/, '')
        .trim();
    }
    
    // Parse JSON
    try {
      const data = JSON.parse(cleanJson) as GeneratedFilesResponse;
      
      // Validate response structure
      if (!data.files || !Array.isArray(data.files)) {
        throw new Error("Invalid response: missing 'files' array");
      }
      
      console.log('[VibePHP] Successfully parsed, files:', data.files.length);
      return data;
      
    } catch (parseError) {
      console.error("[VibePHP] JSON Parse Error:", parseError);
      console.error("[VibePHP] Raw content:", content);
      
      throw new Error(
        "Failed to parse AI response.\n\n" +
        "The model returned invalid JSON. Try:\n" +
        "1. Making your request more specific\n" +
        "2. Breaking it into smaller steps\n" +
        "3. Checking if the request is too complex"
      );
    }

  } catch (error: any) {
    console.error("[VibePHP] API Error:", error);
    
    // Handle specific error codes
    if (error.status === 401 || error.message?.includes('401')) {
      throw new Error(
        "Invalid API Key\n\n" +
        "Your Nebius API key is incorrect or expired.\n\n" +
        "Please update your API key in settings.\n" +
        "Get a new key at: https://studio.nebius.ai"
      );
    }
    
    if (error.status === 429) {
      throw new Error(
        "Rate Limit Exceeded\n\n" +
        "Too many requests. Please wait a moment.\n\n" +
        "If this persists, check your Nebius API quota."
      );
    }
    
    if (error.status === 500 || error.status === 502 || error.status === 503) {
      throw new Error(
        "API Temporarily Unavailable\n\n" +
        "Nebius API is experiencing issues.\n" +
        "Please try again in a few moments."
      );
    }
    
    // Generic error
    throw new Error(
      `API Error: ${error.message}\n\n` +
      `Status: ${error.status || 'Unknown'}\n\n` +
      "Check your internet connection and try again."
    );
  }
};
