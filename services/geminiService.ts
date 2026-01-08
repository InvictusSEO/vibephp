
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

  console.log('[VibePHP] Model:', MODEL_NAME);

  const client = new OpenAI({
    baseURL: 'https://api.tokenfactory.nebius.com/v1/',
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });
  
  const fileContext = currentFiles
    .map(f => `File: ${f.path}\n${f.content}\n---`)
    .join('\n');
  
  const fullPrompt = `
Files:
${fileContext}

Request: ${prompt}

Instructions:
- Return COMPLETE file contents for any modified/new files
- Output ONLY JSON (no markdown, no explanations outside JSON)
- Use this exact format:

{
  "explanation": "brief description",
  "files": [
    {"path": "file.php", "content": "complete code here"}
  ]
}

Start your response with { immediately.
`;

  // Keep only last 4 messages to save tokens
  const validHistory = history
    .filter(m => !m.isLoading && m.role !== 'system')
    .slice(-4)
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
    console.log('[VibePHP] Sending request...');
    
    const response = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: messages,
      temperature: 0.3, // Lower for more consistent code
      max_tokens: 16384  // INCREASED - was 4096, now 8000
    });

    const content = response.choices[0]?.message?.content;
    console.log('[VibePHP] Response length:', content?.length);
    
    if (!content) {
      throw new Error("No content received");
    }
    
    // Clean JSON
    let cleanJson = content.trim();
    
    // Remove markdown
    cleanJson = cleanJson
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/g, '');
    
    // Extract JSON
    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No JSON object found in response");
    }
    
    cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
    
    // Fix common issues
    cleanJson = cleanJson.replace(/,(\s*[}\]])/g, '$1');
    
    console.log('[VibePHP] Cleaned JSON length:', cleanJson.length);
    
    try {
      const data = JSON.parse(cleanJson) as GeneratedFilesResponse;
      
      if (!data.files || !Array.isArray(data.files)) {
        throw new Error("Missing 'files' array");
      }
      
      if (data.files.length === 0) {
        throw new Error("'files' array is empty");
      }
      
      // Validate each file
      for (const file of data.files) {
        if (!file.path || !file.content) {
          throw new Error(`Invalid file: ${JSON.stringify(file)}`);
        }
      }
      
      console.log('[VibePHP] ✅ Success! Files:', data.files.length);
      return data;
      
    } catch (parseError: any) {
      console.error("[VibePHP] Parse Error:", parseError.message);
      console.error("[VibePHP] First 300 chars:", cleanJson.substring(0, 300));
      console.error("[VibePHP] Last 300 chars:", cleanJson.substring(Math.max(0, cleanJson.length - 300)));
      
      throw new Error(
        "Failed to parse AI response\n\n" +
        "Error: " + parseError.message + "\n\n" +
        "This usually means:\n" +
        "1. The request was too complex (try simpler)\n" +
        "2. The response was cut off (try refresh)\n" +
        "3. The model added extra text\n\n" +
        "First 200 chars of response:\n" +
        content.substring(0, 200) + "..."
      );
    }

  } catch (error: any) {
    console.error("[VibePHP] API Error:", error);
    
    if (error.status === 401) {
      throw new Error(
        "Invalid API Key\n\n" +
        "Update your key at: https://studio.nebius.ai"
      );
    }
    
    if (error.status === 404) {
      throw new Error(
        "Model Not Found\n\n" +
        `"${MODEL_NAME}" is not available.\n\n` +
        "Try changing MODEL_NAME in constants.ts to:\n" +
        "'Qwen/Qwen2.5-Coder-32B-Instruct'"
      );
    }
    
    if (error.status === 429) {
      throw new Error("Rate limit exceeded. Wait a moment and try again.");
    }
    
    if (error.status >= 500) {
      throw new Error("API temporarily unavailable. Try again in a moment.");
    }
    
    throw new Error(
      `API Error: ${error.message}\n` +
      `Status: ${error.status || 'Unknown'}`
    );
  }
};
