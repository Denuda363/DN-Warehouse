import React, { useState } from "react";
import { useAppContext } from "../store/AppContext";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Search, Download, Upload, AlertTriangle, CheckCircle, RotateCcw } from "lucide-react";
import * as XLSX from "xlsx";
import { Transaction } from "../types";

export const StockOpname: React.FC = () => {
  const { data, updateData, currentUser, logActivity } = useAppContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  
  const currentUserCategories = currentUser?.allowedCategoryIds || [];
  const hasCategoryRestriction = currentUser?.role !== "ADMIN" && currentUserCategories.length > 0;

  const [adjustments, setAdjustments] = useState<Record<string, number>>({});
  const [importErrors, setImportErrors] = useState<string[]>([]);
  
  const handlePhysicalStockChange = (itemId: string, physicalStockStr: string) => {
    const val = parseInt(physicalStockStr, 10);
    setAdjustments(prev => ({
      ...prev,
      [itemId]: isNaN(val) ? 0 : val
    }));
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const itemsToDownload = selectedCategory === "ALL" 
      ? data.items 
      : data.items.filter(item => item.categoryId === selectedCategory);
    
    const itemsData = itemsToDownload.map(item => ({
      ID: item.id,
      SKU: item.sku,
      Nama: item.name,
      StokKomputer: item.stock,
      StokFisik: "",
    }));
    
    const ws = XLSX.utils.json_to_sheet(itemsData);
    
    // Add some styling or just simple column widths
    ws["!cols"] = [
      { wch: 15 }, // ID
      { wch: 15 }, // SKU
      { wch: 30 }, // Nama
      { wch: 15 }, // StokKomputer
      { wch: 15 }, // StokFisik
    ];

    XLSX.utils.book_append_sheet(wb, ws, "StockOpname");
    XLSX.writeFile(wb, `Template_StockOpname_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const dataStr = event.target?.result;
        const wb = XLSX.read(dataStr, { type: "array" });
        const wsName = wb.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[wsName]);
        
        let newAdjustments = { ...adjustments };
        let errors: string[] = [];

        rows.forEach((row, index) => {
          const id = row.ID;
          const fisik = parseInt(row.StokFisik, 10);
          
          if (!id) {
            errors.push(`Baris ${index + 2}: ID Barang tidak ditemukan.`);
            return;
          }
          
          const item = data.items.find(i => i.id === id);
          if (!item) {
            errors.push(`Baris ${index + 2}: Barang dengan ID ${id} tidak ditemukan di sistem.`);
            return;
          }

          if (isNaN(fisik)) {
            errors.push(`Baris ${index + 2}: Stok fisik untuk barang ${item.name} tidak valid.`);
            return;
          }

          if (fisik < 0) {
            errors.push(`Baris ${index + 2}: Stok fisik tidak boleh negatif (${item.name}).`);
            return;
          }

          newAdjustments[id] = fisik;
        });

        setAdjustments(newAdjustments);
        setImportErrors(errors);
        
        if (errors.length > 0) {
          alert(`Import selesai dengan beberapa error. Silakan cek detail error.`);
        } else {
          alert("Data opname berhasil diimport dari Excel. Silakan periksa dan simpan.");
        }
      } catch (err) {
        console.error("Excel import error", err);
        alert("Gagal membaca file Excel. Pastikan format sesuai.");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveAdjustments = () => {
    const idsToAdjust = Object.keys(adjustments);
    if (idsToAdjust.length === 0) {
      alert("Belum ada data stok fisik yang dimasukkan.");
      return;
    }

    if (!confirm(`Simpan penyesuaian untuk ${idsToAdjust.length} barang?`)) return;

    let updatedItems = [...data.items];
    const newTransactions: Transaction[] = [];

    idsToAdjust.forEach(id => {
      const itemIndex = updatedItems.findIndex(i => i.id === id);
      if (itemIndex === -1) return;
      
      const item = updatedItems[itemIndex];
      const physical = adjustments[id];
      const diff = physical - item.stock;

      if (diff !== 0) {
        // Create transaction
        const tx: Transaction = {
          id: `tx-opname-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date: new Date().toISOString(),
          type: diff > 0 ? "IN" : "OUT",
          itemId: item.id,
          qty: Math.abs(diff),
          notes: `Stock Opname (Sistem: ${item.stock}, Fisik: ${physical})`,
          userId: currentUser?.id || "unknown",
        };
        newTransactions.push(tx);

        // Update item stock
        let unbatchedStock = item.unbatchedStock !== undefined ? item.unbatchedStock : item.stock;
        
        // For opname, we adjust unbatched stock for simplicity, since batches are complex.
        unbatchedStock = Math.max(0, unbatchedStock + diff);
        
        const batches = item.batches || [];
        const totalBatchStock = batches.reduce((sum, b) => sum + (b.stock || 0), 0);
        
        updatedItems[itemIndex] = {
          ...item,
          unbatchedStock,
          stock: unbatchedStock + totalBatchStock
        };
      }
    });

    if (newTransactions.length > 0) {
      logActivity("Stock Opname", `Menyesuaikan stok untuk ${newTransactions.length} barang`);
      updateData({
        items: updatedItems,
        transactions: [...newTransactions, ...data.transactions]
      });
      alert(`Berhasil menyimpan penyesuaian untuk ${newTransactions.length} barang.`);
    } else {
      alert("Tidak ada perbedaan stok yang perlu disimpan.");
    }

    // Reset adjustments
    setAdjustments({});
    setImportErrors([]);
  };

  const filteredItems = data.items.filter(i => {
    if (hasCategoryRestriction && !currentUserCategories.includes(i.categoryId)) return false;
    if (selectedCategory !== "ALL" && i.categoryId !== selectedCategory) return false;
    
    return i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           i.sku.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
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
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={downloadTemplate} className="text-slate-600 dark:text-slate-300">
            <Download className="w-4 h-4 mr-2" /> Template
          </Button>
          <div className="relative">
            <Button variant="outline" className="text-slate-600 dark:text-slate-300 w-full relative">
              <Upload className="w-4 h-4 mr-2" /> Import Excel
              <input 
                type="file" 
                accept=".xlsx, .xls"
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                onChange={handleImportExcel}
                title="Import Excel"
              />
            </Button>
          </div>
          <Button 
            onClick={handleSaveAdjustments} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={Object.keys(adjustments).length === 0}
          >
            <CheckCircle className="w-4 h-4 mr-2" /> Simpan Penyesuaian
          </Button>
        </div>
      </div>

      {importErrors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm border border-red-200 dark:border-red-900/50">
          <div className="font-bold flex items-center mb-2">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Terdapat error saat import:
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {importErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">SKU</th>
                <th className="px-6 py-3 font-medium">Nama Barang</th>
                <th className="px-6 py-3 font-medium text-center">Stok Sistem</th>
                <th className="px-6 py-3 font-medium text-center">Stok Fisik</th>
                <th className="px-6 py-3 font-medium text-center">Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredItems.map(item => {
                const physical = adjustments[item.id] !== undefined ? adjustments[item.id] : "";
                const diff = physical !== "" ? (physical as number) - item.stock : 0;
                
                return (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-3 font-mono text-xs">{item.sku}</td>
                    <td className="px-6 py-3">{item.name}</td>
                    <td className="px-6 py-3 text-center font-medium">{item.stock}</td>
                    <td className="px-6 py-3 text-center">
                      <Input 
                        type="number"
                        min="0"
                        className="w-24 text-center mx-auto h-8"
                        value={physical}
                        onChange={(e) => handlePhysicalStockChange(item.id, e.target.value)}
                        placeholder="Fisik"
                      />
                    </td>
                    <td className="px-6 py-3 text-center">
                      {physical !== "" ? (
                        <span className={`font-bold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">
                    Data tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
