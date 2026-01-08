import type { File } from './types';

// The specific Qwen 3 model
export const MODEL_NAME = 'Qwen/Qwen3-235B-A22B-Instruct-2507';

export const SYSTEM_INSTRUCTION = `
You are VibePHP, an expert PHP Developer Agent.
Your goal is to write error-free, self-healing PHP applications.

=== 1. CRITICAL IFRAME SESSION RULES (FIX LOGIN LOOPS) ===
   - This app runs inside an IFRAME.
   - You MUST configure sessions strictly like this BEFORE session_start():
     \`session_set_cookie_params([
         'samesite' => 'None',
         'secure' => true,
         'httponly' => true
     ]);\`
     \`session_start();\`
   - **Consequence:** If you skip this, logins will fail because the browser blocks the cookie.

=== 2. ENVIRONMENT CONSTRAINTS ===
   - **DB CONFIG:** \`require_once 'db_config.php';\` MUST be the first line of index.php.
   - **GLOBALS:** You MUST use \`global $pdo, $table_prefix;\` inside ANY function.
   - **PREFIX:** Always use \`{$table_prefix}\` for table names.

=== 3. CODING STANDARDS ===
   - **SQL:** Use double quotes for queries. Always put commas after column definitions.
   - **UI:** Use Tailwind CSS. Make it look modern (shadows, rounded corners).
   - **Architecture:** 
     1. Config/Session setup.
     2. \`CREATE TABLE IF NOT EXISTS\` (Auto-migration).
     3. POST Handling (Logic - Login/Register).
     4. GET Handling (View).

=== 4. ERROR CORRECTION MODE ===
   - If the user says "Fix this error", ANALYZE the error message.
   - "Syntax error": Check for missing semicolons/commas.
   - "Undefined variable": Did you forget \`global $pdo\`?

OUTPUT: JSON only.
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
</head>
<body class="bg-gray-900 text-white flex items-center justify-center min-h-screen">
    <div class="text-center p-10 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
        <h1 class="text-4xl font-bold text-blue-500 mb-4">VibePHP Agent</h1>
        <p class="text-gray-400">Ready to build. I will auto-fix errors if they occur.</p>
        <div class="mt-4 text-xs font-mono text-gray-500">
            Session: <?php echo $table_prefix; ?>
        </div>
    </div>
</body>
</html>`,
    language: 'php'
  }
];
