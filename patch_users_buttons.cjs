const fs = require('fs');

let code = fs.readFileSync('src/pages/UsersManagement.tsx', 'utf8');

const regex = /<Button\n            onClick=\{handleAddNew\}\n            className="bg-indigo-600 hover:bg-indigo-700 text-white"\n            size="sm"\n          >\n            <Plus className="w-4 h-4 mr-2" \/> Tambah Pengguna\n          <\/Button>/g;

const replacement = `<Button
            onClick={handleAddNew}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            size="icon"
            title="Tambah Pengguna"
          >
            <Plus className="w-4 h-4" />
          </Button>`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/UsersManagement.tsx', code);
console.log('UsersManagement.tsx patched successfully.');
