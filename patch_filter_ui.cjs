const fs = require('fs');
let code = fs.readFileSync('src/pages/MasterData.tsx', 'utf8');

const filterRegex = /\{activeTab === "items" && \(\n                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">\n                  <div className="w-full sm:w-48">/g;
const replacement = `{activeTab === "items" && (
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="w-full sm:w-48">
                    <SearchableSelect
                      buttonClassName="h-9 text-sm"
                      options={[
                        { value: "", label: "Semua Kategori" },
                        ...data.categories.map((c) => ({ value: c.id, label: c.name }))
                      ]}
                      value={filterCategory}
                      onChange={(val) => setFilterCategory(val)}
                      placeholder="Semua Kategori"
                    />
                  </div>
                  <div className="w-full sm:w-48">`;

code = code.replace(filterRegex, replacement);

fs.writeFileSync('src/pages/MasterData.tsx', code);
console.log('Filter UI patched');
