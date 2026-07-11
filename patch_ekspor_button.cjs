const fs = require('fs');

let code = fs.readFileSync('src/pages/MasterData.tsx', 'utf8');

const regex = /<Button\n              onClick=\{\(\) => setIsExportModalOpen\(true\)\}\n              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex-1 sm:flex-none"\n              title="Ekspor Data"\n            >\n              <Download className="w-4 h-4 sm:mr-2" \/>\n              <span className="hidden sm:inline">Ekspor Data<\/span>\n            <\/Button>/g;

const replacement = `<div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg gap-1 border border-slate-200 dark:border-slate-800">
              <Button
                onClick={() => setIsExportModalOpen(true)}
                size="icon"
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 w-10 sm:w-9 shadow-sm shrink-0"
                title="Ekspor Data"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/pages/MasterData.tsx', code);
console.log('Ekspor Data button icon only patched successfully.');
