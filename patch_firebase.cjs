const fs = require('fs');
let code = fs.readFileSync('src/firebase.ts', 'utf8');
code = code.replace("throw new Error(JSON.stringify(errInfo));", "// Prevent app crash on quota limits\\n  // throw new Error(JSON.stringify(errInfo));");
fs.writeFileSync('src/firebase.ts', code);
console.log('Firebase patched');
