const fs = require('fs');
let code = fs.readFileSync('src/components/StockOpname.tsx', 'utf8');

// 1. Add state
const stateAddStr = `  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  
  const currentUserCategories = currentUser?.allowedCategoryIds || [];
  const hasCategoryRestriction = currentUser?.role !== "ADMIN" && currentUserCategories.length > 0;
`;
code = code.replace(`  const [searchTerm, setSearchTerm] = useState("");`, stateAddStr);

// 2. Modify template download to only download filtered items
const templateSearch = `const itemsData = data.items.map(item => ({`;
const templateReplace = `const itemsToDownload = selectedCategory === "ALL" 
      ? data.items 
      : data.items.filter(item => item.categoryId === selectedCategory);
    
    const itemsData = itemsToDownload.map(item => ({`;
code = code.replace(templateSearch, templateReplace);

// 3. Modify filtered items
const filterSearch = `const filteredItems = data.items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );`;
const filterReplace = `const filteredItems = data.items.filter(i => {
    if (hasCategoryRestriction && !currentUserCategories.includes(i.categoryId)) return false;
    if (selectedCategory !== "ALL" && i.categoryId !== selectedCategory) return false;
    
    return i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           i.sku.toLowerCase().includes(searchTerm.toLowerCase());
  });`;
code = code.replace(filterSearch, filterReplace);

// 4. Add dropdown to UI
const uiSearch = `<div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari Barang (SKU / Nama)..."
            className="pl-9 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>`;

const uiReplace = `<div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cari Barang (SKU / Nama)..."
              className="pl-9 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex h-10 w-full sm:w-[150px] rounded-md border border-slate-200 bg-white dark:bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:border-slate-700 dark:text-slate-50"
          >
            <option value="ALL">Semua Kategori</option>
            {data.categories
              .filter(c => !hasCategoryRestriction || currentUserCategories.includes(c.id))
              .map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>`;
code = code.replace(uiSearch, uiReplace);

fs.writeFileSync('src/components/StockOpname.tsx', code);
console.log('StockOpname.tsx updated');
