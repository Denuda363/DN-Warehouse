const fs = require('fs');
let code = fs.readFileSync('src/pages/MasterData.tsx', 'utf8');

const regex = /\.\.\.\(data\.subCategories \|\| \[\]\)\.map\(\(sc\) => \(\{ value: sc\.id, label: sc\.name \}\)\)/g;
const replacement = '...(data.subCategories || []).filter(sc => filterCategory ? sc.categoryId === filterCategory : true).map((sc) => ({ value: sc.id, label: sc.name }))';

code = code.replace(regex, replacement);

fs.writeFileSync('src/pages/MasterData.tsx', code);
console.log('Subcat options patched');
