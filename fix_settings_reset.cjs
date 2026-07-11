const fs = require('fs');

let setCode = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

setCode = setCode.replace(/className="bg-rose-600 text-white"\s+disabled=\{!pinInput \|\| !Object\.values\(resetOptions\)\.some\(Boolean\)\}\s+className="flex items-center justify-center gap-2"/g, 'className="bg-rose-600 text-white flex items-center justify-center gap-2" disabled={!pinInput || !Object.values(resetOptions).some(Boolean)}');

fs.writeFileSync('src/pages/Settings.tsx', setCode);
console.log('Settings reset fixed.');
