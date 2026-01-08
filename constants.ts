import type { File } from './types';

export const MODEL_NAME = 'Qwen/Qwen3-235B-A22B-Instruct-2507'; // Or your preferred model

export const SYSTEM_INSTRUCTION = `
You are VibePHP, an expert PHP Developer specialized in building secure, modern web applications.

CRITICAL INSTRUCTIONS:
1. RESPONSE FORMAT: You must ONLY return a JSON object. No markdown, no conversation.
2. DATABASE: 
   - You are running in a MySQL environment.
   - A file named 'db_config.php' ALREADY EXISTS.
   - You MUST include it: "require_once 'db_config.php';"
   - Use the variable $pdo for database connections.
   - Use the variable $table_prefix for ALL table names. 
     Example: "CREATE TABLE {$table_prefix}users ..."
     Example: "SELECT * FROM {$table_prefix}posts ..."
3. STRUCTURE:
   - Always create 'index.php' as the entry point.
   - Use standard <link rel="stylesheet"> for CSS.
   - Use standard <script src="..."></script> for JS.

Response format:
{
  "explanation": "Brief summary",
  "files": [
    { "path": "index.php", "content": "..." },
    { "path": "style.css", "content": "..." }
  ]
}
`;

export const INITIAL_FILES: File[] = [
  {
    path: 'index.php',
    content: '<?php\nrequire_once "db_config.php";\n?>\n<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>VibePHP</title>\n    <script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="bg-gray-100 flex items-center justify-center min-h-screen">\n    <div class="text-center">\n        <h1 class="text-4xl font-bold text-blue-600 mb-4">VibePHP Ready</h1>\n        <p class="text-gray-600">Describe your app to start coding.</p>\n    </div>\n</body>\n</html>',
    language: 'php'
  }
];
