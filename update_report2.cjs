const fs = require('fs');
let code = fs.readFileSync('src/pages/Report.tsx', 'utf8');

// 1. Imports
code = code.replace(
  'import { Search, ArrowDownRight, ArrowUpRight, Download } from "lucide-react";',
  'import { Search, ArrowDownRight, ArrowUpRight, Download, FileSpreadsheet, FileText } from "lucide-react";\nimport * as XLSX from "xlsx";\nimport { jsPDF } from "jspdf";\nimport autoTable from "jspdf-autotable";'
);

// 2. States
code = code.replace(
  'const [lowStockDate, setLowStockDate] = useState',
  `const [lowStockCategory, setLowStockCategory] = useState("ALL");
  const [lowStockDate, setLowStockDate] = useState`
);

// 3. Update the UI for filters and export buttons
const searchString = `<div className="p-4 border-b dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Rekap Tanggal:</span>
              <Input
                type="date"
                className="w-48"
                value={lowStockDate}
                onChange={(e) => setLowStockDate(e.target.value)}
              />
            </div>`;

const newUI = `<div className="p-4 border-b dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal:</span>
                  <Input
                    type="date"
                    className="w-40"
                    value={lowStockDate}
                    onChange={(e) => setLowStockDate(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Kategori:</span>
                  <select
                    value={lowStockCategory}
                    onChange={(e) => setLowStockCategory(e.target.value)}
                    className="flex h-10 w-full sm:w-[150px] rounded-md border border-slate-200 bg-white dark:bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:border-slate-700 dark:text-slate-50"
                  >
                    <option value="ALL">Semua Kategori</option>
                    {data.categories
                      .filter(c => !hasCategoryRestriction || currentUserCategories.includes(c.id))
                      .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => exportLowStock('excel')} className="h-10 text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50 dark:hover:bg-emerald-900/20">
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportLowStock('pdf')} className="h-10 text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-900/20">
                  <FileText className="w-4 h-4 mr-2" /> PDF
                </Button>
              </div>
            </div>`;

code = code.replace(searchString, newUI);

// 4. Update the mapping logic
const mapSearchStr = 'const lowStockItemsToday = data.items.map(item => {';
const newMapLogic = `const exportLowStock = (type: 'excel' | 'pdf') => {
    if (!lowStockDate) return;
    
    // Hitung data stok menipis harian sama seperti yang ditampilkan
    const targetDate = new Date(lowStockDate);
    targetDate.setHours(23, 59, 59, 999);
    const startOfTargetDate = new Date(lowStockDate);
    startOfTargetDate.setHours(0, 0, 0, 0);

    const itemsToExport = data.items.map(item => {
      if (hasCategoryRestriction && !currentUserCategories.includes(item.categoryId)) return null;
      if (lowStockCategory !== "ALL" && item.categoryId !== lowStockCategory) return null;

      const hasOutToday = data.transactions.some(tx => {
        const txDate = new Date(tx.date);
        const isOut = tx.type === "OUT" && !(tx.notes?.toLowerCase().includes("retur") || tx.notes?.toLowerCase().includes("return"));
        return tx.itemId === item.id && isOut && txDate >= startOfTargetDate && txDate <= targetDate;
      });

      if (!hasOutToday) return null;

      let stockAtTargetDate = item.stock || 0;
      data.transactions.forEach(tx => {
        if (tx.itemId !== item.id) return;
        const txDate = new Date(tx.date);
        if (txDate > targetDate) {
          if (tx.type === "IN") {
            stockAtTargetDate -= tx.qty;
          } else if (tx.type === "OUT") {
            stockAtTargetDate += tx.qty;
          }
        }
      });

      const minStock = item.minStock || 0;
      if (stockAtTargetDate <= minStock) {
        return { item, stockAtDate: stockAtTargetDate, minStock };
      }
      return null;
    }).filter(Boolean) as { item: any; stockAtDate: number; minStock: number }[];

    if (itemsToExport.length === 0) {
      alert("Tidak ada data untuk diekspor");
      return;
    }

    // Kelompokkan berdasarkan supplier utama
    const groupedData: Record<string, typeof itemsToExport> = {};
    itemsToExport.forEach(row => {
      const supplierId = row.item.supplierId || 'none';
      if (!groupedData[supplierId]) groupedData[supplierId] = [];
      groupedData[supplierId].push(row);
    });

    const getSupplierName = (id?: string) => {
      if (!id || id === 'none') return "Tanpa Supplier";
      return data.suppliers.find(s => s.id === id)?.name || "Supplier Tidak Dikenal";
    };

    const getUnitName = (id: string) => data.units.find(u => u.id === id)?.name || "";

    const rows: any[] = [];
    Object.keys(groupedData).forEach(supplierId => {
      // Add a header row for the supplier
      rows.push({
        isHeader: true,
        supplierName: getSupplierName(supplierId),
      });
      groupedData[supplierId].forEach(row => {
        rows.push({
          isHeader: false,
          sku: row.item.sku || '-',
          name: row.item.name,
          stock: \`\${row.stockAtDate} \${getUnitName(row.item.unitId)}\`,
          minStock: \`\${row.minStock} \${getUnitName(row.item.unitId)}\`,
          altSupplier: getSupplierName(row.item.altSupplierId),
        });
      });
    });

    if (type === 'excel') {
      const wsData = [];
      wsData.push(["Laporan Stok Menipis Harian"]);
      wsData.push([\`Tanggal: \${lowStockDate}\`]);
      wsData.push([]); // Empty row
      
      let currentSupplier = "";
      rows.forEach(r => {
        if (r.isHeader) {
          wsData.push([]);
          wsData.push([\`Supplier Utama: \${r.supplierName}\`]);
          wsData.push(["SKU", "Nama Produk", "Sisa Stok", "Batas Minimum", "Supplier Alternatif"]);
        } else {
          wsData.push([r.sku, r.name, r.stock, r.minStock, r.altSupplier]);
        }
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stok Menipis");
      XLSX.writeFile(wb, \`Stok_Menipis_Harian_\${lowStockDate}.xlsx\`);
    } else {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Laporan Stok Menipis Harian", 14, 15);
      doc.setFontSize(10);
      doc.text(\`Tanggal: \${lowStockDate}\`, 14, 22);

      let finalY = 28;

      Object.keys(groupedData).forEach(supplierId => {
        const supName = getSupplierName(supplierId);
        doc.setFontSize(11);
        doc.text(\`Supplier Utama: \${supName}\`, 14, finalY + 5);
        
        const tableData = groupedData[supplierId].map(r => [
          r.item.sku || '-',
          r.item.name,
          \`\${r.stockAtDate} \${getUnitName(r.item.unitId)}\`,
          \`\${r.minStock} \${getUnitName(r.item.unitId)}\`,
          getSupplierName(r.item.altSupplierId)
        ]);

        autoTable(doc, {
          startY: finalY + 8,
          head: [["SKU", "Nama Produk", "Sisa Stok", "Batas Minimum", "Supplier Alternatif"]],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
          styles: { fontSize: 8 },
        });

        finalY = (doc as any).lastAutoTable.finalY + 5;
      });

      doc.save(\`Stok_Menipis_Harian_\${lowStockDate}.pdf\`);
    }
  };

  const lowStockItemsToday = data.items.map(item => {
    if (hasCategoryRestriction && !currentUserCategories.includes(item.categoryId)) return null;
    if (lowStockCategory !== "ALL" && item.categoryId !== lowStockCategory) return null;`;

code = code.replace(mapSearchStr, newMapLogic);

fs.writeFileSync('src/pages/Report.tsx', code);
console.log('Done!');
