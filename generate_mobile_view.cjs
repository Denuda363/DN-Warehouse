const fs = require('fs');

let code = fs.readFileSync('src/pages/MasterData.tsx', 'utf8');

const tableClassRegex = /<table className="w-full text-sm text-left min-w-\[800px\]">/;
const replacement = `{activeTab === "items" && (
            <div className="md:hidden flex flex-col gap-3 p-4">
              {filteredItems
                .filter((i) =>
                  i.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                  (filterCategory ? i.categoryId === filterCategory : true) &&
                  (filterSupplier ? i.supplierId === filterSupplier : true) &&
                  (filterSubCategory ? i.subCategoryId === filterSubCategory : true)
                )
                .map((item) => (
                  <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm flex flex-col gap-3">
                    <div className="flex gap-3 items-start">
                      {item.imageUrl ? (
                        <div className="w-16 h-16 shrink-0 rounded bg-slate-100 overflow-hidden border border-slate-200 dark:border-slate-800">
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 shrink-0 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400">
                          <Package className="w-8 h-8 opacity-50" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{item.name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{item.sku || "-"}</div>
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-1">
                          Stok: {item.stock} {data.units.find((u) => u.id === item.unitId)?.name}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {data.categories.find((c) => c.id === item.categoryId)?.name || "Tanpa Kategori"}
                      </span>
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        Sup: {data.suppliers.find((s) => s.id === item.supplierId)?.name || "-"}
                      </span>
                    </div>
                    <div className="flex justify-end gap-2 mt-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                        <Button
                          onClick={() => openEditModal(item)}
                          variant="outline"
                          size="sm"
                          className="h-8 flex-1 text-indigo-600 hover:text-indigo-700"
                        >
                          <Edit className="w-4 h-4 mr-1" /> Edit
                        </Button>
                        <Button
                          onClick={() => handleDelete(item.id, "items")}
                          variant="outline"
                          size="sm"
                          className="h-8 flex-1 text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Hapus
                        </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
          <table className={\`w-full text-sm text-left min-w-[800px] \${activeTab === 'items' ? 'hidden md:table' : ''}\`}>`;

code = code.replace(tableClassRegex, replacement);

fs.writeFileSync('src/pages/MasterData.tsx', code);
console.log('Mobile view added successfully.');
