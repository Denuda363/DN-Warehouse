const fs = require('fs');
let code = fs.readFileSync('src/pages/Report.tsx', 'utf8');

const search = `<p className="text-xs text-slate-500 font-mono mb-4">{item.sku}</p>`;
const replace = `<p className="text-xs text-slate-500 font-mono mb-4">{item.sku}</p>
                        <div className="mb-4 space-y-1">
                          <p className="text-xs text-slate-500">Supplier: <span className="font-semibold text-slate-700 dark:text-slate-300">{data.suppliers.find(s => s.id === item.supplierId)?.name || "Tanpa Supplier"}</span></p>
                          <p className="text-xs text-slate-500">Alt Supplier: <span className="font-semibold text-slate-700 dark:text-slate-300">{data.suppliers.find(s => s.id === item.altSupplierId)?.name || "-"}</span></p>
                        </div>`;

code = code.replace(search, replace);
fs.writeFileSync('src/pages/Report.tsx', code);
console.log('UI Updated');
