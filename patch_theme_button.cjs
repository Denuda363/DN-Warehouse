const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const themeEndRegex = /<div className="flex justify-start">\s*<Button\s*variant="outline"\s*size="sm"\s*onClick=\{\(\) =>\s*updateData\(\{\s*navBgColor: "#0f172a",\s*navTextColor: "#e2e8f0",\s*\}\)\s*\}\s*>\s*Reset ke Default\s*<\/Button>\s*<\/div>\s*<\/div>/;

const newThemeEnd = `<div className="flex justify-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateData({
                          navBgColor: "#0f172a",
                          navTextColor: "#e2e8f0",
                        })
                      }
                    >
                      Reset ke Default
                    </Button>
                  </div>
                </div>
                
                <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800">
                  <Button 
                    onClick={() => {
                      logActivity("Simpan Tema", "Menyimpan pengaturan tema aplikasi");
                      alert("Pengaturan tema berhasil disimpan!");
                    }} 
                    className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Simpan Tema
                  </Button>
                </div>`;

code = code.replace(themeEndRegex, newThemeEnd);
fs.writeFileSync('src/pages/Settings.tsx', code);
console.log('Theme button patched');
