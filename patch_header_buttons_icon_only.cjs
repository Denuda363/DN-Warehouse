const fs = require('fs');

let code = fs.readFileSync('src/pages/MasterData.tsx', 'utf8');

const regex = /<div className="flex bg-slate-100 dark:bg-slate-800\/50 p-1 rounded-lg gap-1 border border-slate-200 dark:border-slate-800 w-full sm:w-auto">[\s\S]*?<\/div>\n          \) : null\}/g;

const replacement = `<div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg gap-1 border border-slate-200 dark:border-slate-800 w-full sm:w-auto">
              <Button
                onClick={downloadTemplate}
                variant="ghost"
                size="icon"
                className="text-slate-600 dark:text-slate-300 h-9 w-10 sm:w-9 hover:bg-white dark:hover:bg-slate-800 shrink-0"
                title="Download Template Excel"
              >
                <Download className="w-4 h-4" />
              </Button>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-emerald-600 dark:text-emerald-400 relative hover:bg-white dark:hover:bg-slate-800 h-9 w-10 sm:w-9 shrink-0"
                  title="Import Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    title="Import Excel"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleImport}
                  />
                </Button>
              </div>
              <Button
                onClick={openAddModal}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-3 sm:px-4 shadow-sm flex-1 sm:flex-none"
                title="Tambah Data"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Data
              </Button>
            </div>
          ) : null}`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/pages/MasterData.tsx', code);
console.log('Buttons icon only patched successfully.');
