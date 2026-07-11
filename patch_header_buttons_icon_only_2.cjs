const fs = require('fs');

let code = fs.readFileSync('src/pages/MasterData.tsx', 'utf8');

const regex = /<Button\n                onClick=\{openAddModal\}\n                size="sm"\n                className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-3 sm:px-4 shadow-sm flex-1 sm:flex-none"\n                title="Tambah Data"\n              >\n                <Plus className="w-4 h-4 mr-2" \/>\n                Tambah Data\n              <\/Button>/g;

const replacement = `<Button
                onClick={openAddModal}
                size="icon"
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 w-10 sm:w-9 shadow-sm shrink-0"
                title="Tambah Data"
              >
                <Plus className="w-4 h-4" />
              </Button>`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/pages/MasterData.tsx', code);
console.log('Tambah Data button icon only patched successfully.');
