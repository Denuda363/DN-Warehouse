const fs = require('fs');

let code = fs.readFileSync('src/pages/MasterData.tsx', 'utf8');

const regex = /\{activeTab === "items" && \(\s*<div className="md:hidden flex flex-col gap-3 p-4">[\s\S]*?<\/div>\s*\)\}\s*<table className=\{`w-full text-sm text-left min-w-\[800px\] \$\{activeTab === 'items' \? 'hidden md:table' : ''\}`\}>/;

const replacement = `{activeTab === "items" && (
            <div className="md:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredItems
                .filter((i) =>
                  i.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                  (filterCategory ? i.categoryId === filterCategory : true) &&
                  (filterSupplier ? i.supplierId === filterSupplier : true) &&
                  (filterSubCategory ? i.subCategoryId === filterSubCategory : true)
                )
                .map((item) => (
                  <div key={item.id} className="p-4 flex gap-3 items-center hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    {item.imageUrl ? (
                      <div className="w-12 h-12 shrink-0 rounded-md bg-slate-100 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center text-slate-400">
                        <Package className="w-6 h-6 opacity-40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{item.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                        {item.sku || "-"} • {data.categories.find((c) => c.id === item.categoryId)?.name || "Tanpa Kategori"}
                      </div>
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-1">
                        {item.stock} {data.units.find((u) => u.id === item.unitId)?.name}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        onClick={() => openEditModal(item)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(item.id, "items")}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
          <table className={\`w-full text-sm text-left min-w-[800px] \${activeTab === 'items' ? 'hidden md:table' : ''}\`}>`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/MasterData.tsx', code);
console.log('Done');
