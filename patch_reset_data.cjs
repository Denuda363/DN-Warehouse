const fs = require('fs');

let setCode = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

setCode = setCode.replace(/>\n\s*Reset Data Terpilih\n\s*<\/Button>/g, " className=\"flex items-center justify-center gap-2\">\n                      <RotateCcw className=\"w-4 h-4 mr-2\" /> Reset Data Terpilih\n                    </Button>");

if (!setCode.includes('RotateCcw')) {
    setCode = setCode.replace(/import \{ ([^}]+) \} from "lucide-react";/, "import { $1, RotateCcw } from \"lucide-react\";");
}

fs.writeFileSync('src/pages/Settings.tsx', setCode);
console.log('Reset Data Terpilih patched.');
