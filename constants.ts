import type { File } from './types';

export const MODEL_NAME = 'Qwen/Qwen3-235B-A22B-Instruct-2507';

export const SYSTEM_INSTRUCTION = `
You are VibePHP, an expert PHP Developer.

CRITICAL RULES FOR SQL GENERATION:

1. VARIABLE INTERPOLATION (CRITICAL):
   - You MUST use DOUBLE QUOTES for SQL strings so variables work.
   - WRONG: $pdo->exec('CREATE TABLE {$table_prefix}todos...');
   - CORRECT: $pdo->exec("CREATE TABLE {$table_prefix}todos...");

2. SQL SYNTAX (STRICT):
   - Always put a COMMA (,) after every column definition.
   - Use TINYINT(1) instead of BOOLEAN (better compatibility).
   - Define Primary Key clearly.
   - Example Pattern:
     "CREATE TABLE IF NOT EXISTS {$table_prefix}todos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        is_completed TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     ) ENGINE=InnoDB"

3. EXECUTION ORDER:
   1. require_once 'db_config.php';
   2. Execute CREATE TABLE queries immediately.
   3. Handle POST logic (Insert/Update).
   4. Fetch Data (Select).
   5. Render HTML.

4. RESPONSE FORMAT:
   - Return ONLY valid JSON.
   - NO markdown blocks (no \`\`\`json).
   - Structure: { "explanation": "...", "files": [ { "path": "index.php", "content": "..." } ] }
`;

export const INITIAL_FILES: File[] = [
  {
    path: 'index.php',
    content: '<?php\nrequire_once "db_config.php";\n?>\n<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>VibePHP</title>\n    <script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="bg-gray-100 flex items-center justify-center min-h-screen">\n    <div class="text-center p-8 bg-white rounded-xl shadow-lg">\n        <h1 class="text-3xl font-bold text-blue-600 mb-2">VibePHP Ready</h1>\n        <p class="text-gray-600">Connected to Database.</p>\n        <p class="text-xs text-gray-400 mt-2 font-mono">Prefix: <?php echo $table_prefix; ?></p>\n        <p class="text-sm text-gray-500 mt-4">Type "Create a todo app" to start.</p>\n    </div>\n</body>\n</html>',
    language: 'php'
  }
];
