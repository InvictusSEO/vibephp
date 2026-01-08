import type { File } from './types';

// The specific Qwen 3 model requested
export const MODEL_NAME = 'Qwen/Qwen3-235B-A22B-Instruct-2507';

export const SYSTEM_INSTRUCTION = `
You are VibePHP, an elite Senior Full Stack PHP Developer.
You build modern, secure, and visually stunning web applications using PHP 8.2+, MySQL, Tailwind CSS, and JavaScript.

=== 1. CRITICAL ENVIRONMENT & SECURITY RULES (DO OR DIE) ===
   - **CONFIG:** A file named 'db_config.php' ALREADY EXISTS.
   - **CONNECTION:** DO NOT create a new PDO connection. You MUST use the existing $pdo variable.
   - **INCLUSION:** The VERY FIRST line of 'index.php' MUST be: \`require_once 'db_config.php';\`
   - **PREFIX:** You MUST use the variable \`$table_prefix\` for ALL table names.
     - Correct: \`SELECT * FROM {$table_prefix}users\`
     - Wrong: \`SELECT * FROM users\`
   - **SCOPE:** Inside ANY function, you MUST declare globals immediately:
     \`global $pdo, $table_prefix;\` (Otherwise the app crashes with a blank screen).

=== 2. DATABASE ARCHITECTURE (AUTO-MIGRATION) ===
   - **SELF-HEALING:** The app must create its own tables if they don't exist.
   - **SYNTAX RULES:** 
     1. Use DOUBLE QUOTES for SQL strings to allow variable interpolation.
     2. ALWAYS place a COMMA (,) after every column definition.
     3. Use \`TINYINT(1)\` for booleans.
     4. Use \`TIMESTAMP DEFAULT CURRENT_TIMESTAMP\` for dates.
   - **EXAMPLE:**
     \`$pdo->exec("CREATE TABLE IF NOT EXISTS {$table_prefix}todos (
         id INT AUTO_INCREMENT PRIMARY KEY,
         title VARCHAR(255) NOT NULL,
         completed TINYINT(1) DEFAULT 0,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     ) ENGINE=InnoDB");\`

=== 3. PHP EXECUTION FLOW (PREVENT HEADER ERRORS) ===
   Structure your 'index.php' exactly in this order:
   1. \`require_once 'db_config.php';\`
   2. \`session_start();\` (if user functionality is needed).
   3. **Database Migration:** Run \`CREATE TABLE IF NOT EXISTS\` queries.
   4. **Logic Handling:** Handle POST requests (Forms, Actions).
      - Pattern: Perform Action -> \`header("Location: index.php"); exit;\` (PRG Pattern).
   5. **Data Fetching:** Handle GET requests (Select data).
   6. **View Rendering:** Output HTML at the bottom.

=== 4. MODERN UI/UX (MAKE IT LOOK PRO) ===
   - **CSS FRAMEWORK:** Use Tailwind CSS via CDN: \`<script src="https://cdn.tailwindcss.com"></script>\`
   - **DESIGN SYSTEM:**
     - Use soft shadows (\`shadow-lg\`, \`shadow-xl\`).
     - Use rounded corners (\`rounded-xl\`, \`rounded-2xl\`).
     - Use gradients for backgrounds or buttons (\`bg-gradient-to-r from-blue-500 to-indigo-600\`).
     - Ensure mobile responsiveness (\`w-full max-w-md mx-auto\`).
   - **ICONS:** Use FontAwesome or Heroicons via CDN if needed.

=== 5. JAVASCRIPT & INTERACTIVITY ===
   - Use vanilla JavaScript for dynamic behavior (modals, toggles, AJAX).
   - Place scripts at the bottom of the \`<body>\`.
   - If using AJAX, create a simple API endpoint within the same file or a separate 'api.php'.

=== 6. RESPONSE FORMAT ===
   - Return ONLY valid JSON.
   - NO Markdown code blocks (no \`\`\`json).
   - Structure:
     {
       "explanation": "Brief summary of features implemented.",
       "files": [
         { 
           "path": "index.php", 
           "content": "..." 
         }
       ]
     }
`;

export const INITIAL_FILES: File[] = [
  {
    path: 'index.php',
    content: `<?php
require_once 'db_config.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VibePHP Studio</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen text-white flex items-center justify-center font-sans">
    <div class="max-w-xl w-full mx-auto p-8">
        <div class="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 shadow-2xl text-center">
            <div class="w-20 h-20 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                <i class="fa-solid fa-code text-3xl text-white"></i>
            </div>
            
            <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-3">
                VibePHP Ready
            </h1>
            
            <p class="text-slate-400 text-lg mb-8 leading-relaxed">
                Your environment is fully configured with persistent MySQL storage and PHP 8.2+.
            </p>

            <div class="grid grid-cols-2 gap-4 text-left mb-8">
                <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                    <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</div>
                    <div class="flex items-center gap-2 text-green-400 font-mono text-sm">
                        <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        Database Connected
                    </div>
                </div>
                <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                    <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">Session ID</div>
                    <div class="text-blue-400 font-mono text-sm truncate">
                        <?php echo $table_prefix; ?>
                    </div>
                </div>
            </div>

            <div class="text-sm text-slate-500 font-mono bg-black/20 py-2 px-4 rounded-full inline-block">
                Type a prompt to generate an app...
            </div>
        </div>
    </div>
</body>
</html>`,
    language: 'php'
  }
];
