const fs = require('fs');
let code = fs.readFileSync('src/pages/PurchaseInvoiceList.tsx', 'utf8');

const regex = /<Button\n            variant="outline"\n            className="text-slate-600 dark:text-slate-300 w-full sm:w-auto shrink-0"\n            onClick=\{exportPdf\}\n          >\n            <Download className="w-4 h-4 mr-2" \/> Export PDF\n          <\/Button>/;

const replacement = `<Button
            variant="outline"
            size="icon"
            className="text-slate-600 dark:text-slate-300 w-10 sm:w-10 shrink-0"
            onClick={exportPdf}
            title="Export PDF"
          >
            <Download className="w-4 h-4" />
          </Button>`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/PurchaseInvoiceList.tsx', code);
console.log('PurchaseInvoiceList patched successfully.');
