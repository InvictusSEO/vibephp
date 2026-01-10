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
        content: "You are a PHP Architect using the Vibe Micro-Framework. Create a detailed plan for the app. CRITICAL: Use a FLAT file structure (root only). All files go in the root directory. Vibe.php is built-in and auto-injected. Plan to create database tables FIRST before using them. Every table must be created with CREATE TABLE IF NOT EXISTS at the very top of index.php."
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
✅ Create ALL tables with CREATE TABLE IF NOT EXISTS at the VERY TOP
✅ Always use Vibe::table('name') for table references in ALL queries
✅ Wrap database operations in try-catch blocks
✅ All files go in ROOT directory (no subfolders)

EXAMPLE TABLE CREATION (ALWAYS DO THIS FIRST):
\`\`\`php
<?php
require_once 'Vibe.php';

// CREATE ALL TABLES FIRST - THIS MUST BE AT THE TOP
try {
    Vibe::db()->exec("CREATE TABLE IF NOT EXISTS " . Vibe::table('users') . " (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    
    Vibe::db()->exec("CREATE TABLE IF NOT EXISTS " . Vibe::table('posts') . " (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
} catch (Exception $e) {
    die("Error: " . $e->getMessage());
}

// Now safe to use the tables
$users = Vibe::select('users');
?>
\`\`\`

CRITICAL: CREATE TABLE statements must come BEFORE any Vibe::select, Vibe::insert, Vibe::update, or Vibe::delete calls!
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
            content: `PLAN:\n${plan}\n\nEXISTING FILES:\n${fileContext}\n\nIMPORTANT: 
1. Create ALL database tables with CREATE TABLE IF NOT EXISTS at the VERY TOP of index.php (right after require_once)
2. Use Vibe::table('tablename') for ALL table references
3. Wrap CREATE TABLE statements in try-catch
4. Return valid JSON only.`
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

      // NEW: Validate database operations
      const validation = validateDatabaseCode(result.files);
      if (!validation.isValid) {
        console.warn('[VibePHP] Database validation issues:', validation.errors);
        // Log warnings but don't throw - the fix system will handle it
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
${errorDetails.suggestion ? `\nSUGGESTION:\n${errorDetails.suggestion}` : ''}
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

// NEW: Parse error from backend response (Enhanced with MySQL detection)
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
  const fileLineMatch = errorText.match(/in ([\w./]+) on line (\d+)/i);
  const file = fileLineMatch ? fileLineMatch[1] : 'index.php';
  const line = fileLineMatch ? parseInt(fileLineMatch[2]) : undefined;

  // Extract problematic code snippet if available
  let code = undefined;
  const codeMatch = errorText.match(/near '(.*)' at line/i);
  if (codeMatch) {
    code = codeMatch[1];
  }

  // Determine error type with enhanced MySQL detection
  let type: ErrorDetails['type'] = 'unknown';
  let suggestion = undefined;

  // Database errors - ENHANCED
  if (errorText.match(/table.*doesn't exist/i)) {
    type = 'database';
    const tableMatch = errorText.match(/Table ['"]?(\w+)['"]? doesn't exist/i);
    if (tableMatch) {
      const fullTableName = tableMatch[1];
      // Remove session prefix (e.g., sess_12345_users -> users)
      const tableName = fullTableName.replace(/^[a-z0-9]+[0-9]+/, '');
      suggestion = `Missing table '${tableName}'. Add this at the top of index.php (after require_once):\n\nVibe::db()->exec("CREATE TABLE IF NOT EXISTS " . Vibe::table('${tableName}') . " (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  -- add your columns here\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n)");`;
    }
  } else if (errorText.match(/unknown column/i)) {
    type = 'database';
    const columnMatch = errorText.match(/Unknown column '(.*)' in/i);
    if (columnMatch) {
      suggestion = `Column '${columnMatch[1]}' doesn't exist. Check your CREATE TABLE statement or SELECT/INSERT queries.`;
    }
  } else if (errorText.match(/syntax error.*sql/i) || errorText.match(/you have an error in your sql syntax/i)) {
    type = 'database';
    suggestion = 'SQL syntax error. Check your CREATE TABLE or query syntax. Common issues:\n- Missing quotes around strings\n- Wrong column types\n- Missing commas between columns\n- Using reserved MySQL keywords without backticks';
  } else if (errorText.match(/duplicate entry/i)) {
    type = 'database';
    suggestion = 'Trying to insert duplicate value in UNIQUE column. Check your data or remove UNIQUE constraint.';
  }
  // Syntax errors
  else if (errorText.match(/parse error|syntax error|unexpected/i)) {
    type = 'syntax';
    const unexpected = errorText.match(/unexpected '(.*)'/i)?.[1];
    suggestion = unexpected
      ? `Unexpected '${unexpected}'. Check for:\n- Missing semicolons\n- Unmatched quotes or brackets\n- Wrong syntax`
      : 'PHP syntax error. Check for missing semicolons, unmatched brackets, or quotes.';
  }
  // Framework errors
  else if (errorText.match(/undefined method.*Vibe::/i)) {
    type = 'framework';
    const methodMatch = errorText.match(/Vibe::(\w+)/i);
    if (methodMatch) {
      const wrongMethod = methodMatch[1];
      const correctMethods = ['db', 'table', 'select', 'insert', 'update', 'delete', 'input', 'all', 'json', 'redirect', 'session', 'error', 'success'];
      const similar = correctMethods.find(m => m.toLowerCase().includes(wrongMethod.toLowerCase()) || wrongMethod.toLowerCase().includes(m.toLowerCase()));
      suggestion = similar
        ? `Did you mean 'Vibe::${similar}'? Available methods: ${correctMethods.join(', ')}`
        : `Method 'Vibe::${wrongMethod}' doesn't exist. Available: ${correctMethods.join(', ')}`;
    }
  } else if (errorText.match(/class.*vibe.*not found/i)) {
    type = 'framework';
    suggestion = "Add 'require_once \"Vibe.php\";' at the very top of your PHP file (right after <?php)";
  }
  // Runtime errors
  else if (errorText.match(/undefined variable/i)) {
    type = 'runtime';
    const varMatch = errorText.match(/Undefined variable: (\w+)/i);
    if (varMatch) {
      suggestion = `Variable $${varMatch[1]} is used before being defined. Initialize it first or check for typos.`;
    }
  } else if (errorText.match(/division by zero/i)) {
    type = 'runtime';
    suggestion = 'Division by zero. Add a check before dividing.';
  }

  return {
    type,
    file,
    line,
    message: errorText,
    code,
    stackTrace: backendError.stackTrace,
    suggestion
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

// NEW: Validate database operations in generated code
export function validateDatabaseCode(files: File[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const indexFile = files.find(f => f.path === 'index.php');

  if (!indexFile) {
    return { isValid: true, errors: [] }; // No index.php to validate
  }

  const content = indexFile.content;

  // Check 1: Has require_once 'Vibe.php'
  if (!content.includes("require_once 'Vibe.php'") && !content.includes('require_once "Vibe.php"')) {
    errors.push("Missing 'require_once \"Vibe.php\";' at the top of index.php");
  }

  // Check 2: Find all table names used in queries
  const tableUsages: Set<string> = new Set();

  // Match Vibe::select('tablename'
  const selectMatches = content.matchAll(/Vibe::select\(['"](.*?)['"]/g);
  for (const match of selectMatches) {
    tableUsages.add(match[1]);
  }

  // Match Vibe::insert('tablename'
  const insertMatches = content.matchAll(/Vibe::insert\(['"](.*?)['"]/g);
  for (const match of insertMatches) {
    tableUsages.add(match[1]);
  }

  // Match Vibe::update('tablename'
  const updateMatches = content.matchAll(/Vibe::update\(['"](.*?)['"]/g);
  for (const match of updateMatches) {
    tableUsages.add(match[1]);
  }

  // Match Vibe::delete('tablename'
  const deleteMatches = content.matchAll(/Vibe::delete\(['"](.*?)['"]/g);
  for (const match of deleteMatches) {
    tableUsages.add(match[1]);
  }

  // Check 3: Verify each table has CREATE TABLE statement
  for (const table of tableUsages) {
    const createTablePattern = new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS.*Vibe::table\\(['"]${table}['"]\\)`, 'i');
    if (!createTablePattern.test(content)) {
      errors.push(`Table '${table}' is used but never created. Add CREATE TABLE statement for '${table}' at the top of index.php.`);
    }
  }

  return { isValid: errors.length === 0, errors };
}
