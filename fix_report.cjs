const fs = require('fs');
let code = fs.readFileSync('src/pages/Report.tsx', 'utf8');

const targetStr = `const exportLowStock`;
const index = code.indexOf(targetStr);
if (index === -1) {
  console.log('Not found');
  process.exit(1);
}

// Cut everything after `const exportLowStock` and rebuild the end
code = code.substring(0, index);

code += `const exportLowStock = (type: 'excel' | 'pdf') => {
    if (!lowStockDate) return;
    
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
      wsData.push([]); 
      
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
          headStyles: { fillColor: [79, 70, 229] }, 
          styles: { fontSize: 8 },
        });

        finalY = (doc as any).lastAutoTable.finalY + 5;
      });

      doc.save(\`Stok_Menipis_Harian_\${lowStockDate}.pdf\`);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4 custom-scrollbar">
      {(() => {
        if (!lowStockDate) return <div className="text-center text-slate-500 py-12">Pilih tanggal terlebih dahulu.</div>;

        const targetDate = new Date(lowStockDate);
        targetDate.setHours(23, 59, 59, 999);
        const startOfTargetDate = new Date(lowStockDate);
        startOfTargetDate.setHours(0, 0, 0, 0);

        const lowStockItemsToday = data.items.map(item => {
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

        if (lowStockItemsToday.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <ArrowDownRight className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">Tidak Ada Data</h3>
              <p className="text-sm text-center max-w-sm">
                Tidak ada barang yang mencapai stok minimum akibat pengeluaran pada tanggal tersebut.
              </p>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {lowStockItemsToday.map(({ item, stockAtDate, minStock }) => (
              <div key={item.id} className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-xl p-5 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{item.name}</h4>
                  <span className="px-2 py-1 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-md whitespace-nowrap ml-2">
                    Stok Menipis
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mb-4">{item.sku}</p>
                <div className="mb-4 space-y-1">
                  <p className="text-xs text-slate-500">Supplier: <span className="font-semibold text-slate-700 dark:text-slate-300">{data.suppliers.find(s => s.id === item.supplierId)?.name || "Tanpa Supplier"}</span></p>
                  <p className="text-xs text-slate-500">Alt Supplier: <span className="font-semibold text-slate-700 dark:text-slate-300">{data.suppliers.find(s => s.id === item.altSupplierId)?.name || "-"}</span></p>
                </div>
                
                <div className="mt-auto grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Sisa Stok Tgl {new Date(lowStockDate).getDate()}</span>
                    <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                      {stockAtDate} <span className="text-xs font-medium text-slate-500">{data.units.find(u => u.id === item.unitId)?.name || ""}</span>
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Batas Minimum</span>
                    <span className="text-lg font-black text-slate-700 dark:text-slate-300">
                      {minStock} <span className="text-xs font-medium text-slate-500">{data.units.find(u => u.id === item.unitId)?.name || ""}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  </div>
)}
      </Card>
    </div>
  );
};
`;

fs.writeFileSync('src/pages/Report.tsx', code);
console.log('Fixed Report.tsx');
