import fs from 'fs';
let content = fs.readFileSync('src/components/ApplicantKanban.tsx', 'utf8');

// Remove showCVBuilder state
content = content.replace(/const \[showCVBuilder, setShowCVBuilder\] = useState\(false\);\n/, '');

// Replace the button
content = content.replace(
  /<div className="pt-4 border-t border-slate-100">\s*<button\s*onClick=\{.*?setShowCVBuilder\(true\)\}\s*className=".*?"\s*>\s*<FileBadge className="w-4 h-4" \/>\s*<span>Manage & Generate CV<\/span>\s*<\/button>\s*<\/div>/,
  `{selectedApplicant.cvData && (
                    <div className="pt-4 border-t border-slate-100">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                        <h4 className="text-[10px] font-black text-emerald-900 uppercase flex items-center">
                          <FileBadge className="w-3.5 h-3.5 mr-1" /> Submitted Application Form Data
                        </h4>
                        <div className="max-h-40 overflow-y-auto text-[10px] text-emerald-800 font-mono bg-white p-2 rounded border border-emerald-100">
                           {JSON.stringify(selectedApplicant.cvData, null, 2)}
                        </div>
                      </div>
                    </div>
                  )}`
);

fs.writeFileSync('src/components/ApplicantKanban.tsx', content);
