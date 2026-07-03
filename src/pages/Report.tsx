import React, { useState } from "react";
import { useAppContext } from "../store/AppContext";
import { Card } from "../components/ui/Card";
import { Search, ArrowDownRight, ArrowUpRight, Download } from "lucide-react";
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

  const currentUserCategories = currentUser?.allowedCategoryIds || [];
  const hasCategoryRestriction =
    currentUser?.role !== "ADMIN" && currentUserCategories.length > 0;

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-120px)] w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Laporan Arus Stok
          </h1>
          <p className="text-slate-500 text-sm">
            Riwayat seluruh transaksi keluar dan masuk.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="text-slate-700 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-300 w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden w-full">
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
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 sticky top-0 border-b dark:border-slate-800">
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
              {data.transactions.length === 0 && (
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
      </Card>
    </div>
  );
};
