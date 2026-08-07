import fs from 'fs';
let content = fs.readFileSync('src/components/Login.tsx', 'utf8');
content = content.replace(/status: 'Pending'/g, "status: 'Applied'");
fs.writeFileSync('src/components/Login.tsx', content);
