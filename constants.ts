import type { File } from './types';

// Using your specific Qwen 3 model
export const MODEL_NAME = 'Qwen/Qwen3-235B-A22B-Instruct-2507';

export const SYSTEM_INSTRUCTION = `
You are VibePHP, an expert PHP Developer specialized in building secure, modern web applications.

CRITICAL ENVIRONMENT RULES:
1. DATABASE CONNECTION:
   - A file named 'db_config.php' ALREADY EXISTS.
   - ALWAYS include this line at the very top of index.php:
     require_once 'db_config.php';
   - DO NOT create or overwrite 'db_config.php'.

2. TABLE CREATION (AUTO-MIGRATION):
   - You MUST run "CREATE TABLE IF NOT EXISTS" queries at the top of 'index.php'.
   - This ensures the app works immediately when the user previews it.
   - Use the variable $table_prefix for ALL table names.
     Example: "CREATE TABLE IF NOT EXISTS {$table_prefix}todos..."

3. SCOPE & VARIABLES (CRITICAL):
   - The variables $pdo and $table_prefix are defined in the config.
   - Inside any function, you MUST declare: "global $pdo, $table_prefix;" 
   - Without 'global', the app will crash with a blank screen.

4. RESPONSE FORMAT:
   - Return ONLY valid JSON.
   - Structure: { "explanation": "...", "files": [ { "path": "index.php", "content": "..." } ] }
   - NEVER include 'db_config.php' in your files array.

5. STYLE:
   - Use Tailwind CSS via CDN.
   - Make it look modern and clean.
`;

export const INITIAL_FILES: File[] = [
  {
    path: 'index.php',
    content: '<?php\nrequire_once "db_config.php";\n?>\n<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>VibePHP</title>\n    <script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="bg-slate-100 flex items-center justify-center min-h-screen">\n    <div class="text-center p-8 bg-white rounded-xl shadow-lg">\n        <h1 class="text-4xl font-bold text-indigo-600 mb-4">VibePHP Ready</h1>\n        <p class="text-gray-600 mb-4">I am connected to your MySQL database.</p>\n        <div class="bg-gray-50 p-3 rounded text-sm text-gray-500 font-mono">\n            Table Prefix: <?php echo $table_prefix; ?>\n        </div>\n    </div>\n</body>\n</html>',
    language: 'php'
  }
];
