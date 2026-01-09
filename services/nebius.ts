import OpenAI from 'openai';
import { MODEL_NAME, SYSTEM_INSTRUCTION, FIX_INSTRUCTION } from '../constants';
import type { Message, File, FixResponse, ErrorDetails } from '../types';

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
  const messages = history
    .filter(m => !m.isLoading)
    .slice(-6)
    .map(m => ({ role: m.role, content: m.content }));
  
  const stream = await client.chat.completions.create({
    model: MODEL_NAME,
    messages: [
      { 
        role: "system", 
        content: "You are a PHP Architect using the Vibe Micro-Framework. Create a detailed plan for the app. CRITICAL: Use a FLAT file structure (root only). All files go in the root directory. Vibe.php is built-in and auto-injected. Plan to create database tables FIRST before using them." 
      },
      ...messages,
      { role: "user", content: prompt }
    ],
    stream: true,
    temperature: 0.6,
    max_tokens: 2000
  });

  let fullText = "";
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    fullText += content;
    onChunk(fullText);
  }
  return fullText;
}

// 2. GENERATE CODE (Builder Mode) - Enhanced with validation
export async function generateCode(
  plan: string,
  currentFiles: File[],
  apiKey: string
) {
  const client = createClient(apiKey);
  
  const vibeContext = `
VIBE FRAMEWORK - CRITICAL REMINDERS:

✅ Vibe.php is AUTO-INJECTED (DO NOT CREATE IT)
✅ Start index.php with: require_once 'Vibe.php';
✅ Create ALL tables with CREATE TABLE IF NOT EXISTS
✅ Always use Vibe::table('name') for table references
✅ Wrap database operations in try-catch blocks
✅ All files go in ROOT directory (no subfolders)

EXAMPLE TABLE CREATION (ALWAYS DO THIS FIRST):
\`\`\`php
<?php
require_once 'Vibe.php';

try {
    Vibe::db()->exec("CREATE TABLE IF NOT EXISTS " . Vibe::table('users') . " (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
} catch (Exception $e) {
    die("Error: " . $e->getMessage());
}

// Now safe to use the table
$users = Vibe::select('users');
?>
\`\`\`
`;
  
  const fileContext = currentFiles
    .filter(f => f.path !== 'db_config.php' && f.path !== 'Vibe.php')
    .map(f => `File: ${f.path}\n${f.content}\n---`)
    .join('\n');
  
  // Try primary model, then fallbacks
  let lastError;
  for (const model of [MODEL_NAME, ...FALLBACK_MODELS]) {
    try {
      console.log(`[VibePHP] Attempting code generation with: ${model}`);
      
      const response = await client.chat.completions.create({
        model: model,
        messages: [
          { 
            role: "system", 
            content: SYSTEM_INSTRUCTION + "\n\n" + vibeContext 
          },
          { 
            role: "user", 
            content: `PLAN:\n${plan}\n\nEXISTING FILES:\n${fileContext}\n\nIMPORTANT: Create ALL database tables with CREATE TABLE IF NOT EXISTS at the top of index.php. Use Vibe::table() for all table names. Return valid JSON only.` 
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 8000
      });

      const content = response.choices[0]?.message?.content || "{}";
      
      // Parse and validate
      let result;
      try {
        result = JSON.parse(content);
      } catch (e) {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          result = JSON.parse(match[0]);
        } else {
          throw new Error("Failed to parse JSON response");
        }
      }
      
      // Validate the response
      if (!result.files || !Array.isArray(result.files) || result.files.length === 0) {
        throw new Error("Invalid response: no files generated");
      }
      
      // Post-process: Remove any Vibe.php or db_config.php files
      result.files = result.files.filter((f: any) => 
        f.path !== 'Vibe.php' && f.path !== 'db_config.php'
      );
      
      // Validate index.php exists and has require_once
      const indexFile = result.files.find((f: any) => f.path === 'index.php');
      if (!indexFile) {
        throw new Error("No index.php file generated");
      }
      
      if (!indexFile.content.includes("require_once 'Vibe.php'")) {
        // Auto-fix: Add require_once at the top
        indexFile.content = "<?php\nrequire_once 'Vibe.php';\n" + 
          indexFile.content.replace(/^<\?php\s*/, '');
      }
      
      console.log(`[VibePHP] ✅ Code generated successfully with ${model}`);
      return result;
      
    } catch (error: any) {
      console.warn(`[VibePHP] Model ${model} failed:`, error.message);
      lastError = error;
      
      // Don't retry on non-404 errors
      if (error.status && error.status !== 404) {
        break;
      }
    }
  }
  
  throw lastError || new Error("All models failed to generate code");
}

// 3. STREAM FIX STRATEGY (Debugger Mode) - DEPRECATED, replaced with generateFix
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
          content: "You are a Vibe Framework Debugger. Analyze the error and explain how to fix it step by step. Remember: Vibe.php is auto-injected. User code should use Vibe:: methods." 
        },
        { role: "user", content: `Error encountered:\n${error}\n\nExplain the fix.` }
      ],
      stream: true,
      temperature: 0.3
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

// NEW: Generate actual code fixes (not just explanations)
export async function generateFix(
  errorDetails: ErrorDetails,
  brokenFile: File,
  apiKey: string
): Promise<FixResponse> {
  const client = createClient(apiKey);
  
  const errorContext = `
FILE: ${errorDetails.file}
LINE: ${errorDetails.line || 'Unknown'}
ERROR TYPE: ${errorDetails.type}
ERROR MESSAGE: ${errorDetails.message}

PROBLEMATIC CODE:
${errorDetails.code || 'Not available'}

FULL FILE CONTENT:
${brokenFile.content}

${errorDetails.stackTrace ? `STACK TRACE:\n${errorDetails.stackTrace}` : ''}
`;

  try {
    console.log(`[VibePHP] Generating fix for ${errorDetails.type} error in ${errorDetails.file}`);
    
    const response = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: FIX_INSTRUCTION },
        { role: "user", content: errorContext }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 3000
    });

    const content = response.choices[0]?.message?.content || "{}";
    
    let fixResponse: FixResponse;
    try {
      fixResponse = JSON.parse(content);
    } catch (e) {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        fixResponse = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse fix response");
      }
    }
    
    // Validate fix response
    if (!fixResponse.fix || !fixResponse.fix.patches || fixResponse.fix.patches.length === 0) {
      throw new Error("Invalid fix response: no patches provided");
    }
    
    console.log(`[VibePHP] ✅ Fix generated with ${fixResponse.fix.patches.length} patches`);
    return fixResponse;
    
  } catch (error: any) {
    console.error('[VibePHP] Fix generation failed:', error);
    throw new Error(`Failed to generate fix: ${error.message}`);
  }
}

// NEW: Parse error from backend response
export function parseError(backendError: any): ErrorDetails {
  // If backend already provides structured error
  if (backendError.errorType && backendError.file) {
    return {
      type: backendError.errorType,
      file: backendError.file,
      line: backendError.line,
      code: backendError.code,
      message: backendError.error || backendError.message,
      stackTrace: backendError.stackTrace,
      suggestion: backendError.suggestion
    };
  }
  
  // Otherwise, parse from error string
  const errorText = backendError.error || backendError.message || String(backendError);
  
  // Try to extract file and line from error message
  const fileLineMatch = errorText.match(/in ([\w\.\/]+) on line (\d+)/i);
  const file = fileLineMatch ? fileLineMatch[1] : 'index.php';
  const line = fileLineMatch ? parseInt(fileLineMatch[2]) : undefined;
  
  // Determine error type
  let type: ErrorDetails['type'] = 'unknown';
  if (errorText.match(/parse error|syntax error/i)) type = 'syntax';
  else if (errorText.match(/table.*doesn't exist|sql|database/i)) type = 'database';
  else if (errorText.match(/undefined method|undefined function|class.*not found/i)) type = 'framework';
  else if (errorText.match(/undefined variable|division by zero/i)) type = 'runtime';
  
  return {
    type,
    file,
    line,
    message: errorText,
    code: undefined,
    stackTrace: backendError.stackTrace,
    suggestion: undefined
  };
}

// NEW: Apply patches to file content
export function applyPatches(originalContent: string, patches: FixResponse['fix']['patches']): string {
  const lines = originalContent.split('\n');
  
  // Sort patches by line number (descending) to avoid line number shifts
  const sortedPatches = [...patches].sort((a, b) => b.lineNumber - a.lineNumber);
  
  for (const patch of sortedPatches) {
    const lineIndex = patch.lineNumber - 1; // Convert to 0-based index
    
    if (lineIndex < 0 || lineIndex >= lines.length) {
      console.warn(`[VibePHP] Patch line ${patch.lineNumber} out of range, skipping`);
      continue;
    }
    
    const currentLine = lines[lineIndex].trim();
    const expectedOldLine = patch.oldCode.trim();
    
    // Verify the line matches what we expect
    if (currentLine !== expectedOldLine) {
      console.warn(`[VibePHP] Line ${patch.lineNumber} doesn't match expected content`);
      console.warn(`Expected: "${expectedOldLine}"`);
      console.warn(`Found: "${currentLine}"`);
      
      // Try fuzzy match (remove whitespace)
      if (currentLine.replace(/\s+/g, '') === expectedOldLine.replace(/\s+/g, '')) {
        console.log(`[VibePHP] Fuzzy match successful, applying patch`);
      } else {
        console.warn(`[VibePHP] Skipping patch due to mismatch`);
        continue;
      }
    }
    
    // Apply the patch
    const indentation = lines[lineIndex].match(/^\s*/)?.[0] || '';
    lines[lineIndex] = indentation + patch.newCode.trim();
    
    console.log(`[VibePHP] ✅ Applied patch at line ${patch.lineNumber}`);
  }
  
  return lines.join('\n');
}
