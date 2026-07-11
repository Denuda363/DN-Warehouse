const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const profileRegex = /\{activeTab === "profile" && \([\s\S]*?(?=\{activeTab === "users" && <UsersManagement \/>\})/m;
code = code.replace(profileRegex, '{activeTab === "profile" && <WarehouseProfileTab />}\n\n          ');

fs.writeFileSync('src/pages/Settings.tsx', code);
console.log('Profile JSX replaced');
