const fs = require('fs');

let tfCode = fs.readFileSync('src/pages/TransactionForm.tsx', 'utf8');
if (!tfCode.includes('<Save className="w-5 h-5 mr-2" />')) {
    tfCode = tfCode.replace(/<Button type="submit" className=\{\`w-full h-12 text-base \$\{type === 'IN' \? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'\} text-white mt-4\`\>\n              Simpan Transaksi\n            <\/Button>/,
    `<Button type="submit" className={\`w-full h-12 text-base \${type === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'} text-white mt-4 flex items-center justify-center gap-2\`}>
              <Save className="w-5 h-5 mr-2" /> Simpan Transaksi
            </Button>`);
    
    // Add Save import if missing
    if (!tfCode.includes('Save')) {
        tfCode = tfCode.replace(/import \{ ([^}]+) \} from "lucide-react";/, "import { $1, Save } from \"lucide-react\";");
    }
    fs.writeFileSync('src/pages/TransactionForm.tsx', tfCode);
}

let loginCode = fs.readFileSync('src/pages/Login.tsx', 'utf8');
if (!loginCode.includes('<LogIn className="w-5 h-5 mr-2" />')) {
    loginCode = loginCode.replace(/<Button\n            type="submit"\n            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-base font-medium mt-6"\n          >\n            Masuk\n          <\/Button>/,
    `<Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-base font-medium mt-6 flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5 mr-2" /> Masuk
          </Button>`);
          
    // Add LogIn import
    if (!loginCode.includes('LogIn')) {
        if (loginCode.includes('import {')) {
            loginCode = loginCode.replace(/import \{ ([^}]+) \} from "lucide-react";/, "import { $1, LogIn } from \"lucide-react\";");
        } else {
            loginCode = "import { LogIn } from \"lucide-react\";\n" + loginCode;
        }
    }
    fs.writeFileSync('src/pages/Login.tsx', loginCode);
}

console.log('TransactionForm and Login patched.');
