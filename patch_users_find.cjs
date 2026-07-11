const fs = require('fs');
let code = fs.readFileSync('src/pages/UsersManagement.tsx', 'utf8');

code = code.replace(/data\.users\.find/g, "(data.users || []).find");
fs.writeFileSync('src/pages/UsersManagement.tsx', code);
console.log('UsersManagement.tsx find patched');
