const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const profileEndRegex = /<div className="flex flex-col gap-2">\s*\{data\.warehouseProfile\?\.logo && \(\s*<img\s*src=\{data\.warehouseProfile\.logo\}\s*alt="Logo Gudang"\s*className="h-16 w-auto object-contain border rounded"\s*\/>\s*\)\}\s*<Input\s*type="file"\s*accept="image\/\*"\s*onChange=\{handleLogoUpload\}\s*className="cursor-pointer"\s*\/>\s*\{data\.warehouseProfile\?\.logo && \(\s*<Button\s*variant="destructive"\s*size="sm"\s*onClick=\{\(\) =>\s*updateData\(\{\s*warehouseProfile: \{\s*\.\.\.data\.warehouseProfile,\s*logo: undefined,\s*\} as any,\s*\}\)\s*\}\s*>\s*Hapus Logo\s*<\/Button>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/CardContent>\s*<\/Card>/;

const newProfileEnd = `<div className="flex flex-col gap-2">
                      {data.warehouseProfile?.logo && (
                        <img 
                          src={data.warehouseProfile.logo} 
                          alt="Logo Gudang" 
                          className="h-16 w-auto object-contain border rounded" 
                        />
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="cursor-pointer"
                      />
                      {data.warehouseProfile?.logo && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            updateData({
                              warehouseProfile: {
                                ...data.warehouseProfile,
                                logo: undefined,
                              } as any,
                            })
                          }
                        >
                          Hapus Logo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800">
                  <Button 
                    onClick={() => {
                      logActivity("Simpan Profil", "Menyimpan pengaturan profil gudang");
                      alert("Profil gudang berhasil disimpan!");
                    }} 
                    className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Simpan Profil
                  </Button>
                </div>
              </CardContent>
            </Card>`;

code = code.replace(profileEndRegex, newProfileEnd);
fs.writeFileSync('src/pages/Settings.tsx', code);
console.log('Profile button patched');
