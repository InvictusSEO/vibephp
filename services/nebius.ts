import OpenAI from 'openai';
import { MODEL_NAME, SYSTEM_INSTRUCTION } from '../constants';
import type { Message, File } from '../types';

const createClient = (apiKey: string) => new OpenAI({
  baseURL: 'https://api.tokenfactory.nebius.com/v1/',
  apiKey: apiKey,
  dangerouslyAllowBrowser: true
});

// Fallback models
const FALLBACK_MODELS = [
  'moonshotai/Kimi-K2-Instruct',
  'deepseek-ai/DeepSeek-R1-0528',
  'Qwen/Qwen3-235B-A22B-Instruct-2507'
];

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
  
  // Enhanced Vibe framework context
  const vibeContext = `
VIBE FRAMEWORK METHODS AVAILABLE (auto-injected on server):

DATABASE:
- Vibe::db() - returns PDO instance
- Vibe::table(name) - returns prefixed table name (e.g., sess_123456_tablename)
- Vibe::select(table, where?) - SELECT rows (optional where array)
- Vibe::insert(table, data) - INSERT row, returns lastInsertId
- Vibe::update(table, data, where) - UPDATE rows
- Vibe::delete(table, where) - DELETE rows

INPUT/OUTPUT:
- Vibe::input(key, default?) - get from $_POST or $_GET
- Vibe::all() - get all $_POST + $_GET
- Vibe::json(data) - output JSON and exit
- Vibe::redirect(url) - redirect and exit

SESSION:
- Vibe::session(key, value?) - get/set session

HELPERS:
- Vibe::error(msg) - return error message
- Vibe::success(msg) - return success message

CRITICAL:
1. Vibe.php is AUTO-INJECTED - DO NOT create it
2. Always create tables: CREATE TABLE IF NOT EXISTS
3. Always use Vibe::table() for table names
4. Start index.php with: require_once 'Vibe.php';
`;
  
  const fileContext = currentFiles
    .filter(f => f.path !== 'db_config.php' && f.path !== 'Vibe.php')
    .map(f => `File: ${f.path}\n${f.content}\n---`)
    .join('\n');
  
  // Try primary model, then fallbacks
  let lastError;
  for (const model of [MODEL_NAME, ...FALLBACK_MODELS]) {
    try {
      const response = await client.chat.completions.create({
        model: model,
        messages: [
          { 
            role: "system", 
            content: SYSTEM_INSTRUCTION + "\n\n" + vibeContext 
          },
          { 
            role: "user", 
            content: `PLAN:\n${plan}\n\nEXISTING FILES:\n${fileContext}\n\nGenerate code using Vibe:: methods. Tables must be created with CREATE TABLE IF NOT EXISTS.` 
          }
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
    } catch (error: any) {
      console.warn(`Model ${model} failed:`, error.message);
      lastError = error;
      if (error.status !== 404) break; // Don't retry on non-404 errors
    }
  }
  
  throw lastError || new Error("All models failed");
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
          content: "You are a Vibe Framework Debugger. Analyze the error. Remember: 'Vibe.php' is auto-injected and handles DB/Sessions. User code should use Vibe:: methods. Explain the fix step by step." 
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
