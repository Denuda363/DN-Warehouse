const fs = require('fs');

let mdCode = fs.readFileSync('src/pages/MasterData.tsx', 'utf8');
mdCode = mdCode.replace(/>\n\s*Batal\n\s*<\/Button>/g, ">\n                <X className=\"w-4 h-4 mr-2\" /> Batal\n              </Button>");
mdCode = mdCode.replace(/>\n\s*Simpan\n\s*<\/Button>/g, ">\n                <Save className=\"w-4 h-4 mr-2\" /> Simpan\n              </Button>");

if (!mdCode.includes('Save')) {
    mdCode = mdCode.replace(/import \{ ([^}]+) \} from "lucide-react";/, "import { $1, Save } from \"lucide-react\";");
}

fs.writeFileSync('src/pages/MasterData.tsx', mdCode);
console.log('MasterData patched.');
