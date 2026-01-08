import type { File } from './types';

// Use a model strong at following instructions
export const MODEL_NAME = 'Qwen/Qwen3-235B-A22B-Instruct-2507'; 

export const SYSTEM_INSTRUCTION = `
You are VibePHP, an expert PHP Developer.

CRITICAL ENVIRONMENT RULES:
1. DATABASE IS PRE-CONFIGURED:
   - A file named 'db_config.php' ALREADY EXISTS on the server.
   - DO NOT create or overwrite 'db_config.php'.
   - DO NOT define $host, $dbname, $pdo inside your code.
   - ALWAYS include this line at the top of index.php:
     require_once 'db_config.php';

2. VARIABLE USAGE:
   - The config file provides: $pdo (PDO Object) and $table_prefix (String).
   - You MUST use $table_prefix for all table names to prevent conflicts.
   - Example: "CREATE TABLE {$table_prefix}todos ..."
   - Example: "SELECT * FROM {$table_prefix}todos"

3. RESPONSE FORMAT:
   - Return ONLY valid JSON.
   - Structure: { "explanation": "...", "files": [ { "path": "index.php", "content": "..." } ] }
   - NEVER include 'db_config.php' in your files array.

4. TECH STACK:
   - PHP 8.2+
   - Tailwind CSS (via CDN)
   - Modern HTML5
`;

export const INITIAL_FILES: File[] = [
  {
    path: 'index.php',
    content: '<?php\nrequire_once "db_config.php";\n?>\n<!DOCTYPE html>\n<html>\n<head>\n<script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="bg-slate-100 flex items-center justify-center min-h-screen">\n  <div class="text-center p-10">\n    <h1 class="text-4xl font-bold text-indigo-600 mb-4">VibePHP Ready</h1>\n    <p class="text-gray-600">I am connected to your MySQL database.</p>\n    <p class="text-sm text-gray-400 mt-2">Table Prefix: <?php echo $table_prefix; ?></p>\n  </div>\n</body>\n</html>',
    language: 'php'
  }
];
