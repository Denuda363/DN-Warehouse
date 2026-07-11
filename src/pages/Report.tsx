import React, { useState } from "react";
import { useAppContext } from "../store/AppContext";
import { Card } from "../components/ui/Card";
import { Search, ArrowDownRight, ArrowUpRight, Download, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export const Report: React.FC = () => {
  const { data, currentUser } = useAppContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "IN" | "OUT" | "RETURN">(
    "ALL",
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState<"arus" | "stok-menipis">("arus");
  const [lowStockCategory, setLowStockCategory] = useState("ALL");
  const [lowStockDate, setLowStockDate] = useState(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - offset).toISOString().split('T')[0];
  });

  const currentUserCategories = currentUser?.allowedCategoryIds || [];
  const hasCategoryRestriction =
    currentUser?.role !== "ADMIN" && currentUserCategories.length > 0;

  const exportLowStock = (type: 'excel' | 'pdf') => {
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
          stock: `${row.stockAtDate} ${getUnitName(row.item.unitId)}`,
          minStock: `${row.minStock} ${getUnitName(row.item.unitId)}`,
          altSupplier: getSupplierName(row.item.altSupplierId),
        });
      });
    });

    if (type === 'excel') {
      const wsData = [];
      wsData.push(["Laporan Stok Menipis Harian"]);
      wsData.push([`Tanggal: ${lowStockDate}`]);
      wsData.push([]); 
      
      rows.forEach(r => {
        if (r.isHeader) {
          wsData.push([]);
          wsData.push([`Supplier Utama: ${r.supplierName}`]);
          wsData.push(["SKU", "Nama Produk", "Sisa Stok", "Batas Minimum", "Supplier Alternatif"]);
        } else {
          wsData.push([r.sku, r.name, r.stock, r.minStock, r.altSupplier]);
        }
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stok Menipis");
      XLSX.writeFile(wb, `Stok_Menipis_Harian_${lowStockDate}.xlsx`);
    } else {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Laporan Stok Menipis Harian", 14, 15);
      doc.setFontSize(10);
      doc.text(`Tanggal: ${lowStockDate}`, 14, 22);

      let finalY = 28;

      Object.keys(groupedData).forEach(supplierId => {
        const supName = getSupplierName(supplierId);
        doc.setFontSize(11);
        doc.text(`Supplier Utama: ${supName}`, 14, finalY + 5);
        
        const tableData = groupedData[supplierId].map(r => [
          r.item.sku || '-',
          r.item.name,
          `${r.stockAtDate} ${getUnitName(r.item.unitId)}`,
          `${r.minStock} ${getUnitName(r.item.unitId)}`,
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

      doc.save(`Stok_Menipis_Harian_${lowStockDate}.pdf`);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-120px)] w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Laporan
          </h1>
          <p className="text-slate-500 text-sm">
            Riwayat arus stok dan rekapan harian.
          </p>
        </div>
      </div>

      <Card className="p-1 flex gap-1 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto custom-scrollbar w-max max-w-full">
        <button
          onClick={() => setActiveTab("arus")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
            activeTab === "arus"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
          }`}
        >
          Arus Stok
        </button>
        <button
          onClick={() => setActiveTab("stok-menipis")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
            activeTab === "stok-menipis"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
          }`}
        >
          Stok Menipis Harian
        </button>
      </Card>

      <Card className="flex-1 flex flex-col overflow-hidden w-full">
        {activeTab === "arus" ? (
          <>
            <div className="p-4 border-b dark:border-slate-800 flex flex-col xl:flex-row gap-4 bg-white dark:bg-slate-900">
              <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto flex-1">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Cari transaksi..."
                    className="pl-9 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="flex h-10 w-full sm:w-[150px] rounded-md border border-slate-200 bg-white dark:bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:border-slate-700 dark:text-slate-50"
                >
                  <option value="ALL">Semua Transaksi</option>
                  <option value="IN">Barang Masuk</option>
                  <option value="OUT">Barang Keluar</option>
                  <option value="RETURN">Return / Retur</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto mt-2 xl:mt-0">
                <span className="text-sm text-slate-500 whitespace-nowrap self-start sm:self-center">
                  Tanggal:
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input
                    type="date"
                    className="w-full sm:w-36"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <span className="text-slate-400">-</span>
                  <Input
                    type="date"
                    className="w-full sm:w-36"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0 overflow-auto bg-white dark:bg-slate-900 custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 sticky top-0 border-b dark:border-slate-800 z-10">
                  <tr>
                    <th className="px-6 py-4 font-medium w-48">Tanggal</th>
                    <th className="px-6 py-4 font-medium w-32">Jenis</th>
                    <th className="px-6 py-4 font-medium">Barang</th>
                    <th className="px-6 py-4 font-medium w-48">Supplier</th>
                    <th className="px-6 py-4 font-medium text-right w-32">Qty</th>
                    <th className="px-6 py-4 font-medium">Keterangan</th>
                    <th className="px-6 py-4 font-medium w-32">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                  {data.transactions
                    .filter((t) => {
                      const item = data.items.find((i) => i.id === t.itemId);
                      if (
                        hasCategoryRestriction &&
                        (!item || !currentUserCategories.includes(item.categoryId))
                      ) {
                        return false;
                      }
                      const isReturn =
                        t.notes?.toLowerCase().includes("retur") ||
                        t.notes?.toLowerCase().includes("return");
                      if (filterType === "RETURN" && !isReturn) return false;
                      if (filterType === "IN" && (t.type !== "IN" || isReturn))
                        return false;
                      if (filterType === "OUT" && (t.type !== "OUT" || isReturn))
                        return false;
                      if (startDate) {
                        const tDate = new Date(t.date);
                        const sDate = new Date(startDate);
                        sDate.setHours(0, 0, 0, 0);
                        if (tDate < sDate) return false;
                      }
                      if (endDate) {
                        const tDate = new Date(t.date);
                        const eDate = new Date(endDate);
                        eDate.setHours(23, 59, 59, 999);
                        if (tDate > eDate) return false;
                      }
                      const searchStr =
                        `${item?.name || ""} ${t.notes} ${t.type}`.toLowerCase();
                      return searchStr.includes(searchTerm.toLowerCase());
                    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((tx) => {
                      const item = data.items.find((i) => i.id === tx.itemId);
                      const user = data.users.find((u) => u.id === tx.userId);
                      const supplier = tx.supplierId
                        ? data.suppliers.find((s) => s.id === tx.supplierId)
                        : undefined;
                      const date = new Date(tx.date);
                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            {date.toLocaleDateString("id-ID", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-6 py-4">
                            {(() => {
                              const isRetur =
                                tx.notes?.toLowerCase().includes("retur") ||
                                tx.notes?.toLowerCase().includes("return");
                              if (isRetur) {
                                return (
                                  <span className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
                                    {tx.type === "IN" ? (
                                      <ArrowDownRight className="w-4 h-4 mr-1" />
                                    ) : (
                                      <ArrowUpRight className="w-4 h-4 mr-1" />
                                    )}{" "}
                                    Return
                                  </span>
                                );
                              }
                              return tx.type === "IN" ? (
                                <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                                  <ArrowDownRight className="w-4 h-4 mr-1" /> Masuk
                                </span>
                              ) : (
                                <span className="flex items-center text-orange-600 dark:text-orange-400 font-medium">
                                  <ArrowUpRight className="w-4 h-4 mr-1" /> Keluar
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 font-medium">
                            {item ? `${item.name} (${item.sku})` : "Item dihapus"}
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                            {supplier ? supplier.name : "-"}
                          </td>
                          <td
                            className={`px-6 py-4 text-right font-bold ${tx.type === "IN" ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`}
                          >
                            {tx.type === "IN" ? "+" : "-"}
                            {tx.qty}
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {tx.notes || "-"}
                          </td>
                          <td className="px-6 py-4 capitalize text-sm">
                            {user?.username || tx.userId}
                          </td>
                        </tr>
                      );
                    })}
                  {(data.transactions || []).length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        Belum ada transaksi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900/50">
            <div className="p-4 border-b dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                <Button variant="outline" size="icon" onClick={() => exportLowStock('excel')} className="h-10 w-10 text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50 dark:hover:bg-emerald-900/20" title="Export Excel">
                  <FileSpreadsheet className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => exportLowStock('pdf')} className="h-10 w-10 text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-900/20" title="Export PDF">
                  <FileText className="w-4 h-4" />
                </Button>
              </div>
            </div>
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
