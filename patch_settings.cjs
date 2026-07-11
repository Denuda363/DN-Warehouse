const fs = require('fs');

let setCode = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

setCode = setCode.replace(/>\n\s*Hapus Logo\n\s*<\/Button>/g, ">\n                <Trash2 className=\"w-4 h-4 mr-2\" /> Hapus Logo\n              </Button>");
setCode = setCode.replace(/>\n\s*Simpan Profil\n\s*<\/Button>/g, " className=\"flex items-center justify-center gap-2\">\n            <Save className=\"w-4 h-4 mr-2\" /> Simpan Profil\n          </Button>");
setCode = setCode.replace(/>\n\s*Simpan Tema\n\s*<\/Button>/g, " className=\"flex items-center justify-center gap-2\">\n                    <Save className=\"w-4 h-4 mr-2\" /> Simpan Tema\n                  </Button>");

// "Reset Semua Data" -> Add icon
setCode = setCode.replace(/>\n\s*Reset Semua Data\n\s*<\/Button>/g, " className=\"flex items-center justify-center gap-2\">\n                      <RotateCcw className=\"w-4 h-4 mr-2\" /> Reset Semua Data\n                    </Button>");

if (!setCode.includes('Save')) {
    setCode = setCode.replace(/import \{ ([^}]+) \} from "lucide-react";/, "import { $1, Save } from \"lucide-react\";");
}
if (!setCode.includes('RotateCcw')) {
    setCode = setCode.replace(/import \{ ([^}]+) \} from "lucide-react";/, "import { $1, RotateCcw } from \"lucide-react\";");
}

fs.writeFileSync('src/pages/Settings.tsx', setCode);
console.log('Settings patched.');
