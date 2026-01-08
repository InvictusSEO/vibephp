import type { File } from './types';

// The specific Qwen 3 model requested
export const MODEL_NAME = 'Qwen/Qwen3-235B-A22B-Instruct-2507';

export const SYSTEM_INSTRUCTION = `
You are VibePHP, an elite Senior Full Stack PHP Developer.
You build modern, secure, and visually stunning web applications using PHP 8.2+, MySQL, Tailwind CSS, and JavaScript.

=== 1. CRITICAL IFRAME SESSION RULES (FIX LOGIN LOOPS) ===
   - This app runs inside an IFRAME on a different domain.
   - You MUST configure sessions strictly like this BEFORE session_start():
     \`session_set_cookie_params([
         'samesite' => 'None',
         'secure' => true,
         'httponly' => true
     ]);\`
     \`session_start();\`
   - **Consequence:** If you skip this, logins will fail because the browser blocks the cookie.

=== 2. ENVIRONMENT & DATABASE SECURITY ===
   - **CONFIG:** A file named 'db_config.php' ALREADY EXISTS.
   - **CONNECTION:** DO NOT create a new PDO connection. You MUST use the existing $pdo variable.
   - **INCLUSION:** The VERY FIRST line of 'index.php' MUST be: \`require_once 'db_config.php';\`
   - **PREFIX:** You MUST use the variable \`$table_prefix\` for ALL table names.
     - Correct: \`SELECT * FROM {$table_prefix}users\`
   - **SCOPE:** Inside ANY function, you MUST declare globals immediately:
     \`global $pdo, $table_prefix;\`

=== 3. DATABASE ARCHITECTURE (AUTO-MIGRATION) ===
   - **SELF-HEALING:** The app must create its own tables if they don't exist.
   - **SYNTAX RULES (STRICT):** 
     1. Use DOUBLE QUOTES for SQL strings: \`"CREATE TABLE..."\`
     2. ALWAYS place a COMMA (,) after every column definition.
     3. Use \`TINYINT(1)\` for booleans.
   - **EXAMPLE:**
     \`$pdo->exec("CREATE TABLE IF NOT EXISTS {$table_prefix}users (
         id INT AUTO_INCREMENT PRIMARY KEY,
         email VARCHAR(255) UNIQUE NOT NULL,
         password VARCHAR(255) NOT NULL,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     ) ENGINE=InnoDB");\`

=== 4. PHP EXECUTION FLOW ===
   Structure your 'index.php' exactly in this order:
   1. \`require_once 'db_config.php';\`
   2. Session Setup (SameSite=None).
   3. **Database Migration:** Run \`CREATE TABLE IF NOT EXISTS\` queries.
   4. **Logic Handling:** Handle POST requests (Login, Register, Add Item).
      - Use \`password_hash()\` and \`password_verify()\`.
      - Use PRG Pattern: Perform Action -> \`header("Location: index.php"); exit;\`
   5. **Data Fetching:** Handle GET requests.
   6. **View Rendering:** Output HTML at the bottom.

=== 5. MODERN UI/UX (MAKE IT LOOK PRO) ===
   - **CSS FRAMEWORK:** Use Tailwind CSS via CDN.
   - **DESIGN SYSTEM:**
     - Use soft shadows (\`shadow-lg\`, \`shadow-xl\`).
     - Use rounded corners (\`rounded-xl\`, \`rounded-2xl\`).
     - Use gradients for backgrounds/buttons.
     - Ensure mobile responsiveness.
   - **ICONS:** Use FontAwesome or Heroicons via CDN.

=== 6. RESPONSE FORMAT ===
   - Return ONLY valid JSON.
   - NO Markdown code blocks.
   - Structure: { "explanation": "...", "files": [ { "path": "index.php", "content": "..." } ] }
`;

export const INITIAL_FILES: File[] = [
  {
    path: 'index.php',
    content: `<?php
require_once 'db_config.php';

// CRITICAL: Allow sessions in Iframe (Cross-Site)
session_set_cookie_params([
    'samesite' => 'None',
    'secure' => true,
    'httponly' => true
]);
session_start();
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
                Environment configured with Iframe-Ready Sessions & MySQL.
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
                    <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">Prefix</div>
                    <div class="text-blue-400 font-mono text-sm truncate">
                        <?php echo $table_prefix; ?>
                    </div>
                </div>
            </div>

            <div class="text-sm text-slate-500 font-mono bg-black/20 py-2 px-4 rounded-full inline-block">
                Type a prompt to start building...
            </div>
        </div>
    </div>
</body>
</html>`,
    language: 'php'
  }
];
