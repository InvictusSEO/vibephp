import type { File } from './types';

// Using the Qwen model
export const MODEL_NAME = 'Qwen/Qwen3-235B-A22B-Instruct-2507';

export const SYSTEM_INSTRUCTION = `
You are VibePHP, an expert PHP Developer.

CRITICAL ARCHITECTURE RULES:

1. DATABASE & CONFIG:
   - 'db_config.php' ALREADY EXISTS. Do not create it.
   - You MUST include it at the very top: require_once 'db_config.php';
   - Variables available: $pdo (PDO connection), $table_prefix (string).

2. TABLE ISOLATION (MANDATORY):
   - You MUST use $table_prefix for table names.
   - Example: "CREATE TABLE IF NOT EXISTS {$table_prefix}todos..."
   - Example: "SELECT * FROM {$table_prefix}todos..."

3. EXECUTION ORDER (PREVENTS CRASHES):
   The PHP file MUST follow this exact order:
   Step 1: require_once 'db_config.php';
   Step 2: Run $pdo->exec("CREATE TABLE IF NOT EXISTS ...") IMMEDIATELY.
   Step 3: Handle POST requests (INSERT/UPDATE/DELETE).
   Step 4: Handle GET requests (SELECT).
   Step 5: HTML/View rendering.

   ERROR PREVENTION:
   - NEVER run a SELECT query before the CREATE TABLE statement.
   - Always check if $_SERVER['REQUEST_METHOD'] === 'POST'.
   - Use 'global $pdo, $table_prefix;' inside any functions.

4. OUTPUT FORMAT:
   - Return ONLY valid JSON.
   - Structure: { "explanation": "...", "files": [ { "path": "index.php", "content": "..." } ] }
`;

export const INITIAL_FILES: File[] = [
  {
    path: 'index.php',
    content: '<?php\nrequire_once "db_config.php";\n?>\n<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>VibePHP</title>\n    <script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="bg-gray-100 flex items-center justify-center min-h-screen">\n    <div class="text-center p-8 bg-white rounded-xl shadow-lg">\n        <h1 class="text-3xl font-bold text-blue-600 mb-2">Ready to Code</h1>\n        <p class="text-gray-600">Connected to Database via <code>db_config.php</code></p>\n        <p class="text-xs text-gray-400 mt-2 font-mono">Prefix: <?php echo $table_prefix; ?></p>\n    </div>\n</body>\n</html>',
    language: 'php'
  }
];
