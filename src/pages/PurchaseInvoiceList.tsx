import React, { useState } from "react";
import { useAppContext } from "../store/AppContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
  Search,
  FileText,
  Ban,
  Trash2,
  Edit,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";
import { PurchaseInvoice, PurchaseInvoiceItem } from "../types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const calculateReturnTotal = (inv: PurchaseInvoice) => {
  const returnedRawSubtotal = inv.items.reduce((acc, item) => {
    const itemSubtotalPerUnit = item.qty > 0 ? item.subtotal / item.qty : 0;
    return acc + itemSubtotalPerUnit * item.returnedQty;
  }, 0);

  if (returnedRawSubtotal === 0) return 0;

  const rawSubtotal = inv.items.reduce((acc, item) => acc + item.subtotal, 0);
  const ratio = rawSubtotal > 0 ? returnedRawSubtotal / rawSubtotal : 0;

  let returnedGlobalDiscount = 0;
  if (inv.invoiceDiscType === "%") {
    returnedGlobalDiscount = (returnedRawSubtotal * inv.invoiceDiscValue) / 100;
  } else {
    returnedGlobalDiscount = inv.invoiceDiscValue * ratio;
  }

  const returnedTaxableAmount = returnedRawSubtotal - returnedGlobalDiscount;
  const returnedTaxAmount = inv.useTax
    ? (returnedTaxableAmount * inv.taxPercent) / 100
    : 0;

  return returnedTaxableAmount + returnedTaxAmount;
};

export const PurchaseInvoiceList: React.FC<{
  onEdit: (id: string) => void;
}> = ({ onEdit }) => {
  const { data, updateData, currentUser, logActivity } = useAppContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [returnModal, setReturnModal] = useState<{
    isOpen: boolean;
    invoiceId: string;
    itemId: string;
    maxQty: number;
  } | null>(null);
  const [returnQty, setReturnQty] = useState<number>(0);
  const [returnDate, setReturnDate] = useState<string>("");
  const [returnNote, setReturnNote] = useState<string>("");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(
    null,
  );

  const handleCancel = (invoice: PurchaseInvoice) => {
    if (invoice.status === "CANCELED") return;
    if (
      !confirm(
        "Apakah Anda yakin ingin membatalkan faktur ini? Stok barang akan dikurangi kembali.",
      )
    )
      return;

    // We must reverse the stock additions
    let updatedItems = [...data.items];
    invoice.items.forEach((invItem) => {
      let actualRevertQty = invItem.qty - invItem.returnedQty;
      updatedItems = updatedItems.map((item) => {
        if (item.id === invItem.itemId) {
          return { ...item, stock: item.stock - actualRevertQty }; // reduce stock back
        }
        return item;
      });
    });

    // We can add "OUT" transactions for the cancellation/revert, or just mark the invoice as "CANCELED"
    const revertTransactions = invoice.items.map((invItem) => ({
      id: `tx-out-cancel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString(),
      type: "OUT" as const,
      itemId: invItem.itemId,
      qty: invItem.qty - invItem.returnedQty, // only the qty that wasn't already returned
      supplierId: invoice.supplierId,
      notes: `Pembatalan Faktur: ${invoice.invoiceNo}`,
      userId: currentUser?.id || "unknown",
      invoiceId: invoice.id,
    }));

    const updatedInvoices = data.purchaseInvoices.map((inv) =>
      inv.id === invoice.id ? { ...inv, status: "CANCELED" as const } : inv,
    );

    logActivity(
      "Batal Pembelian",
      `Membatalkan faktur pembelian ${invoice.invoiceNo}`,
    );

    updateData({
      purchaseInvoices: updatedInvoices,
      items: updatedItems,
      transactions: [...revertTransactions, ...data.transactions],
    });
  };

  const openReturnModal = (
    invoiceId: string,
    itemId: string,
    maxQty: number,
  ) => {
    setReturnModal({ isOpen: true, invoiceId, itemId, maxQty });
    setReturnQty(1);
    setReturnDate(new Date().toISOString().substring(0, 10)); // Default to YYYY-MM-DD
    setReturnNote("");
  };

  const executeReturn = () => {
    if (!returnModal) return;
    const { invoiceId, itemId, maxQty } = returnModal;
    const qty = returnQty;

    if (!qty || qty <= 0) return;

    const invoice = data.purchaseInvoices.find((i) => i.id === invoiceId);
    if (!invoice || invoice.status === "CANCELED") return;

    const invoiceItem = invoice.items.find((i) => i.itemId === itemId);
    if (!invoiceItem) return;

    const availableToReturn = invoiceItem.qty - invoiceItem.returnedQty;
    if (qty > availableToReturn) {
      alert(
        `Jumlah return tidak boleh melebihi qty faktur (${availableToReturn})!`,
      );
      return;
    }

    // Process return: deduct stock and update returnedQty
    const itemTarget = data.items.find((i) => i.id === itemId);
    const itemStock = itemTarget?.stock || 0;
    if (qty > itemStock) {
      alert("Stok barang di gudang tidak mencukupi untuk return!");
      return;
    }

    const updatedItems = data.items.map((item) => {
      if (item.id === itemId) {
        return { ...item, stock: item.stock - qty };
      }
      return item;
    });

    const returnTx = {
      id: `tx-out-ret-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: returnDate
        ? new Date(returnDate).toISOString()
        : new Date().toISOString(),
      type: "OUT" as const,
      itemId: itemId,
      qty: qty,
      supplierId: invoice.supplierId,
      notes: `Return Faktur: ${invoice.invoiceNo}`,
      userId: currentUser?.id || "unknown",
      invoiceId: invoice.id,
      returnDate: returnDate || new Date().toISOString().substring(0, 10),
      returnNote: returnNote || "",
    };

    const updatedInvoices = data.purchaseInvoices.map((inv) => {
      if (inv.id !== invoiceId) return inv;
      let allReturned = true;
      const updatedInvoiceItems = inv.items.map((i) => {
        if (i.itemId === itemId) {
          const newReturnedQty = i.returnedQty + qty;
          if (newReturnedQty < i.qty) allReturned = false;
          return { ...i, returnedQty: newReturnedQty };
        }
        if (i.returnedQty < i.qty) allReturned = false;
        return i;
      });

      return {
        ...inv,
        items: updatedInvoiceItems,
        status: allReturned ? "RETURNED" : inv.status,
      };
    });

    logActivity(
      "Return Pembelian",
      `Return barang ${itemTarget?.name || itemId} sejumlah ${qty} dari faktur ${invoice.invoiceNo}`,
    );

    updateData({
      purchaseInvoices: updatedInvoices,
      items: updatedItems,
      transactions: [returnTx, ...data.transactions],
    });
    setReturnModal(null);
  };

  const handleDelete = (id: string) => {
    if (
      !confirm(
        "Hapus log faktur sepenuhnya? (Stok tidak akan di-revert secara otomatis!)",
      )
    )
      return;
    const invTarget = data.purchaseInvoices.find((i) => i.id === id);
    logActivity(
      "Hapus Faktur",
      `Menghapus data faktur ${invTarget?.invoiceNo || id}`,
    );
    updateData({
      purchaseInvoices: data.purchaseInvoices.filter((i) => i.id !== id),
    });
  };

  const currentUserCategories = currentUser?.allowedCategoryIds || [];
  const hasCategoryRestriction =
    currentUser?.role !== "ADMIN" && currentUserCategories.length > 0;

  const filteredInvoices =
    data.purchaseInvoices?.filter((inv) => {
      if (startDate && inv.invoiceDate.substring(0, 10) < startDate)
        return false;
      if (endDate && inv.invoiceDate.substring(0, 10) > endDate) return false;

      if (hasCategoryRestriction) {
        const hasAllowedItem = inv.items.some((invItem) => {
          const product = data.items.find((i) => i.id === invItem.itemId);
          return product && currentUserCategories.includes(product.categoryId);
        });
        if (!hasAllowedItem) return false;
      }

      const supplier = data.suppliers.find((s) => s.id === inv.supplierId);
      const searchLower = searchTerm.toLowerCase();

      const hasMatchingItem = inv.items.some((invItem) => {
        const product = data.items.find((i) => i.id === invItem.itemId);
        return product?.name.toLowerCase().includes(searchLower);
      });

      return (
        inv.invoiceNo.toLowerCase().includes(searchLower) ||
        supplier?.name.toLowerCase().includes(searchLower) ||
        hasMatchingItem
      );
    }) || [];

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.text("Riwayat Faktur Pembelian", 14, 15);

    const tableData = filteredInvoices.map((inv) => {
      const supplier = data.suppliers.find((s) => s.id === inv.supplierId);
      const date = new Date(inv.invoiceDate).toLocaleDateString("id-ID");
      const returnTotal = calculateReturnTotal(inv);
      const status = inv.status === "CANCELED" ? "DIBATALKAN" : "AKTIF";
      return [
        inv.invoiceNo,
        date,
        supplier?.name || "",
        new Intl.NumberFormat("id-ID").format(inv.total - returnTotal),
        status,
      ];
    });

    autoTable(doc, {
      head: [
        ["No. Faktur", "Tanggal", "Supplier", "Total (Efektif)", "Status"],
      ],
      body: tableData,
      startY: 20,
    });
    doc.save(`riwayat_faktur_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-180px)]">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-slate-900 w-full">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari No. Faktur atau Supplier..."
                className="pl-9 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto text-sm"
              title="Tanggal Awal"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto text-sm"
              title="Tanggal Akhir"
            />
          </div>
          <Button
            variant="outline"
            className="text-slate-600 dark:text-slate-300 w-full sm:w-auto shrink-0"
            onClick={exportPdf}
          >
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 custom-scrollbar relative px-0 sm:px-0">
          {/* Mobile View - Cards */}
          <div className="md:hidden flex flex-col gap-3 p-4">
            {filteredInvoices.map((inv) => {
              const supplier = data.suppliers.find(
                (s) => s.id === inv.supplierId,
              );
              const date = new Date(inv.invoiceDate);
              const isCanceled = inv.status === "CANCELED";
              const isExpanded = expandedInvoiceId === inv.id;
              const returnTotal = calculateReturnTotal(inv);
              const hasReturn = returnTotal > 0;
              const finalEffectiveTotal = inv.total - returnTotal;

              return (
                <Card
                  key={inv.id}
                  className="overflow-hidden bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <div
                    className="p-4 flex flex-col gap-3 cursor-pointer"
                    onClick={() =>
                      setExpandedInvoiceId(isExpanded ? null : inv.id)
                    }
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {inv.invoiceNo}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                          inv.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30"
                            : inv.status === "CANCELED"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30"
                              : "bg-orange-100 text-orange-700 dark:bg-orange-900/30"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest">
                          Tanggal
                        </div>
                        <div className="font-medium">
                          {date.toLocaleDateString("id-ID")}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest">
                          Supplier
                        </div>
                        <div className="font-medium text-slate-700 dark:text-slate-300 truncate">
                          {supplier?.name || "Unknown"}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/60 pt-3">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest">
                          Total
                        </div>
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          Rp{" "}
                          {new Intl.NumberFormat("id-ID").format(
                            finalEffectiveTotal,
                          )}
                        </div>
                        {hasReturn && (
                          <div className="font-mono text-[10px] line-through text-slate-400">
                            Rp{" "}
                            {new Intl.NumberFormat("id-ID").format(inv.total)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!isCanceled && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(inv.id);
                              }}
                              title="Edit"
                              className="text-slate-500 hover:text-indigo-600 h-8 w-8"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancel(inv);
                              }}
                              title="Batal"
                              className="text-slate-500 hover:text-orange-600 h-8 w-8"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(inv.id);
                          }}
                          title="Hapus"
                          className="text-slate-500 hover:text-red-600 h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <button className="ml-1 text-slate-400 hover:text-slate-600">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center">
                        <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-400" />{" "}
                        Item Detail
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {inv.items
                          .filter((item) => {
                            if (hasCategoryRestriction) {
                              const product = data.items.find(
                                (i) => i.id === item.itemId,
                              );
                              return (
                                product &&
                                currentUserCategories.includes(
                                  product.categoryId,
                                )
                              );
                            }
                            return true;
                          })
                          .map((item) => {
                            const product = data.items.find(
                              (i) => i.id === item.itemId,
                            );
                            return (
                              <div
                                key={item.id}
                                className="py-2.5 flex flex-col gap-1.5 text-sm"
                              >
                                <div className="flex justify-between font-medium">
                                  <span>{product?.name || "Unknown"}</span>
                                  <span className="font-mono text-emerald-600">
                                    Rp{" "}
                                    {new Intl.NumberFormat("id-ID").format(
                                      item.subtotal,
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                  <span>
                                    Qty: {item.qty}{" "}
                                    {item.returnedQty > 0 && (
                                      <span className="text-orange-500 ml-1">
                                        (Retur: {item.returnedQty})
                                      </span>
                                    )}
                                  </span>
                                  <span>
                                    {item.batchNo || "-"}{" "}
                                    {item.expDate ? `/ ${item.expDate}` : ""}
                                  </span>
                                </div>
                                {!isCanceled && item.returnedQty < item.qty && (
                                  <div className="flex justify-end mt-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        openReturnModal(
                                          inv.id,
                                          item.itemId,
                                          item.qty - item.returnedQty,
                                        )
                                      }
                                      className="border-orange-200 text-orange-600 hover:bg-orange-50 h-7 text-xs px-3"
                                    >
                                      <RotateCcw className="w-3 h-3 mr-1" />{" "}
                                      Retur
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[800px]">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 sticky top-0 border-b dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">No. Faktur</th>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {filteredInvoices.map((inv) => {
                  const supplier = data.suppliers.find(
                    (s) => s.id === inv.supplierId,
                  );
                  const date = new Date(inv.invoiceDate);
                  const isCanceled = inv.status === "CANCELED";
                  const isExpanded = expandedInvoiceId === inv.id;
                  const returnTotal = calculateReturnTotal(inv);
                  const hasReturn = returnTotal > 0;
                  const finalEffectiveTotal = inv.total - returnTotal;

                  return (
                    <React.Fragment key={inv.id}>
                      <tr
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        onClick={() =>
                          setExpandedInvoiceId(isExpanded ? null : inv.id)
                        }
                      >
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center">
                            <button className="mr-2 text-slate-400 hover:text-slate-600">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                            <FileText className="w-4 h-4 mr-2 text-indigo-500" />
                            {inv.invoiceNo}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {date.toLocaleDateString("id-ID")}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {supplier?.name || "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {hasReturn ? (
                            <div className="flex flex-col items-end">
                              <span className="font-mono text-xs line-through text-slate-400">
                                Rp{" "}
                                {new Intl.NumberFormat("id-ID").format(
                                  inv.total,
                                )}
                              </span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                Rp{" "}
                                {new Intl.NumberFormat("id-ID").format(
                                  finalEffectiveTotal,
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              Rp{" "}
                              {new Intl.NumberFormat("id-ID").format(inv.total)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-1 text-xs font-bold rounded ${
                              inv.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30"
                                : inv.status === "CANCELED"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30"
                                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/30"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {/* We can disable edit/cancel if already canceled */}
                            {!isCanceled && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onEdit(inv.id)}
                                  title="Edit Faktur"
                                  className="text-slate-500 hover:text-indigo-600 h-8 w-8"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCancel(inv)}
                                  title="Batalkan Faktur"
                                  className="text-slate-500 hover:text-orange-600 h-8 w-8"
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(inv.id)}
                              title="Hapus Permanen"
                              className="text-slate-500 hover:text-red-600 h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Show Items Sub-row for Details & Returns */}
                      {isExpanded && (
                        <tr className="bg-slate-50/30 dark:bg-slate-900/30">
                          <td colSpan={6} className="px-0 py-0">
                            <div className="border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 shadow-inner">
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 ml-2 flex items-center">
                                <FileText className="w-4 h-4 mr-2 text-slate-400" />{" "}
                                Detail Barang Faktur {inv.invoiceNo}
                              </h4>
                              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 mx-2 custom-scrollbar">
                                <table className="w-full text-xs text-left min-w-[600px]">
                                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                                    <tr>
                                      <th className="px-3 py-2">Nama Barang</th>
                                      <th className="px-3 py-2 text-center">
                                        Batch / Exp
                                      </th>
                                      <th className="px-3 py-2 text-right">
                                        Harga
                                      </th>
                                      <th className="px-3 py-2 text-center">
                                        Qty Input
                                      </th>
                                      <th className="px-3 py-2 text-center">
                                        Retur
                                      </th>
                                      <th className="px-3 py-2 text-right">
                                        Subtotal
                                      </th>
                                      <th className="px-3 py-2 text-center">
                                        Aksi
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {inv.items
                                      .filter((item) => {
                                        if (hasCategoryRestriction) {
                                          const product = data.items.find(
                                            (i) => i.id === item.itemId,
                                          );
                                          return (
                                            product &&
                                            currentUserCategories.includes(
                                              product.categoryId,
                                            )
                                          );
                                        }
                                        return true;
                                      })
                                      .map((item) => {
                                        const product = data.items.find(
                                          (i) => i.id === item.itemId,
                                        );
                                        let discountComponent = null;
                                        if (item.discountValue > 0) {
                                          const text =
                                            item.discountType === "Rp"
                                              ? `Rp ${new Intl.NumberFormat("id-ID").format(item.discountValue)}`
                                              : `${item.discountValue}%`;
                                          discountComponent = (
                                            <span className="block text-red-500 font-mono text-[10px] mt-0.5">
                                              Disc: {text}
                                            </span>
                                          );
                                        }
                                        return (
                                          <tr
                                            key={item.id}
                                            className="bg-white dark:bg-slate-950"
                                          >
                                            <td className="px-3 py-2 font-medium">
                                              {product?.name || "Unknown"}
                                            </td>
                                            <td className="px-3 py-2 text-center text-slate-500">
                                              {item.batchNo || "-"}{" "}
                                              {item.expDate
                                                ? ` / ${item.expDate}`
                                                : ""}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono">
                                              Rp{" "}
                                              {new Intl.NumberFormat(
                                                "id-ID",
                                              ).format(item.price)}
                                              {discountComponent}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              <span className="font-bold">
                                                {item.qty}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              {item.returnedQty > 0 ? (
                                                <span className="text-orange-600 font-bold dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded">
                                                  {item.returnedQty}
                                                </span>
                                              ) : (
                                                <span className="text-slate-300 dark:text-slate-600">
                                                  -
                                                </span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                              Rp{" "}
                                              {new Intl.NumberFormat(
                                                "id-ID",
                                              ).format(item.subtotal)}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              {!isCanceled &&
                                                item.returnedQty < item.qty && (
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                      openReturnModal(
                                                        inv.id,
                                                        item.itemId,
                                                        item.qty -
                                                          item.returnedQty,
                                                      )
                                                    }
                                                    className="border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-900/50 dark:hover:bg-orange-900/30 h-7 text-xs"
                                                  >
                                                    <RotateCcw className="w-3 h-3 mr-1" />{" "}
                                                    Retur
                                                  </Button>
                                                )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                  </tbody>
                                </table>
                              </div>

                              <div className="mt-4 mr-2 flex justify-end">
                                <div className="text-xs text-slate-500 bg-white dark:bg-slate-950 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 inline-block shadow-sm">
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    <span className="text-slate-400 uppercase tracking-wider">
                                      Metode Bayar:
                                    </span>
                                    <span className="font-medium text-right text-slate-700 dark:text-slate-300">
                                      {inv.paymentMethod}
                                    </span>
                                    <span className="text-slate-400 uppercase tracking-wider">
                                      Diskon Global:
                                    </span>
                                    <span className="font-medium text-right text-red-500 italic">
                                      {inv.invoiceDiscValue > 0
                                        ? inv.invoiceDiscType === "Rp"
                                          ? `Rp ${new Intl.NumberFormat("id-ID").format(inv.invoiceDiscValue)}`
                                          : `${inv.invoiceDiscValue}%`
                                        : "-"}
                                    </span>
                                    {inv.useTax && (
                                      <>
                                        <span className="text-slate-400 uppercase tracking-wider">
                                          PPN:
                                        </span>
                                        <span className="font-medium text-right text-slate-700 dark:text-slate-300">
                                          {inv.taxPercent}%
                                        </span>
                                      </>
                                    )}
                                    <span className="text-slate-400 uppercase tracking-wider pt-2 mt-1 border-t dark:border-slate-800">
                                      Total Awal:
                                    </span>
                                    <span className="font-medium text-right pt-2 mt-1 border-t dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm">
                                      Rp{" "}
                                      {new Intl.NumberFormat("id-ID").format(
                                        inv.total,
                                      )}
                                    </span>

                                    {hasReturn && (
                                      <>
                                        <span className="text-orange-500 font-bold uppercase tracking-wider">
                                          Total Retur:
                                        </span>
                                        <span className="font-bold text-right text-orange-500 text-sm">
                                          - Rp{" "}
                                          {new Intl.NumberFormat(
                                            "id-ID",
                                          ).format(returnTotal)}
                                        </span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider pt-2 mt-1 border-t border-slate-300 dark:border-slate-700">
                                          Total Akhir:
                                        </span>
                                        <span className="font-bold text-right pt-2 mt-1 border-t border-slate-300 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 text-sm">
                                          Rp{" "}
                                          {new Intl.NumberFormat(
                                            "id-ID",
                                          ).format(finalEffectiveTotal)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      Belum ada histori faktur yang sesuai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {returnModal && returnModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-2">Retur Barang</h3>
              <p className="text-sm text-slate-500 mb-4">
                Masukkan jumlah barang yang akan dikembalikan ke supplier.
                Maksimal retur:{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {returnModal.maxQty}
                </strong>
                .
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                    Qty Return
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max={returnModal.maxQty}
                    value={returnQty || ""}
                    onChange={(e) =>
                      setReturnQty(
                        Math.min(
                          returnModal.maxQty,
                          Math.max(1, Number(e.target.value)),
                        ),
                      )
                    }
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                    Tanggal Return
                  </label>
                  <Input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                    Keterangan Return
                  </label>
                  <Input
                    placeholder="Contoh: Barang rusak, salah ukuran"
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setReturnModal(null)}
                  >
                    Batal
                  </Button>
                  <Button
                    variant="primary"
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={executeReturn}
                  >
                    Proses Retur
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
