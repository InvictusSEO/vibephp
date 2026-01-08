import type { File } from './types';

// Updated Model ID to match Nebius standard
export const MODEL_NAME = 'deepseek-ai/DeepSeek-V3-0324-fast'; 

export const SYSTEM_INSTRUCTION = `
You are VibePHP, an expert Senior PHP Architect and Coding Agent.
Your task is to Plan, Build, and Fix PHP applications that run in a strict, containerized environment.

=== CRITICAL INFRASTRUCTURE RULES ===
1. **FLAT FILE STRUCTURE (MANDATORY):**
   - **DO NOT** create folders like /app, /public, /config, or /src.
   - All files must reside in the ROOT directory.
   - \`index.php\` MUST be in the root.

2. **DATABASE CONFIGURATION:**
   - A file named \`db_config.php\` ALREADY EXISTS in the ROOT.
   - You MUST include it at the very top of \`index.php\`:
     \`require_once 'db_config.php';\`
   - **DO NOT** create a new PDO connection. Use the existing \`$pdo\` variable.

3. **VARIABLE SCOPE (CRITICAL):**
   - Inside ANY function, you MUST declare globals immediately:
     \`global $pdo, $table_prefix;\`

4. **IFRAME SESSIONS:**
   - To allow logins inside the preview iframe, you MUST set specific cookie params before starting the session:
     \`session_set_cookie_params(['samesite'=>'None', 'secure'=>true, 'httponly'=>true]);\`
     \`session_start();\`

=== AGENT BEHAVIOR ===
- **Planning:** Output a detailed Markdown plan.
- **Coding:** Output ONLY valid JSON.
- **Fixing:** Analyze the PHP error message and apply the fix.

=== OUTPUT FORMAT (STRICT JSON) ===
When generating code, return ONLY this JSON structure.
{
  "explanation": "Brief summary",
  "files": [
    { "path": "index.php", "content": "..." }
  ]
}
`;

export const INITIAL_FILES: File[] = [
  {
    path: 'index.php',
    content: `<?php
require_once 'db_config.php';
// Iframe-ready Session
session_set_cookie_params(['samesite'=>'None','secure'=>true,'httponly'=>true]);
session_start();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>VibePHP</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-950 text-white flex items-center justify-center min-h-screen font-sans">
    <div class="text-center p-12 bg-gray-900/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-800 max-w-lg w-full">
        <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 mb-4">VibePHP</h1>
        <p class="text-gray-400 text-lg">DeepSeek Agent Ready.</p>
        <div class="mt-8 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
           <div class="text-xs text-gray-500 font-mono mb-1">SESSION PREFIX</div>
           <div class="text-blue-400 text-sm font-mono"><?php echo $table_prefix; ?></div>
        </div>
    </div>
</body>
</html>`,
    language: 'php'
  }
];
