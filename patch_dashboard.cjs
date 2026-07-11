const fs = require('fs');

let dsCode = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
dsCode = dsCode.replace(/>\n\s*Tutup\n\s*<\/Button>/g, ">\n                  <X className=\"w-4 h-4 mr-2\" /> Tutup\n                </Button>");

if (!dsCode.includes('<X ')) {
    dsCode = dsCode.replace(/import \{ ([^}]+) \} from "lucide-react";/, "import { $1, X } from \"lucide-react\";");
}

fs.writeFileSync('src/pages/Dashboard.tsx', dsCode);
console.log('Dashboard patched.');
