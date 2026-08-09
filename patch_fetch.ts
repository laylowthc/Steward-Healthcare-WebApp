import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /const loadedApplicants: Applicant\[\] = \[\];[\s\S]*?if \(!active\) return;/m,
  (match) => {
    // we don't want to replace the whole block blindly, let's do it carefully.
    return match;
  }
);
// just a test
console.log(content.length);
