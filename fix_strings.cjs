const fs = require('fs');
let code = fs.readFileSync('src/pages/Report.tsx', 'utf8');

// Replace the escaped template literals
code = code.replace(/\\\`/g, '`');
code = code.replace(/\\\$/g, '$');

fs.writeFileSync('src/pages/Report.tsx', code);
console.log('Fixed strings');
