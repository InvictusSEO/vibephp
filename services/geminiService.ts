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
    throw new Error("API Key Required\n\nGet one at: https://studio.nebius.ai");
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

Return ONLY valid JSON. In the content field, properly escape special characters.

Format:
{
  "explanation": "brief description",
  "files": [{"path": "file.php", "content": "code here"}]
}
`;

  const validHistory = history
    .filter(m => !m.isLoading && m.role !== 'system')
    .slice(-4)
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

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
      temperature: 0.3,
      max_tokens: 8000
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content received");
    }
    
    console.log('[VibePHP] Response length:', content.length);
    
    // Clean JSON
    let cleanJson = content
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/g, '');
    
    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No JSON found");
    }
    
    cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
    
    // Try to parse - if it fails, use recovery
    let result: GeneratedFilesResponse;
    
    try {
      result = JSON.parse(cleanJson);
      console.log('[VibePHP] ✅ Direct parse successful');
    } catch (parseError: any) {
      console.log('[VibePHP] Parse failed:', parseError.message);
      console.log('[VibePHP] Attempting recovery...');
      
      // RECOVERY: Extract data with regex
      const explanationMatch = cleanJson.match(/"explanation"\s*:\s*"([^"]+)"/);
      const explanation = explanationMatch ? explanationMatch[1] : "Generated code";
      
      const files: Array<{path: string, content: string}> = [];
      
      // Find each file entry
      const fileRegex = /\{\s*"path"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g;
      let match;
      
      while ((match = fileRegex.exec(cleanJson)) !== null) {
        const path = match[1];
        let rawContent = match[2];
        
        // Unescape content
        const content = rawContent
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\r/g, '\r')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
        
        files.push({ path, content });
      }
      
      if (files.length === 0) {
        // If regex didn't work, throw original error
        throw new Error(
          `Parse failed: ${parseError.message}\n\n` +
          `Response preview:\n${content.substring(0, 300)}...`
        );
      }
      
      console.log('[VibePHP] ✅ Recovered', files.length, 'files');
      result = { explanation, files };
    }
    
    // Validate result
    if (!result.files || !Array.isArray(result.files) || result.files.length === 0) {
      throw new Error("Invalid response structure");
    }
    
    for (const file of result.files) {
      if (!file.path || file.content === undefined) {
        throw new Error(`Invalid file: ${file.path}`);
      }
    }
    
    console.log('[VibePHP] ✅ Returning', result.files.length, 'files');
    return result;

  } catch (error: any) {
    console.error("[VibePHP] Error:", error);
    
    if (error.status === 401) {
      throw new Error("Invalid API Key");
    }
    if (error.status === 404) {
      throw new Error(`Model "${MODEL_NAME}" not found`);
    }
    if (error.status === 429) {
      throw new Error("Rate limit exceeded");
    }
    if (error.status >= 500) {
      throw new Error("API unavailable");
    }
    
    throw error;
  }
};
