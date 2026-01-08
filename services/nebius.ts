import OpenAI from 'openai';
import { MODEL_NAME, SYSTEM_INSTRUCTION } from '../constants';
import type { Message, File } from '../types';

const createClient = (apiKey: string) => new OpenAI({
  baseURL: 'https://api.tokenfactory.nebius.com/v1/',
  apiKey: apiKey,
  dangerouslyAllowBrowser: true
});

// 1. STREAMING PLAN (Architect Mode)
export async function streamPlan(
  prompt: string, 
  history: Message[], 
  apiKey: string, 
  onChunk: (text: string) => void
) {
  const client = createClient(apiKey);
  const messages = history.map(m => ({ role: m.role, content: m.content }));
  
  const stream = await client.chat.completions.create({
    model: MODEL_NAME,
    messages: [
      { 
        role: "system", 
        // Force the Architect to respect the Vibe Framework
        content: "You are a PHP Prototyping Architect using the Vibe Micro-Framework. Create a plan. CRITICAL: Use a FLAT file structure (root only). Dependencies: Vibe.php is built-in. Do not plan for /config or /public folders." 
      },
      ...messages,
      { role: "user", content: prompt }
    ],
    stream: true,
    temperature: 0.6
  });

  let fullText = "";
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    fullText += content;
    onChunk(fullText);
  }
  return fullText;
}

// 2. GENERATE CODE (Builder Mode)
export async function generateCode(
  plan: string,
  currentFiles: File[],
  apiKey: string
) {
  const client = createClient(apiKey);
  const fileContext = currentFiles.map(f => `File: ${f.path}\n${f.content}\n---`).join('\n');
  
  const response = await client.chat.completions.create({
    model: MODEL_NAME,
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: `Based on this plan, generate the full PHP code using Vibe:: methods:\n\n${plan}\n\nExisting Files:\n${fileContext}` }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1 
  });

  const content = response.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch (e) {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Failed to parse code response");
  }
}

// 3. STREAM FIX STRATEGY (Debugger Mode)
export async function streamFixPlan(
  error: string,
  apiKey: string,
  onChunk: (text: string) => void
) {
  const client = createClient(apiKey);
  try {
    const stream = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { 
          role: "system", 
          content: "You are a Vibe Framework Debugger. Analyze the error. Remember: 'Vibe.php' handles DB/Sessions. User code should use Vibe::db(). Explain the fix." 
        },
        { role: "user", content: `The code crashed:\n${error}\n\nHow do we fix it?` }
      ],
      stream: true
    });

    let fullText = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullText += content;
      onChunk(fullText);
    }
    return fullText;
  } catch (error: any) {
     if (error.status === 404) throw new Error(`Model '${MODEL_NAME}' not found.`);
     throw error;
  }
}
