const fs = require('fs');

let code = fs.readFileSync('src/pages/MasterData.tsx', 'utf8');

const regex = /<div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">\n\s*<div className="w-full sm:w-48">/g;

const replacement = `<div className="flex gap-2 w-full overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible no-scrollbar">
                  <div className="w-auto min-w-[150px] shrink-0 sm:min-w-0 sm:w-48">`;

code = code.replace(regex, replacement);

const regex2 = /<\/div>\n\s*<div className="w-full sm:w-48">/g;
const replacement2 = `</div>\n                  <div className="w-auto min-w-[150px] shrink-0 sm:min-w-0 sm:w-48">`;

code = code.replace(regex2, replacement2);

fs.writeFileSync('src/pages/MasterData.tsx', code);
console.log('Filters patched');
