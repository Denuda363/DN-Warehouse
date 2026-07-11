const fs = require('fs');

let code = fs.readFileSync('src/pages/MasterData.tsx', 'utf8');

const regex = /<div className="flex flex-wrap gap-2 w-full sm:w-auto">[\s\S]*?<\/div>\n      <\/div>\n\n      <Card className="p-1 flex gap-1 bg-slate-50\/50/g;

const replacement = `<div className="flex gap-2 w-full sm:w-auto justify-end">
          {activeTab === "low-stock" ? (
            <Button
              onClick={() => setIsExportModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex-1 sm:flex-none"
              title="Ekspor Data"
            >
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Ekspor Data</span>
            </Button>
          ) : activeTab !== "opname" ? (
            <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg gap-1 border border-slate-200 dark:border-slate-800 w-full sm:w-auto">
              <Button
                onClick={downloadTemplate}
                variant="ghost"
                size="sm"
                className="text-slate-600 dark:text-slate-300 h-9 px-3 hover:bg-white dark:hover:bg-slate-800 flex-1 sm:flex-none"
                title="Download Template Excel"
              >
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Template</span>
              </Button>
              <div className="relative flex-1 sm:flex-none flex">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-emerald-600 dark:text-emerald-400 relative hover:bg-white dark:hover:bg-slate-800 h-9 px-3 w-full"
                  title="Import Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Import</span>
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-3 shadow-sm flex-1 sm:flex-none"
                title="Tambah Data"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Tambah</span>
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <Card className="p-1 flex gap-1 bg-slate-50/50`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/pages/MasterData.tsx', code);
console.log('Buttons patched successfully.');
