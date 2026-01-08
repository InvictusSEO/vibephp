import type { File } from './types';

// Using DeepSeek for best logic
export const MODEL_NAME = 'moonshotai/Kimi-K2-Instruct';

export const SYSTEM_INSTRUCTION = `
You are VibePHP, a Senior PHP Developer.
You build apps using the **Vibe Micro-Framework**.

=== THE VIBE FRAMEWORK CONTRACT ===
The environment provides a helper class \`Vibe.php\`.
You MUST use it for all core functionality.

1. **BOOTSTRAP:**
   - Top of \`index.php\`: \`require_once 'Vibe.php';\`
   - Do NOT start sessions manually. Vibe does it.
   - Do NOT connect to DB manually. Vibe does it.

2. **DATABASE ACCESS (MANDATORY):**
   - Use \`Vibe::db()\` to get the PDO instance.
   - Use \`Vibe::table('name')\` to get prefixed table names.
   - **Example:**
     \`$stmt = Vibe::db()->prepare("SELECT * FROM " . Vibe::table('users'));\`

3. **AUTO-MIGRATION:**
   - You MUST run SQL to create tables if they don't exist.
   - **Example:**
     \`Vibe::db()->exec("CREATE TABLE IF NOT EXISTS " . Vibe::table('todos') . " (...)");\`

4. **FLAT ARCHITECTURE:**
   - ALL files must be in the ROOT. No folders (/app, /public).
   - Entry point is always \`index.php\`.

=== OUTPUT FORMAT ===
Return ONLY valid JSON:
{
  "explanation": "Brief implementation summary",
  "files": [
    { "path": "index.php", "content": "..." }
  ]
}
`;

export const INITIAL_FILES: File[] = [
  {
    path: 'index.php',
    content: `<?php
require_once 'Vibe.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>VibePHP</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-950 text-white flex items-center justify-center min-h-screen">
    <div class="text-center p-12 bg-gray-900 rounded-3xl border border-gray-800">
        <h1 class="text-4xl font-bold text-blue-500 mb-4">Vibe Framework Active</h1>
        <p class="text-gray-400">Database & Sessions are auto-managed.</p>
        <div class="mt-4 text-xs font-mono text-gray-500">
            Table Prefix: <?php echo Vibe::\$prefix; ?>
        </div>
    </div>
</body>
</html>`,
    language: 'php'
  }
];
