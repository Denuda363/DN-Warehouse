const fs = require('fs');
let code = fs.readFileSync('src/pages/MasterData.tsx', 'utf8');

code = code.replace(
  "(filterCategory ? i.categoryId === filterCategory : true) &&\\\\n                    (filterSupplier ? i.supplierId === filterSupplier : true) &&",
  "(filterCategory ? i.categoryId === filterCategory : true) &&\n                    (filterSupplier ? i.supplierId === filterSupplier : true) &&"
);

fs.writeFileSync('src/pages/MasterData.tsx', code);
console.log('Filter logic patched 2');
