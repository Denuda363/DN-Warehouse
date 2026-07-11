const fs = require('fs');
let code = fs.readFileSync('src/pages/Report.tsx', 'utf8');

code = code.replace(/<Button variant="outline" size="sm" onClick=\{\(\) => exportLowStock\('excel'\)\} className="h-10 text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900\/50 dark:hover:bg-emerald-900\/20">\n                  <FileSpreadsheet className="w-4 h-4 mr-2" \/> Excel\n                <\/Button>/,
`<Button variant="outline" size="icon" onClick={() => exportLowStock('excel')} className="h-10 w-10 text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50 dark:hover:bg-emerald-900/20" title="Export Excel">
                  <FileSpreadsheet className="w-4 h-4" />
                </Button>`);

code = code.replace(/<Button variant="outline" size="sm" onClick=\{\(\) => exportLowStock\('pdf'\)\} className="h-10 text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 dark:border-rose-900\/50 dark:hover:bg-rose-900\/20">\n                  <FileText className="w-4 h-4 mr-2" \/> PDF\n                <\/Button>/,
`<Button variant="outline" size="icon" onClick={() => exportLowStock('pdf')} className="h-10 w-10 text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-900/20" title="Export PDF">
                  <FileText className="w-4 h-4" />
                </Button>`);

fs.writeFileSync('src/pages/Report.tsx', code);
console.log('Report.tsx patched successfully.');
