import OpenAI from 'openai';
import type { GeneratedFilesResponse, Message, File } from '../types';
import { MODEL_NAME, SYSTEM_INSTRUCTION } from '../constants';

export const generateAppCode = async (
  prompt: string, 
  currentFiles: File[],
  history: Message[],
  userApiKey?: string
): Promise<GeneratedFilesResponse> => {
  
  const apiKey = import.meta.env.VITE_NEBIUS_API_KEY || userApiKey;
  
  if (!apiKey) {
    throw new Error(
      "API Key Required\n\n" +
      "Please enter your Nebius API key in the settings.\n\n" +
      "Get a free key at: https://studio.nebius.ai"
    );
  }

  console.log('[VibePHP] Using API key from:', import.meta.env.VITE_NEBIUS_API_KEY ? 'environment' : 'user input');
  console.log('[VibePHP] Model:', MODEL_NAME);

  const client = new OpenAI({
    baseURL: 'https://api.tokenfactory.nebius.com/v1/',
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });
  
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

CRITICAL INSTRUCTIONS FOR JSON OUTPUT:
1. You MUST respond with ONLY a JSON object
2. DO NOT include any markdown formatting (no \`\`\`json)
3. DO NOT include any explanation before or after the JSON
4. DO NOT include any text outside the JSON object
5. Start your response immediately with { and end with }

Required JSON format (nothing else):
{
  "explanation": "Brief description of what you built",
  "files": [
    { "path": "filename.php", "content": "complete file content here" }
  ]
}

Remember: ONLY JSON, no other text!
`;

  // Only keep last 3 conversation turns to avoid token limits
  const validHistory = history
    .filter(m => !m.isLoading && m.role !== 'system')
    .slice(-6) // Last 3 exchanges (user + assistant)
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
    
    // Aggressive JSON extraction
    let cleanJson = content.trim();
    
    // Remove markdown code blocks
    cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/g, '');
    
    // Remove any text before first {
    const firstBrace = cleanJson.indexOf('{');
    if (firstBrace > 0) {
      cleanJson = cleanJson.substring(firstBrace);
    }
    
    // Remove any text after last }
    const lastBrace = cleanJson.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace < cleanJson.length - 1) {
      cleanJson = cleanJson.substring(0, lastBrace + 1);
    }
    
    // Try to fix common JSON issues
    cleanJson = cleanJson
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .trim();
    
    console.log('[VibePHP] Cleaned JSON (first 200 chars):', cleanJson.substring(0, 200));
    
    // Parse JSON
    try {
      const data = JSON.parse(cleanJson) as GeneratedFilesResponse;
      
      if (!data.files || !Array.isArray(data.files)) {
        throw new Error("Invalid response: missing 'files' array");
      }
      
      if (data.files.length === 0) {
        throw new Error("Invalid response: 'files' array is empty");
      }
      
      console.log('[VibePHP] Successfully parsed, files:', data.files.length);
      return data;
      
    } catch (parseError) {
      console.error("[VibePHP] JSON Parse Error:", parseError);
      console.error("[VibePHP] Raw content (first 500 chars):", content.substring(0, 500));
      console.error("[VibePHP] Cleaned JSON (first 500 chars):", cleanJson.substring(0, 500));
      
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*"files"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extracted = JSON.parse(jsonMatch[0]) as GeneratedFilesResponse;
          if (extracted.files && Array.isArray(extracted.files)) {
            console.log('[VibePHP] Recovered JSON from regex match');
            return extracted;
          }
        } catch (e) {
          console.error('[VibePHP] Failed to parse regex match');
        }
      }
      
      throw new Error(
        "Failed to parse AI response.\n\n" +
        "The model returned invalid JSON.\n\n" +
        "Raw response preview:\n" +
        content.substring(0, 200) + "...\n\n" +
        "Try:\n" +
        "1. Simplifying your request\n" +
        "2. Starting a new conversation (refresh page)\n" +
        "3. Using shorter, clearer instructions"
      );
    }

  } catch (error: any) {
    console.error("[VibePHP] API Error:", error);
    
    if (error.status === 401 || error.message?.includes('401')) {
      throw new Error(
        "Invalid API Key\n\n" +
        "Your Nebius API key is incorrect or expired.\n\n" +
        "Please update your API key in GitHub Secrets.\n" +
        "Get a new key at: https://studio.nebius.ai"
      );
    }
    
    if (error.status === 404) {
      throw new Error(
        "Model Not Found (404)\n\n" +
        `The model "${MODEL_NAME}" doesn't exist or isn't available.\n\n` +
        "Please check your constants.ts file and verify the model name."
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
    
    throw new Error(
      `API Error: ${error.message}\n\n` +
      `Status: ${error.status || 'Unknown'}\n\n` +
      "Check your internet connection and try again."
    );
  }
};
