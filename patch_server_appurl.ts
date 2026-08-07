import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  'const appUrl = process.env.APP_URL || process.env.VITE_SUPABASE_URL || "http://localhost:3000";',
  'const appUrl = process.env.APP_URL || "http://localhost:3000";'
);
fs.writeFileSync('server.ts', content);
