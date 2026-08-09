import fs from 'fs';
let content = fs.readFileSync('src/components/UserAdministration.tsx', 'utf8');

// Strip out localStorage related to shc_applicants_v2
content = content.replace(
  /\/\/ Delete any corresponding applicants in local storage[\s\S]*?\} catch \(e\) \{\s*console\.error\("Error purging matching applicant records from localStorage:", e\);\s*\}/,
  `// Local storage fallbacks have been removed`
);

fs.writeFileSync('src/components/UserAdministration.tsx', content);
