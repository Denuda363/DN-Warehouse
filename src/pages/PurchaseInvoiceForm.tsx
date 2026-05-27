import React, { useState, useEffect, useMemo } from "react";
import { useAppContext } from "../store/AppContext";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import {
  CheckCircle2,
  Trash2,
  Plus,
  FileText,
  AlertCircle,
  Sparkles,
  X,
  ChevronRight,
  Layers,
  Copy,
  Search,
} from "lucide-react";
import { Item } from "../types";
import { motion, AnimatePresence } from "motion/react";

type InvoiceItemForm = {
  item: Item | null;
  qty: number;
  selectedUnitId: string;
  price: number;
  discountType: "Rp" | "%";
  discountValue: number;
  batchNo: string;
  expDate: string;
};

type InvoiceItem = {
  id: string; // temp id for the list
  item: Item;
  qty: number;
  selectedUnitId: string;
  price: number;
  discountType: "Rp" | "%";
  discountValue: number;
  batchNo: string;
  expDate: string;
  subtotal: number;
};

interface DraftInvoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  supplierId: string;
  warehouse: string;
  paymentMethod: string;
  dueDays: number;
  invoiceDiscType: "Rp" | "%";
  invoiceDiscValue: number;
  useTax: boolean;
  taxPercent: number;
  paidAmount: number;
  items: InvoiceItem[];
}

export const PurchaseInvoiceForm: React.FC<{
  editInvoiceId?: string;
  onComplete?: () => void;
}> = ({ editInvoiceId, onComplete }) => {
  const { data, updateData, currentUser } = useAppContext();

  const currentUserCategories = currentUser?.allowedCategoryIds || [];
  const hasCategoryRestriction =
    currentUser?.role !== "ADMIN" && currentUserCategories.length > 0;
  const filteredItems = hasCategoryRestriction
    ? data.items.filter((item) =>
        currentUserCategories.includes(item.categoryId),
      )
    : data.items;

  const [success, setSuccess] = useState(false);
  const [drafts, setDrafts] = useState<DraftInvoice[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string>("");
  const [draftSearchQuery, setDraftSearchQuery] = useState("");

  // Memoized filter for drafts
  const filteredDrafts = useMemo(() => {
    if (!draftSearchQuery) return drafts;
    const query = draftSearchQuery.toLowerCase();
    return drafts.filter((dr) => {
      const supplier = data.suppliers.find((s) => s.id === dr.supplierId);
      return (
        dr.invoiceNo.toLowerCase().includes(query) ||
        (supplier && supplier.name.toLowerCase().includes(query))
      );
    });
  }, [drafts, draftSearchQuery, data.suppliers]);

  // Form input scratchpad state (for adding item to active draft)
  const [currentItem, setCurrentItem] = useState<InvoiceItemForm>({
    item: null,
    qty: 1,
    selectedUnitId: "",
    price: 0,
    discountType: "Rp",
    discountValue: 0,
    batchNo: "",
    expDate: "",
  });

  const createNewDraftInstance = (customNo?: string): DraftInvoice => {
    const timestamp = Date.now().toString().slice(-4);
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    return {
      id: `draft-${Date.now()}-${rand}`,
      invoiceNo: customNo || `FAKTUR-${timestamp}-${rand}`,
      invoiceDate: new Date().toISOString().split("T")[0],
      supplierId: "",
      warehouse: "Toko Depan",
      paymentMethod: "Tunai (Lunas)",
      dueDays: 0,
      invoiceDiscType: "Rp",
      invoiceDiscValue: 0,
      useTax: false,
      taxPercent: 11,
      paidAmount: 0,
      items: [],
    };
  };

  useEffect(() => {
    if (editInvoiceId) {
      const inv = data.purchaseInvoices.find((i) => i.id === editInvoiceId);
      if (inv) {
        const loadedItems: InvoiceItem[] = inv.items
          .map((i) => {
            const product = data.items.find((pi) => pi.id === i.itemId);
            return {
              id: i.id,
              item: product!,
              qty: i.qty,
              selectedUnitId: i.selectedUnitId || product!.unitId,
              price: i.price,
              discountType: i.discountType,
              discountValue: i.discountValue,
              batchNo: i.batchNo,
              expDate: i.expDate,
              subtotal: i.subtotal,
            };
          })
          .filter((i) => i.item !== undefined);

        const singleEditDraft: DraftInvoice = {
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          invoiceDate: inv.invoiceDate,
          supplierId: inv.supplierId,
          warehouse: inv.warehouse,
          paymentMethod: inv.paymentMethod,
          dueDays: inv.dueDays,
          invoiceDiscType: inv.invoiceDiscType,
          invoiceDiscValue: inv.invoiceDiscValue,
          useTax: inv.useTax,
          taxPercent: inv.taxPercent,
          paidAmount: inv.paidAmount,
          items: loadedItems,
        };
        setDrafts([singleEditDraft]);
        setActiveDraftId(singleEditDraft.id);
      }
    } else {
      // Create fresh draft
      const d = createNewDraftInstance();
      setDrafts([d]);
      setActiveDraftId(d.id);
    }
  }, [editInvoiceId, data.purchaseInvoices, data.items]);

  const activeDraft = drafts.find((d) => d.id === activeDraftId) || drafts[0];

  const updateActiveDraft = (field: keyof DraftInvoice, value: any) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id === activeDraftId) {
          return { ...d, [field]: value };
        }
        return d;
      }),
    );
  };

  const updateActiveDraftItems = (
    updater: (prevItems: InvoiceItem[]) => InvoiceItem[],
  ) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id === activeDraftId) {
          return { ...d, items: updater(d.items) };
        }
        return d;
      }),
    );
  };

  const handleAddNewDraft = () => {
    const fresh = createNewDraftInstance();
    setDrafts((prev) => [...prev, fresh]);
    setActiveDraftId(fresh.id);
  };

  const handleRemoveDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (drafts.length <= 1) {
      // Keep at least one empty draft
      const fresh = createNewDraftInstance();
      setDrafts([fresh]);
      setActiveDraftId(fresh.id);
      return;
    }
    const filtered = drafts.filter((d) => d.id !== id);
    setDrafts(filtered);
    if (activeDraftId === id) {
      setActiveDraftId(filtered[0].id);
    }
  };

  const handleDuplicateDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const source = drafts.find((d) => d.id === id);
    if (!source) return;
    const timestamp = Date.now().toString().slice(-4);
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    const clone: DraftInvoice = {
      ...source,
      id: `draft-${Date.now()}-${rand}`,
      invoiceNo: `FAKTUR-${timestamp}-${rand}`,
      items: source.items.map((i) => ({
        ...i,
        id: `item-temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      })),
    };
    setDrafts((prev) => [...prev, clone]);
    setActiveDraftId(clone.id);
  };

  const handleAddItem = () => {
    if (!currentItem.item || !activeDraft) return;

    let discount = currentItem.discountValue || 0;
    if (currentItem.discountType === "%") {
      discount = (currentItem.price * discount) / 100;
    }
    const unitPriceAfterDisc = currentItem.price - discount;
    const itemSubtotal = unitPriceAfterDisc * currentItem.qty;

    const newItem: InvoiceItem = {
      id: `item-temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      item: currentItem.item,
      qty: currentItem.qty,
      selectedUnitId: currentItem.selectedUnitId || currentItem.item.unitId,
      price: currentItem.price,
      discountType: currentItem.discountType,
      discountValue: currentItem.discountValue,
      batchNo: currentItem.batchNo,
      expDate: currentItem.expDate,
      subtotal: itemSubtotal,
    };

    updateActiveDraftItems((items) => [...items, newItem]);

    // Reset Form
    setCurrentItem({
      item: null,
      qty: 1,
      selectedUnitId: "",
      price: 0,
      discountType: "Rp",
      discountValue: 0,
      batchNo: "",
      expDate: "",
    });
  };

  const handleRemoveItem = (id: string) => {
    updateActiveDraftItems((items) => items.filter((i) => i.id !== id));
  };

  const handleUpdateItemQty = (itemId: string, newQty: number) => {
    const sanitizedQty = Math.max(1, newQty);
    updateActiveDraftItems((items) =>
      items.map((i) => {
        if (i.id === itemId) {
          let discount = i.discountValue || 0;
          if (i.discountType === "%") {
            discount = (i.price * discount) / 100;
          }
          const unitPriceAfterDisc = i.price - discount;
          const itemSubtotal = unitPriceAfterDisc * sanitizedQty;
          return { ...i, qty: sanitizedQty, subtotal: itemSubtotal };
        }
        return i;
      }),
    );
  };

  const handleSaveAll = () => {
    const validDrafts = drafts.filter((d) => d.items.length > 0);
    if (validDrafts.length === 0) {
      alert(
        "Tambahkan minimal 1 barang pada salah satu faktur di antrian sebelum menyimpan.",
      );
      return;
    }

    // Checking if any draft does not have supplier selected
    const missingSupplier = validDrafts.find((d) => !d.supplierId);
    if (missingSupplier) {
      alert(
        `Faktur [${missingSupplier.invoiceNo || "Tanpa No"}] belum diisi nama Supplier-nya.`,
      );
      setActiveDraftId(missingSupplier.id);
      return;
    }

    let currentItemsState = [...data.items];
    let currentTransactionsState = [...data.transactions];
    let currentInvoicesState = [...data.purchaseInvoices];

    if (editInvoiceId) {
      const oldInvoice = data.purchaseInvoices.find(
        (i) => i.id === editInvoiceId,
      );
      if (oldInvoice) {
        // Revert old stock
        oldInvoice.items.forEach((oldItem) => {
          currentItemsState = currentItemsState.map((p) => {
            if (p.id === oldItem.itemId) {
              const bQty = oldItem.baseQty || oldItem.qty;
              const returned = oldItem.returnedQty || 0;
              return { ...p, stock: Math.max(0, p.stock - (bQty - returned)) };
            }
            return p;
          });
        });
        currentInvoicesState = currentInvoicesState.filter(
          (i) => i.id !== editInvoiceId,
        );
        currentTransactionsState = currentTransactionsState.filter(
          (t) => t.invoiceId !== editInvoiceId,
        );
      }
    }

    const getBaseQty = (
      itemId: string,
      selectedUnitId: string | undefined,
      qty: number,
    ) => {
      const item = data.items.find((i) => i.id === itemId);
      if (!item || !selectedUnitId || item.unitId === selectedUnitId)
        return qty;
      const alt = item.alternateUnits?.find((u) => u.unitId === selectedUnitId);
      return alt ? qty * alt.conversionRate : qty;
    };

    const newInvoices: import("../types").PurchaseInvoice[] = [];
    const allNewTransactions: any[] = [];

    validDrafts.forEach((draft) => {
      const invoiceId = editInvoiceId
        ? draft.id
        : `inv-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;

      const modelItems = draft.items.map((i) => {
        const bQty = getBaseQty(i.item.id, i.selectedUnitId, i.qty);
        return {
          id: i.id,
          itemId: i.item.id,
          qty: i.qty,
          baseQty: bQty,
          selectedUnitId: i.selectedUnitId,
          conversionRate: bQty / i.qty,
          returnedQty: editInvoiceId
            ? data.purchaseInvoices
                .find((inv) => inv.id === editInvoiceId)
                ?.items.find((oi) => oi.itemId === i.item.id)?.returnedQty || 0
            : 0,
          price: i.price,
          discountType: i.discountType,
          discountValue: i.discountValue,
          batchNo: i.batchNo,
          expDate: i.expDate,
          subtotal: i.subtotal,
        };
      });

      const newInvoice: import("../types").PurchaseInvoice = {
        id: invoiceId,
        invoiceNo:
          draft.invoiceNo ||
          `INV/${Date.now()}/${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
        supplierId: draft.supplierId,
        warehouse: draft.warehouse,
        invoiceDate: draft.invoiceDate,
        paymentMethod: draft.paymentMethod,
        dueDays: draft.dueDays,
        invoiceDiscType: draft.invoiceDiscType,
        invoiceDiscValue: draft.invoiceDiscValue,
        useTax: draft.useTax,
        taxPercent: draft.taxPercent,
        paidAmount: draft.paidAmount,
        items: modelItems,
        status: "COMPLETED",
        createdAt: new Date().toISOString(),
        total: modelItems.reduce((acc, curr) => acc + curr.subtotal, 0),
      };

      newInvoices.push(newInvoice);

      // Create transactions
      newInvoice.items.forEach((invItem) => {
        allNewTransactions.push({
          id: `tx-in-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date: draft.invoiceDate,
          type: "IN" as const,
          itemId: invItem.itemId,
          qty: invItem.baseQty || invItem.qty,
          displayUnitId: invItem.selectedUnitId,
          displayQty: invItem.qty,
          conversionRate: invItem.conversionRate,
          supplierId: draft.supplierId || undefined,
          notes: `Faktur Masuk [Batch]: ${newInvoice.invoiceNo} (Batch: ${invItem.batchNo || "-"})`,
          userId: currentUser?.id || "unknown",
          invoiceId,
        });

        const bQty = invItem.baseQty || invItem.qty;
        const returnedQty = invItem.returnedQty || 0;
        currentItemsState = currentItemsState.map((item) => {
          if (item.id === invItem.itemId) {
            return { ...item, stock: item.stock + (bQty - returnedQty) };
          }
          return item;
        });
      });
    });

    updateData({
      purchaseInvoices: [...newInvoices, ...currentInvoicesState],
      transactions: [...allNewTransactions, ...currentTransactionsState],
      items: currentItemsState,
    });

    setSuccess(true);

    setTimeout(() => {
      setSuccess(false);
      if (!editInvoiceId) {
        const d = createNewDraftInstance();
        setDrafts([d]);
        setActiveDraftId(d.id);
      }
      if (onComplete) onComplete();
    }, 1500);
  };

  const formatRp = (num: number) => {
    return new Intl.NumberFormat("id-ID").format(num);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Alert Header */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-600 border border-emerald-500 text-white flex items-center shadow-lg shadow-emerald-500/20 font-bold mb-6"
        >
          <CheckCircle2 className="w-5 h-5 mr-3 text-white shrink-0 animate-bounce" />
          <span>
            Faktur pembelian di antrian berhasil diproses dan disimpan ke
            database!
          </span>
        </motion.div>
      )}

      {/* Main Grid Layout to support batch multi draft sidebar queue */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side: Draft Queue Sidebar Panel */}
        <AnimatePresence>
          {!editInvoiceId && (
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-550 dark:text-slate-400">
                    Antrian Multi Faktur
                  </span>
                </div>
                <span className="text-xs bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full font-bold">
                  {drafts.length} Faktur
                </span>
              </div>

              {/* Sidebar Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Cari No. Faktur / Supplier..."
                  value={draftSearchQuery}
                  onChange={(e) => setDraftSearchQuery(e.target.value)}
                  className="pl-8.5 h-9 text-xs bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500"
                />
                {draftSearchQuery && (
                  <button
                    onClick={() => setDraftSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Grid or Draft Selection Cards Container */}
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200/50">
                {filteredDrafts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 italic">
                    Tidak ada antrian cocok.
                  </div>
                ) : (
                  filteredDrafts.map((dr, idx) => {
                    const supplier = data.suppliers.find(
                      (s) => s.id === dr.supplierId,
                    );
                    const isActive = dr.id === activeDraftId;
                    const totalItems = dr.items.length;
                    const hasItems = totalItems > 0;
                    return (
                      <motion.div
                        key={dr.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => setActiveDraftId(dr.id)}
                        className={`group cursor-pointer p-3.5 rounded-xl border relative transition-all flex flex-col justify-between ${
                          isActive
                            ? "bg-white dark:bg-slate-900 border-emerald-500 shadow-md ring-1 ring-emerald-500/20"
                            : "bg-slate-50/70 hover:bg-white dark:bg-slate-900/40 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] text-slate-450 dark:text-slate-500 font-mono font-medium truncate">
                              #{dr.invoiceNo || "Tanpa No"}
                            </p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate leading-tight">
                              {supplier ? (
                                supplier.name
                              ) : (
                                <span className="text-slate-400 italic font-normal text-xs">
                                  Supplier belum dipilih
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleDuplicateDraft(dr.id, e)}
                              className="text-slate-500 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors p-1 rounded-md"
                              title="Duplikat Faktur Ini"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleRemoveDraft(dr.id, e)}
                              className="text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors p-1 rounded-md"
                              title="Hapus Faktur Ini"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 border-t pt-2 mt-1.5 border-slate-105 dark:border-slate-800">
                          <span
                            className={`flex items-center gap-1 font-semibold py-0.5 px-2 rounded-full text-[10px] ${
                              hasItems
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-450 font-bold"
                                : "bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500"
                            }`}
                          >
                            {totalItems} Item
                          </span>
                          <span className="font-medium">{dr.invoiceDate}</span>
                        </div>
                      </motion.div>
                    );
                  })
                )}

                <Button
                  onClick={handleAddNewDraft}
                  variant="outline"
                  className="w-full border-dashed border-2 py-6 border-slate-300 dark:border-slate-800 hover:border-emerald-400 hover:text-emerald-500 text-slate-500 flex items-center justify-center gap-2 rounded-xl transition-all"
                >
                  <Plus className="w-4 h-4" /> Plus Faktur Masuk
                </Button>
              </div>

              {/* Execute / Saving Batch Trigger */}
              <div className="pt-4 border-t dark:border-slate-800">
                <Button
                  onClick={handleSaveAll}
                  disabled={
                    drafts.filter((d) => d.items.length > 0).length === 0
                  }
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 select-none"
                >
                  <Sparkles className="w-4 h-4" /> Simpan{" "}
                  {drafts.filter((d) => d.items.length > 0).length} Faktur Masuk
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Side: Active Draft Editor Form */}
        <div
          className={`col-span-1 lg:col-span-3 ${editInvoiceId ? "lg:col-span-4 max-w-5xl mx-auto w-full" : ""}`}
        >
          {/* Header Action For Single Invoice Edit Mode */}
          {editInvoiceId && (
            <div className="flex justify-end mb-4">
              <Button
                onClick={handleSaveAll}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 rounded-lg"
              >
                Simpan Perubahan Faktur
              </Button>
            </div>
          )}

          {activeDraft ? (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="rounded-xl shadow-md border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
                <CardContent className="p-6">
                  {/* Info Badge & Mode Indicator */}
                  <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-55/70 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                          {editInvoiceId
                            ? "Edit Faktur Masuk"
                            : `Detail Faktur Antrian`}
                        </h2>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Edit atribut atau list muatan komoditas barang ke
                          dalam faktur ini.
                        </p>
                      </div>
                    </div>
                    {!editInvoiceId && (
                      <span className="text-xs bg-emerald-55 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                        Faktur Terpilih
                      </span>
                    )}
                  </div>

                  {/* Header Form Fields container */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    <div>
                      <label className="text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1.5 block">
                        NO. FAKTUR SUPPLIER
                      </label>
                      <Input
                        value={activeDraft.invoiceNo}
                        onChange={(e) =>
                          updateActiveDraft("invoiceNo", e.target.value)
                        }
                        placeholder="FAKTUR-XYZ-123"
                        className="bg-slate-50/50 dark:bg-slate-950/40 focus-visible:ring-emerald-500 h-10 border-slate-200 dark:border-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1.5 block">
                        TANGGAL FAKTUR
                      </label>
                      <Input
                        type="date"
                        value={activeDraft.invoiceDate}
                        onChange={(e) =>
                          updateActiveDraft("invoiceDate", e.target.value)
                        }
                        className="bg-slate-50/50 dark:bg-slate-950/40 focus-visible:ring-emerald-500 h-10 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1.5 block">
                        SUPPLIER
                      </label>
                      <SearchableSelect
                        options={data.suppliers.map((sup) => ({
                          value: sup.id,
                          label: sup.name,
                        }))}
                        value={activeDraft.supplierId}
                        onChange={(val) => updateActiveDraft("supplierId", val)}
                        placeholder="Cari Supplier Utama..."
                        buttonClassName="bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 focus-within:ring-emerald-500 h-10 animate-none rounded-md"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1.5 block">
                        GUDANG PENERIMA
                      </label>
                      <select
                        value={activeDraft.warehouse}
                        onChange={(e) =>
                          updateActiveDraft("warehouse", e.target.value)
                        }
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100"
                      >
                        <option>Toko Depan</option>
                        <option>Gudang Utama</option>
                      </select>
                    </div>
                  </div>

                  {/* Add Product Segment nested inside active draft */}
                  <div className="border border-emerald-100/70 dark:border-emerald-950/45 bg-emerald-55/7 dark:bg-emerald-950/5 rounded-xl p-5 mb-8">
                    <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-600" /> MASUKKAN
                      BARANG BARU KE ANTRIAN
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      {/* Col 1: Nama Barang */}
                      <div className="col-span-1 md:col-span-5 space-y-1.5">
                        <label className="text-[10px] font-bold text-emerald-600/85 dark:text-emerald-450 uppercase tracking-wider block">
                          NAMA BARANG / SKU
                        </label>
                        <SearchableSelect
                          options={filteredItems.map((item) => ({
                            value: item.id,
                            label: `[${item.sku}] ${item.name}`,
                          }))}
                          value={currentItem.item?.id || ""}
                          onChange={(val) => {
                            const item = data.items.find((i) => i.id === val);
                            setCurrentItem({
                              ...currentItem,
                              item: item || null,
                              selectedUnitId: item ? item.unitId : "",
                            });
                          }}
                          placeholder="Pilih atau cari komoditas..."
                          buttonClassName="border-emerald-250/70 dark:border-slate-800 bg-white dark:bg-slate-950 focus-within:ring-emerald-555 text-sm h-11 shadow-sm"
                        />
                      </div>

                      {/* Col 2: Qty */}
                      <div className="col-span-1 md:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-bold text-emerald-600/85 dark:text-emerald-450 uppercase tracking-wider block">
                          JUMLAH (QTY)
                        </label>
                        <Input
                          type="number"
                          min="1"
                          value={currentItem.qty}
                          onChange={(e) =>
                            setCurrentItem({
                              ...currentItem,
                              qty: Math.max(1, Number(e.target.value)),
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddItem();
                            }
                          }}
                          placeholder="Qty"
                          className="text-center focus-visible:ring-emerald-500 border-emerald-250/70 dark:border-slate-800 h-11 bg-white dark:bg-slate-950 font-bold"
                        />
                      </div>

                      {/* Col 3: Satuan */}
                      <div className="col-span-1 md:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-bold text-emerald-600/85 dark:text-emerald-450 uppercase tracking-wider block">
                          SATUAN
                        </label>
                        <select
                          disabled={!currentItem.item}
                          value={
                            currentItem.selectedUnitId ||
                            (currentItem.item ? currentItem.item.unitId : "")
                          }
                          onChange={(e) =>
                            setCurrentItem({
                              ...currentItem,
                              selectedUnitId: e.target.value,
                            })
                          }
                          className="flex h-11 w-full rounded-md border border-emerald-250/70 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 disabled:opacity-50 disabled:bg-slate-100 font-semibold text-slate-800 dark:text-slate-100"
                        >
                          {!currentItem.item ? (
                            <option value="">Pilih barang...</option>
                          ) : (
                            <>
                              <option value={currentItem.item.unitId}>
                                {data.units.find(
                                  (u) => u.id === currentItem.item?.unitId,
                                )?.name || "Unit"}
                              </option>
                              {currentItem.item.alternateUnits?.map((au) => (
                                <option key={au.unitId} value={au.unitId}>
                                  {data.units.find((u) => u.id === au.unitId)
                                    ?.name || au.unitId}
                                </option>
                              ))}
                            </>
                          )}
                        </select>
                      </div>

                      {/* Col 4: No. Batch */}
                      <div className="col-span-1 md:col-span-3 space-y-1.5">
                        <label className="text-[10px] font-bold text-emerald-600/85 dark:text-emerald-450 uppercase tracking-wider block">
                          NO. BATCH
                        </label>
                        <Input
                          placeholder="Batch / No. Lot"
                          value={currentItem.batchNo}
                          onChange={(e) =>
                            setCurrentItem({
                              ...currentItem,
                              batchNo: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddItem();
                            }
                          }}
                          className="focus-visible:ring-emerald-500 border-emerald-250/70 dark:border-slate-800 h-11 bg-white dark:bg-slate-950 font-mono"
                        />
                      </div>

                      {/* Col 5: Exp Date */}
                      <div className="col-span-1 md:col-span-3 space-y-1.5">
                        <label className="text-[10px] font-bold text-emerald-600/85 dark:text-emerald-450 uppercase tracking-wider block">
                          TANGGAL KADALUARSA
                        </label>
                        <Input
                          type="date"
                          value={currentItem.expDate}
                          onChange={(e) =>
                            setCurrentItem({
                              ...currentItem,
                              expDate: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddItem();
                            }
                          }}
                          className="text-sm focus-visible:ring-emerald-500 border-emerald-250/70 dark:border-slate-800 text-slate-500 min-w-0 h-11 bg-white dark:bg-slate-950"
                        />
                      </div>

                      {/* Col 6: Add Button */}
                      <div className="col-span-1 md:col-span-12 flex justify-end">
                        <Button
                          onClick={handleAddItem}
                          disabled={!currentItem.item}
                          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-8 rounded-lg shadow-md hover:shadow-emerald-500/10 flex items-center justify-center gap-1.5 select-none transition-all"
                        >
                          <Plus className="w-4 h-4" /> Masukkan ke Daftar Faktur
                          (Enter)
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Table Section */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto mb-8 bg-slate-50/10 dark:bg-slate-950/10">
                    <table className="w-full text-sm text-left min-w-[600px]">
                      <thead className="bg-slate-100/70 dark:bg-slate-950/60 text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-5 py-3.5">NAMA BARANG</th>
                          <th className="px-5 py-3.5 text-center">QTY</th>
                          <th className="px-5 py-3.5 text-center">
                            BATCH / EXPIRY
                          </th>
                          <th className="px-5 py-3.5 text-center w-16">AKSI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/65 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-300">
                        {activeDraft.items.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-5 py-12 text-center text-slate-400 bg-slate-50/20 dark:bg-slate-950/5 italic text-xs leading-5"
                            >
                              Belum ada item barang ditambahkan pada draft
                              faktur ini.
                              <br />
                              <span className="text-[10px] uppercase font-bold text-slate-450 dark:text-slate-500 not-italic mt-1.5 block">
                                Gunakan formulir di atas untuk mengisi komoditas
                                barang.
                              </span>
                            </td>
                          </tr>
                        ) : (
                          activeDraft.items.map((item, index) => (
                            <motion.tr
                              key={item.id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.02 }}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/60"
                            >
                              <td className="px-5 py-3.5 font-medium">
                                <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                  {item.item.name}
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mt-1">
                                  SKU: {item.item.sku}
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <div className="inline-flex items-center gap-1.5 justify-center">
                                  <button
                                    onClick={() =>
                                      handleUpdateItemQty(item.id, item.qty - 1)
                                    }
                                    className="w-7 h-7 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded font-bold transition flex items-center justify-center select-none text-xs"
                                    title="Kurangi Qty"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.qty}
                                    onChange={(e) =>
                                      handleUpdateItemQty(
                                        item.id,
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-16 h-7 text-center text-xs font-bold rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                  />
                                  <button
                                    onClick={() =>
                                      handleUpdateItemQty(item.id, item.qty + 1)
                                    }
                                    className="w-7 h-7 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded font-bold transition flex items-center justify-center select-none text-xs"
                                    title="Tambah Qty"
                                  >
                                    +
                                  </button>
                                  <span className="text-xs text-slate-550 font-semibold ml-2">
                                    {data.units.find(
                                      (u) => u.id === item.selectedUnitId,
                                    )?.name || ""}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-center text-slate-500 font-medium">
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                                  {item.batchNo ? (
                                    <span className="inline-flex items-center bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-xs font-mono font-bold text-slate-650 dark:text-slate-300">
                                      Batch: {item.batchNo}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-xs">
                                      No Batch Empty
                                    </span>
                                  )}
                                  {item.expDate ? (
                                    <span className="text-xs bg-rose-55 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/30 text-rose-600 dark:text-rose-450 px-2.5 py-1 rounded-md font-bold">
                                      Exp: {item.expDate}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-xs">
                                      No Exp Empty
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="text-slate-400 hover:text-rose-500 transition-all duration-150 p-1.5 rounded-lg hover:bg-rose-50/50 dark:hover:bg-rose-950/20"
                                >
                                  <Trash2
                                    className="w-4 h-4 mx-auto"
                                    strokeWidth={2.2}
                                  />
                                </button>
                              </td>
                            </motion.tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Receipt Guidance Notice Banner */}
                  <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800 text-slate-500 text-xs leading-relaxed flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p>
                      Pembukuan faktur masuk ini akan secara otomatis
                      mengkalkulasi dan mengalokasikan unit barang beserta nomor
                      batch & kadaluarsa ke dalam persediaan gudang Anda secara
                      real-time.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="py-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/10">
              <Layers className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm">
                Silahkan pilih atau tambahkan faktur di panel samping kiri.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
