const fs = require('fs');
let code = fs.readFileSync('src/pages/MasterData.tsx', 'utf8');

code = code.replace(/no-scrollbar/g, '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]');

fs.writeFileSync('src/pages/MasterData.tsx', code);
console.log('Scrollbar patched');
