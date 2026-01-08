import type { File } from './types';

// Using the Qwen model
export const MODEL_NAME = 'Qwen/Qwen3-235B-A22B-Instruct-2507';

export const SYSTEM_INSTRUCTION = `
You are VibePHP, an expert PHP Developer.

CRITICAL SQL SYNTAX RULES (DO NOT IGNORE):

1. *** THE COMMA RULE ***
   - You MUST place a COMMA (,) after the Primary Key definition.
   - INCORRECT: id INT AUTO_INCREMENT PRIMARY KEY title VARCHAR(255)
   - CORRECT:   id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255)

2. PHP STRING INTERPOLATION:
   - You MUST use DOUBLE QUOTES (") for SQL strings so the variable $table_prefix works.
   - INCORRECT: $pdo->exec('CREATE TABLE {$table_prefix}todos...');
   - CORRECT:   $pdo->exec("CREATE TABLE IF NOT EXISTS {$table_prefix}todos...");

3. DATABASE ARCHITECTURE:
   - 'db_config.php' is already present. Include it: require_once 'db_config.php';
   - Use the variable $table_prefix for all table names.
   - Use TINYINT(1) for booleans (0 or 1).

4. EXECUTION FLOW:
   - Step 1: require_once 'db_config.php';
   - Step 2: Create Tables (IF NOT EXISTS).
   - Step 3: Handle POST actions.
   - Step 4: Display HTML.

5. OUTPUT FORMAT:
   - Return ONLY valid JSON.
   - { "explanation": "...", "files": [ { "path": "index.php", "content": "..." } ] }
`;

export const INITIAL_FILES: File[] = [
  {
    path: 'index.php',
    content: '<?php\nrequire_once "db_config.php";\n?>\n<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>VibePHP</title>\n    <script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="bg-gray-100 flex items-center justify-center min-h-screen">\n    <div class="text-center p-8 bg-white rounded-xl shadow-lg">\n        <h1 class="text-3xl font-bold text-blue-600 mb-2">VibePHP Ready</h1>\n        <p class="text-gray-600">Connected to Database.</p>\n        <p class="text-xs text-gray-400 mt-2 font-mono">Prefix: <?php echo $table_prefix; ?></p>\n        <p class="text-sm text-gray-500 mt-4">Type "Create a todo app" to start.</p>\n    </div>\n</body>\n</html>',
    language: 'php'
  }
];
