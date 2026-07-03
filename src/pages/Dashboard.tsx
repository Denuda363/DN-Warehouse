import React, { useMemo, useState } from "react";
import { useAppContext } from "../store/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import {
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  TrendingUp,
  Compass,
  ShoppingBag,
  DollarSign,
  Activity,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Info,
  Truck,
  Plus,
  RefreshCw,
  Bell,
  Archive,
  Download,
  X,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";

const COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f97316", // orange
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f43f5e", // rose
  "#f59e0b", // amber
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 110,
      damping: 15,
    },
  },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-xl ring-1 ring-black/5">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mt-1">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              <span className="opacity-70">{entry.name}:</span>{" "}
              <span className="font-bold">
                {typeof entry.value === "number" && entry.name.toLowerCase().includes("valuasi")
                  ? new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      maximumFractionDigits: 0,
                    }).format(entry.value)
                  : entry.value}
              </span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC = () => {
  const { data, currentUser } = useAppContext();

  // Interactive filters
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<"7_DAYS" | "30_DAYS" | "THIS_MONTH">("7_DAYS");
  const [highlightMetric, setHighlightMetric] = useState<"VALUATION" | "STOCK">("VALUATION");
  const [selectedCriticalItem, setSelectedCriticalItem] = useState<any | null>(null);

  // Filter out category restrictions based on role
  const currentUserCategories = currentUser?.allowedCategoryIds || [];
  const hasCategoryRestriction = currentUser?.role !== "ADMIN" && currentUserCategories.length > 0;

  const displayItems = useMemo(() => {
    let items = data.items;
    if (hasCategoryRestriction) {
      items = items.filter((i) => currentUserCategories.includes(i.categoryId));
    }
    return items;
  }, [data.items, hasCategoryRestriction, currentUserCategories]);

  const displayTransactions = useMemo(() => {
    let txs = data.transactions;
    if (hasCategoryRestriction) {
      txs = txs.filter((t) => displayItems.some((i) => i.id === t.itemId));
    }
    return txs;
  }, [data.transactions, displayItems, hasCategoryRestriction]);

  // Apply dashboard category filter
  const filteredItemsByCat = useMemo(() => {
    let items = displayItems;
    if (selectedCategory !== "ALL") {
      items = items.filter((i) => i.categoryId === selectedCategory);
    }
    return items;
  }, [displayItems, selectedCategory]);

  const filteredTransactionsByCat = useMemo(() => {
    let txs = displayTransactions;
    if (selectedCategory !== "ALL") {
      txs = txs.filter((t) => {
        const item = data.items.find((i) => i.id === t.itemId);
        return item && item.categoryId === selectedCategory;
      });
    }
    return txs;
  }, [displayTransactions, selectedCategory, data.items]);

  // Time-of-day greeting
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 19) return "Selamat Sore";
    return "Selamat Malam";
  }, []);

  const getSupplierName = (id?: string) => {
    if (!id) return "Tanpa Supplier";
    return (
      data.suppliers.find((s) => s.id === id)?.name || "Supplier Tidak Dikenal"
    );
  };

  // KPI Calculations
  const totalItems = filteredItemsByCat.length;
  const totalStock = filteredItemsByCat.reduce((acc, item) => acc + item.stock, 0);

  const totalValuation = useMemo(() => {
    return filteredItemsByCat.reduce((acc, item) => {
      const price = item.sellingPrice || 10000; // estimated default if missing
      return acc + item.stock * price;
    }, 0);
  }, [filteredItemsByCat]);

  const averagePrice = useMemo(() => {
    if (filteredItemsByCat.length === 0) return 0;
    const sum = filteredItemsByCat.reduce((acc, item) => acc + (item.sellingPrice || 0), 0);
    return sum / filteredItemsByCat.length;
  }, [filteredItemsByCat]);

  const lowStockCount = useMemo(() => {
    return filteredItemsByCat.filter(
      (item) => item.stock <= (item.minStock !== undefined ? item.minStock : 5),
    ).length;
  }, [filteredItemsByCat]);

  // Active purchase invoices metrics for chosen category items
  const activePurchaseInvoiceTotal = useMemo(() => {
    let spend = 0;
    data.purchaseInvoices.forEach((inv) => {
      if (inv.status === "COMPLETED") {
        inv.items.forEach((invItem) => {
          const item = displayItems.find((di) => di.id === invItem.itemId);
          if (item) {
            if (selectedCategory === "ALL" || item.categoryId === selectedCategory) {
              spend += invItem.subtotal;
            }
          }
        });
      }
    });
    return spend;
  }, [data.purchaseInvoices, displayItems, selectedCategory]);

  // Smart Dynamic Alerts Checklist
  const smartAlerts = useMemo(() => {
    const alerts: { type: "critical" | "warning" | "info"; msg: string }[] = [];
    const criticalItemsNum = filteredItemsByCat.filter(
      (i) => i.stock <= (i.minStock !== undefined ? i.minStock : 5),
    ).length;
    
    if (criticalItemsNum > 0) {
      alerts.push({
        type: "critical",
        msg: `${criticalItemsNum} barang kritis di bawah batas minimal. Klik tab Stok Menipis di Master Data untuk ekspor.`,
      });
    }

    // Expiry warnings within 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const now = new Date();
    
    let expiringCount = 0;
    filteredItemsByCat.forEach((item) => {
      if (item.expiryDate) {
        const exp = new Date(item.expiryDate);
        if (exp > now && exp <= thirtyDaysFromNow) expiringCount++;
      }
      if (item.batches) {
        item.batches.forEach((b) => {
          if (b.expiryDate) {
            const exp = new Date(b.expiryDate);
            if (exp > now && exp <= thirtyDaysFromNow && (b.stock || 0) > 0) expiringCount++;
          }
        });
      }
    });

    if (expiringCount > 0) {
      alerts.push({
        type: "warning",
        msg: `${expiringCount} batch produk akan kedaluwarsa segera. Prioritaskan pengeluaran stok!`,
      });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const todayTransactionsNum = filteredTransactionsByCat.filter((t) =>
      t.date.startsWith(todayStr),
    ).length;

    if (todayTransactionsNum > 0) {
      alerts.push({
        type: "info",
        msg: `${todayTransactionsNum} pencatatan barang masuk/keluar baru telah sukses dicatat hari ini.`,
      });
    } else {
      alerts.push({
        type: "info",
        msg: "Gudang dalam keadaan kondusif. Belum ada antrean arus barang masuk/keluar baru hari ini.",
      });
    }

    return alerts.
    slice(0, 3);
  }, [filteredItemsByCat, filteredTransactionsByCat]);

  // Last 7 or 30 days Area Chart Data
  const chartData = useMemo(() => {
    const res = [];
    const days = dateRange === "7_DAYS" ? 7 : 30;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];

      const inCount = filteredTransactionsByCat
        .filter((t) => t.type === "IN" && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + t.qty, 0);
      const outCount = filteredTransactionsByCat
        .filter((t) => t.type === "OUT" && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + t.qty, 0);

      const label =
        dateRange === "7_DAYS"
          ? d.toLocaleDateString("id-ID", { weekday: "short" })
          : d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

      res.push({
        name: label,
        "Barang Masuk": inCount,
        "Barang Keluar": outCount,
        "Total Arus": inCount + outCount,
      });
    }
    return res;
  }, [filteredTransactionsByCat, dateRange]);

  // Transaction flow counts for top subtitle in charts
  const rangeFlowSummary = useMemo(() => {
    const days = dateRange === "7_DAYS" ? 7 : 30;
    const cutOff = new Date();
    cutOff.setDate(cutOff.getDate() - days);

    const matchTxs = filteredTransactionsByCat.filter(
      (t) => new Date(t.date) >= cutOff,
    );

    const totalIn = matchTxs
      .filter((t) => t.type === "IN")
      .reduce((sum, t) => sum + t.qty, 0);
    const totalOut = matchTxs
      .filter((t) => t.type === "OUT")
      .reduce((sum, t) => sum + t.qty, 0);

    return { totalIn, totalOut, count: matchTxs.length };
  }, [filteredTransactionsByCat, dateRange]);

  // Category Distribution Pie Chart Data
  const categoryDistribution = useMemo(() => {
    const rawCounts: Record<string, number> = {};
    filteredItemsByCat.forEach((item) => {
      const cat = data.categories.find((c) => c.id === item.categoryId);
      const name = cat ? cat.name : "Tanpa Kategori";
      rawCounts[name] = (rawCounts[name] || 0) + item.stock;
    });

    const list = Object.entries(rawCounts)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    return list.slice(0, 5); // display top 5 categories
  }, [filteredItemsByCat, data.categories]);

  // Top Products: Stock vs Capital Binding (Selected dynamically)
  const topBarData = useMemo(() => {
    return [...filteredItemsByCat]
      .map((item) => {
        const valueCost = item.stock * (item.sellingPrice || 10000);
        return {
          id: item.id,
          name: item.name.length > 20 ? item.name.substring(0, 18) + "..." : item.name,
          "Valuasi": valueCost,
          "Stok": item.stock,
        };
      })
      .sort((a, b) => {
        if (highlightMetric === "VALUATION") return b.Valuasi - a.Valuasi;
        return b.Stok - a.Stok;
      })
      .slice(0, 5);
  }, [filteredItemsByCat, highlightMetric]);

  // Top critical list watchlist items
  const criticalItemsList = useMemo(() => {
    return filteredItemsByCat
      .filter((item) => item.stock <= (item.minStock !== undefined ? item.minStock : 5))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);
  }, [filteredItemsByCat]);

  const handleExportCriticalStock = () => {
    const wb = XLSX.utils.book_new();
    const exportData = criticalItemsList.map(item => ({
      ID: item.id,
      SKU: item.sku,
      Nama: item.name,
      Stok_Saat_Ini: item.stock,
      Stok_Minimal: item.minStock !== undefined ? item.minStock : 5,
      Kategori: data.categories.find(c => c.id === item.categoryId)?.name || "-",
      Harga_Jual: item.sellingPrice || 0,
      Supplier_Utama: getSupplierName(item.supplierId),
      Supplier_Alternatif: item.altSupplierId ? getSupplierName(item.altSupplierId) : "-",
      Status: item.stock <= 0 ? "Habis" : "Menipis",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Stok Menipis");
    XLSX.writeFile(wb, `Stok_Menipis_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Primary Supplier contribution values
  const supplierVolumeShare = useMemo(() => {
    const raw: Record<string, number> = {};
    filteredItemsByCat.forEach((item) => {
      const sup = getSupplierName(item.supplierId);
      raw[sup] = (raw[sup] || 0) + item.stock;
    });

    return Object.entries(raw)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [filteredItemsByCat]);

  // Recent 5 Outflow / Inflow Transaction Timeline
  const recentTransactionsCompact = useMemo(() => {
    return [...filteredTransactionsByCat]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map((t) => {
        const item = data.items.find((i) => i.id === t.itemId);
        const nameUnit = data.units.find((u) => u.id === item?.unitId)?.name || "unit";
        return {
          ...t,
          itemName: item ? item.name : "Barang Terhapus",
          sku: item ? item.sku : "-",
          unitName: nameUnit,
        };
      });
  }, [filteredTransactionsByCat, data.items, data.units]);

  // Clean Indonesian currency string util
  const rupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-3 md:space-y-6"
    >
      {/* Modern Dashboard Header Banner */}
      <motion.div
        variants={itemVariants}
        className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-4 md:p-8 text-white shadow-lg"
      >
        <div className="absolute top-0 right-0 h-48 w-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 h-32 w-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] md:text-xs font-semibold tracking-wider uppercase font-mono">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Live Stats Monitor
            </span>
            <h1 className="text-xl md:text-3.5xl font-extrabold tracking-tight">
              {greetingText}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-emerald-300">{currentUser?.username || "Staff"}</span>!
            </h1>
            <p className="hidden md:block text-slate-300/85 text-xs md:text-sm max-w-xl leading-relaxed">
              Inilah ringkasan aktivitas logistik, indikator stok barang kritis, rincian valuasi investasi aset barang, serta volume transaksi real-time.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full md:w-auto md:flex md:flex-nowrap md:gap-4 items-center shrink-0">
            {/* Real-time statistics summaries */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-2 md:p-3 border border-white/10 text-center min-w-[70px] md:min-w-[110px]">
              <span className="text-slate-400 text-[8px] md:text-[10px] uppercase font-bold block mb-0.5 md:mb-1">Inbound</span>
              <span className="text-base md:text-2xl font-black text-emerald-400 font-mono">+{rangeFlowSummary.totalIn}</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-2 md:p-3 border border-white/10 text-center min-w-[70px] md:min-w-[110px]">
              <span className="text-slate-400 text-[8px] md:text-[10px] uppercase font-bold block mb-0.5 md:mb-1">Outbound</span>
              <span className="text-base md:text-2xl font-black text-rose-400 font-mono">-{rangeFlowSummary.totalOut}</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-2 md:p-3 border border-white/10 text-center min-w-[70px] md:min-w-[110px]">
              <span className="text-slate-400 text-[8px] md:text-[10px] uppercase font-bold block mb-0.5 md:mb-1">Turnover</span>
              <span className="text-base md:text-2xl font-black text-indigo-350 font-mono">
                {totalStock > 0 ? ((rangeFlowSummary.totalOut / (totalStock + rangeFlowSummary.totalOut)) * 100).toFixed(1) + "%" : "0%"}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dashboard Interactive Controller Shelf */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row justify-between items-start md:items-center p-2.5 md:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl gap-3 md:gap-4 shadow-xs"
      >
        <div className="flex overflow-x-auto items-center gap-2 w-full md:w-auto pb-1 md:pb-0 whitespace-nowrap scrollbar-hide">
          <span className="hidden md:inline text-xs font-bold text-slate-450 uppercase tracking-widest mr-1 font-mono shrink-0">Filter Sektor:</span>
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-lg text-[11px] md:text-xs font-bold transition-all shrink-0 ${
              selectedCategory === "ALL"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-150"
            }`}
          >
            Semua Kategori
          </button>
          
          {data.categories.map((cat) => {
            const num = data.items.filter((i) => i.categoryId === cat.id).length;
            if (hasCategoryRestriction && !currentUserCategories.includes(cat.id)) return null;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] md:text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === cat.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-150"
                }`}
              >
                {cat.name} <span className="opacity-60 text-[9px] md:text-[10px] font-mono font-bold">({num})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 dark:bg-slate-805 p-1 rounded-lg border dark:border-slate-800/40 w-full md:w-auto overflow-x-auto">
          <span className="hidden md:inline text-[9px] md:text-[10px] font-bold py-1 px-2 text-slate-500 uppercase tracking-wide font-mono shrink-0">Rentang Waktu:</span>
          <button
            onClick={() => setDateRange("7_DAYS")}
            className={`px-3 py-1.5 md:py-1 rounded-md text-[10px] md:text-xs font-bold transition-all shrink-0 ${
              dateRange === "7_DAYS"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/50"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-805"
            }`}
          >
            7 Hari
          </button>
          <button
            onClick={() => setDateRange("30_DAYS")}
            className={`px-3 py-1.5 md:py-1 rounded-md text-[10px] md:text-xs font-bold transition-all shrink-0 ${
              dateRange === "30_DAYS"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/50"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-805"
            }`}
          >
            30 Hari
          </button>
        </div>
      </motion.div>

      {/* Bento Grid - 3 Dynamic KPI Cards with micro-visualizers */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {/* Card 2: Total Stok Fisik */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md transition-all relative overflow-hidden group border-slate-200 dark:border-slate-800/40 h-full">
            <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
            <CardContent className="p-4 md:p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Stok Fisik Gudang
                  </p>
                  <h2 className="text-2xl md:text-2.5xl font-black font-mono tracking-tight text-slate-805 dark:text-slate-100">
                    {totalStock.toLocaleString()}
                  </h2>
                </div>
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100/30 shrink-0">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center text-xs text-slate-500">
                <span className="font-medium">Varian Model Produk:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                  {totalItems} Variasi
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 3: Stok Kritis Alert */}
        <motion.div variants={itemVariants}>
          <Card className={`hover:shadow-md transition-all relative overflow-hidden group h-full border ${
            lowStockCount > 0 
              ? "border-red-200 dark:border-red-950 bg-red-50/15 dark:bg-red-950/5" 
              : "border-slate-200 dark:border-slate-800/40"
          }`}>
            <div className="absolute top-0 right-0 h-16 w-16 bg-rose-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
            <CardContent className="p-4 md:p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Stok Menipis (Di Bawah Batas)
                  </p>
                  <h2 className={`text-2xl md:text-2.5xl font-black font-mono tracking-tight ${
                    lowStockCount > 0 ? "text-rose-600 dark:text-rose-450 animate-pulse" : "text-slate-800 dark:text-white"
                  }`}>
                    {lowStockCount}
                  </h2>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                  lowStockCount > 0 
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-955 dark:text-rose-405 border-rose-200" 
                    : "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-100"
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center text-xs text-slate-500">
                <span className="font-medium">Status Pengawasan Stok:</span>
                <span className={`font-bold uppercase ${lowStockCount > 0 ? 'text-rose-600 font-mono' : 'text-emerald-600'}`}>
                  {lowStockCount > 0 ? "Butuh Atensi" : "Kondisi Aman"}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 4: Aliran Log Transaksi */}
        <motion.div variants={itemVariants} className="col-span-2 lg:col-span-1">
          <Card className="hover:shadow-md transition-all relative overflow-hidden group border-slate-200 dark:border-slate-800/40 h-full">
            <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
            <CardContent className="p-4 md:p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Aktivitas Aliran Arus
                  </p>
                  <h2 className="text-2xl md:text-2.5xl font-black font-mono tracking-tight text-blue-650 dark:text-blue-400">
                    {rangeFlowSummary.count}
                  </h2>
                </div>
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100/30 shrink-0">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center text-xs text-slate-500">
                <span className="font-medium">Rata-Rata Input:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                  {totalItems > 0 ? (rangeFlowSummary.count / totalItems).toFixed(1) : 0} log/barang
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Smart Notifications Box Widget */}
      {smartAlerts.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-550/20 dark:border-amber-900/30 rounded-2xl p-3 md:p-4 flex gap-3 md:gap-4 items-start shadow-xs">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
              <Bell className="w-4 h-4 md:w-5 md:h-5 animate-bounce" />
            </div>
            <div className="space-y-1.5 flex-1 select-none">
              <h3 className="font-bold text-slate-800 dark:text-white text-[10px] md:text-xs uppercase tracking-wider font-mono">Info Pengawasan Cepat</h3>
              <ul className="space-y-1.5">
                {smartAlerts.map((alert, idx) => (
                  <li key={idx} className="text-[11px] md:text-xs text-slate-600 dark:text-slate-300 flex items-start md:items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 md:mt-0 ${
                      alert.type === "critical" ? "bg-red-500" : alert.type === "warning" ? "bg-amber-500" : "bg-blue-500"
                    }`} />
                    <span className="font-medium leading-relaxed">{alert.msg}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Bento Grid layout containing Area Chart (Flow), Donut Chart (Categories), and Top valued Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
        {/* Area Chart of Flow Transactions */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="hover:shadow-xs transition-all h-full flex flex-col border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 gap-3 shrink-0 px-4 pt-4 md:px-6 md:pt-6">
              <div>
                <CardTitle className="text-sm md:text-base font-bold text-slate-800 dark:text-white">
                  Arus Trafik Keluar Masuk Barang
                </CardTitle>
                <p className="text-[10px] md:text-xs text-slate-450 mt-1">
                  Volume barang harian ({dateRange === "7_DAYS" ? "7" : "30"} Hari ke Belakang)
                </p>
              </div>
              <div className="flex gap-2 md:gap-4 text-[9px] md:text-[10px] font-bold uppercase tracking-wider font-mono shrink-0">
                <span className="flex items-center gap-1 md:gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-md border border-emerald-100/30">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500" /> Masuk
                </span>
                <span className="flex items-center gap-1 md:gap-1.5 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-md border border-orange-100/30">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-orange-500" /> Keluar
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[250px] md:min-h-[320px] flex items-center p-3 md:p-6 pt-0">
              <div className="h-[250px] md:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(148, 163, 184, 0.08)"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 650 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 650 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      name="Barang Masuk"
                      dataKey="Barang Masuk"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#gIn)"
                      strokeWidth={2.5}
                      activeDot={{ r: 6 }}
                    />
                    <Area
                      type="monotone"
                      name="Barang Keluar"
                      dataKey="Barang Keluar"
                      stroke="#f97316"
                      fillOpacity={1}
                      fill="url(#gOut)"
                      strokeWidth={2.5}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Donut Chart Rasio Porsi Kategori */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-xs transition-all h-full flex flex-col border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2 shrink-0 px-4 pt-4 md:px-6 md:pt-6">
              <CardTitle className="text-sm md:text-base font-bold text-slate-800 dark:text-white">
                Distribusi Kategori
              </CardTitle>
              <p className="text-[10px] md:text-xs text-slate-450 mt-1">
                Persentase stok fisik yang tersebar per sektor
              </p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center p-4 md:p-6">
              {categoryDistribution.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center justify-center h-[260px]">
                  <Archive className="w-10 h-10 mb-2 opacity-15 stroke-1" />
                  Belum ada kategori yang terisi stok.
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="h-[180px] w-full relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={<CustomTooltip />} />
                        <Pie
                          data={categoryDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={85}
                          paddingAngle={3.5}
                          dataKey="value"
                        >
                          {categoryDistribution.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center flex flex-col pointer-events-none select-none">
                      <span className="text-2xl font-black text-slate-805 dark:text-slate-100 font-mono leading-none">
                        {categoryDistribution.length}
                      </span>
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-1">
                        Sektor
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mt-5 w-full">
                    {categoryDistribution.map((entry, index) => {
                      const totalSum = categoryDistribution.reduce((s, i) => s + i.value, 0);
                      const percentText = ((entry.value / totalSum) * 100).toFixed(1) + "%";
                      return (
                        <div
                          key={entry.name}
                          className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <span className="truncate text-slate-650 dark:text-slate-300 font-medium">
                              {entry.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 font-mono shrink-0">
                            <span className="font-bold text-slate-850 dark:text-slate-205">
                              {entry.value}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              ({percentText})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bento Grid Part 2: Top Products Bar Chart, Watchlist Supplier, and Critical Stock list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
        {/* Top Products Bar Chart with valuation/stock toggle */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="hover:shadow-xs transition-all h-full flex flex-col border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 gap-3 shrink-0 px-4 pt-4 md:px-6 md:pt-6">
              <div>
                <CardTitle className="text-sm md:text-base font-bold text-slate-805 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" /> Analisis Produk Tertinggi
                </CardTitle>
                <p className="text-[10px] md:text-xs text-slate-450 mt-1">
                  Komoditas top 5 berdasarkan parameter nilai yang dipilih
                </p>
              </div>

              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border dark:border-slate-800/20 shrink-0 select-none">
                <button
                  onClick={() => setHighlightMetric("VALUATION")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                    highlightMetric === "VALUATION"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/40"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Nilai Valuasi
                </button>
                <button
                  onClick={() => setHighlightMetric("STOCK")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                    highlightMetric === "STOCK"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/40"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Volume Stok
                </button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-2 md:p-6 pt-0 flex items-center min-h-[290px]">
              {topBarData.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center justify-center w-full">
                  <ShoppingBag className="w-10 h-10 mb-2 opacity-15 stroke-1" />
                  Belum ada inventori barang terdaftar.
                </div>
              ) : (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topBarData}
                      layout="vertical"
                      margin={{ top: 10, right: 15, left: 15, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="rgba(148, 163, 184, 0.08)"
                      />
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fill: "#94a3b8", fontWeight: 650 }}
                        tickFormatter={(v) => {
                          if (highlightMetric === "VALUATION") {
                            return v >= 1000000 ? `${(v / 1000000).toFixed(1)} Jt` : `${v / 1000} Rb`;
                          }
                          return v;
                        }}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 10,
                          fill: "#64748b",
                          fontWeight: 500,
                        }}
                        width={105}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey={highlightMetric === "VALUATION" ? "Valuasi" : "Stok"}
                        name={highlightMetric === "VALUATION" ? "Rasio Valuasi" : "Stok Unit"}
                        fill="#6366f1"
                        radius={[0, 6, 6, 0]}
                        barSize={15}
                        background={{
                          fill: "rgba(148, 163, 184, 0.04)",
                          radius: 6,
                        }}
                      >
                        {topBarData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[(index + 2) % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Suppliers Contribution Share Watchlist */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-xs transition-all h-full flex flex-col border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-base font-bold text-slate-805 dark:text-white flex items-center gap-2">
                <Truck className="w-4.5 h-4.5 text-indigo-500" /> Kemitraan Supplier
              </CardTitle>
              <p className="text-xs text-slate-450 mt-1">
                Porsi penyerapan kontribusi unit stok barang per mitra
              </p>
            </CardHeader>
            <CardContent className="flex-1 p-4 md:p-6 pt-0 flex flex-col justify-between">
              {supplierVolumeShare.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center justify-center h-[200px]">
                  <Truck className="w-10 h-10 mb-2 opacity-15 stroke-1" />
                  Belum ada supplier yang terintegrasi.
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {supplierVolumeShare.map((sup, idx) => {
                    const totalVolumeSum = supplierVolumeShare.reduce((a, b) => a + b.value, 0);
                    const pct = totalVolumeSum > 0 ? (sup.value / totalVolumeSum) * 100 : 0;
                    return (
                      <div key={sup.name} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700 dark:text-stone-300 truncate max-w-[170px]">
                            {sup.name}
                          </span>
                          <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
                            {sup.value} Unit ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        {/* Beautiful simulated bar indicator */}
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-650 transition-all duration-505"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: COLORS[(idx + 4) % COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-805 flex justify-between items-center text-[11px] text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Mitra Aktif Gudang:
                </span>
                <span className="font-bold underline text-indigo-600 dark:text-indigo-400 font-mono">
                  {data.suppliers.length} Supplier
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Operational Shelf: Live recent transactional timeline, critical checklist panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
        {/* Watchlist: Critical Stock Alert list */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-xs transition-all h-full flex flex-col border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 shrink-0 px-4 pt-4 md:px-6 md:pt-6">
              <CardTitle className="text-sm md:text-base font-bold text-slate-805 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-650"></span>
                  </span>
                  Stok Menipis Realtime
                </span>
                <div className="flex items-center gap-2">
                  {criticalItemsList.length > 0 && (
                    <button 
                      onClick={handleExportCriticalStock}
                      title="Export ke Excel"
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/40 text-red-750 dark:text-red-400 rounded-md text-[10px] font-bold font-mono">
                    {criticalItemsList.length} Item
                  </span>
                </div>
              </CardTitle>
              <p className="text-[10px] md:text-xs text-slate-450 mt-1">
                Daftar barang di bawah tingkat minimal yang memerlukan restok segera.
              </p>
            </CardHeader>
            <CardContent className="flex-1 p-3 md:p-6 pt-0 flex flex-col justify-between">
              {criticalItemsList.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center justify-center md:h-[220px]">
                  <CheckCircle2 className="w-10 h-10 mb-2 text-emerald-500 opacity-70" />
                  Semua stok produk gudang dalam batas aman.
                </div>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {criticalItemsList.map((item) => {
                    const progressVal = item.stock <= 0 ? 0 : (item.stock / (item.minStock || 5)) * 100;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedCriticalItem(item)}
                        className="p-3 bg-red-500/5 dark:bg-red-900/10 border border-red-200/50 dark:border-red-900/30 rounded-xl flex gap-3 text-xs cursor-pointer hover:bg-red-500/10 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <div className="p-2 self-start bg-red-100 dark:bg-red-955 text-rose-600 rounded-lg shrink-0">
                          <AlertTriangle className="w-4 h-4 text-center shrink-0 animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex justify-between items-start gap-1">
                            <span className="font-bold text-slate-800 dark:text-stone-200 block truncate leading-tight text-[11px] flex-1">
                              {item.name}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-rose-600 dark:text-rose-455 shrink-0 bg-rose-50 dark:bg-rose-955 px-1 py-0.5 rounded">
                              {item.stock} Unit
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span>SKU: {item.sku || "-"}</span>
                            <span>•</span>
                            <span>Min: {item.minStock !== undefined ? item.minStock : 5}</span>
                          </div>
                          {/* Low Stok bar indicator */}
                          <div className="h-1.5 w-full bg-slate-105 dark:bg-slate-800/80 rounded-full overflow-hidden pt-0.5">
                            <div 
                              className="h-full rounded-full bg-red-600 transition-all"
                              style={{ width: `${Math.min(100, Math.max(8, progressVal))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Live Outbound/Inbound compact Flow timeline */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="hover:shadow-xs transition-all h-full flex flex-col border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 shrink-0 px-4 pt-4 md:px-6 md:pt-6">
              <CardTitle className="text-sm md:text-base font-bold text-slate-805 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-4.5 h-4.5 text-indigo-500 animate-pulse" /> Transaksi Terbaru
                </span>
                <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-slate-450 font-mono">Arus Logistik</span>
              </CardTitle>
              <p className="text-[10px] md:text-xs text-slate-450 mt-1">
                Timeline arus masuk (Inbound) dan checkout keluar (Outbound) mutakhir dari database.
              </p>
            </CardHeader>
            <CardContent className="flex-1 p-4 md:p-6 pt-0 flex flex-col justify-between">
              {recentTransactionsCompact.length === 0 ? (
                <div className="text-center py-16 text-slate-450 text-xs flex flex-col items-center justify-center md:h-[220px]">
                  <Clock className="w-10 h-10 mb-2 opacity-15 stroke-1" />
                  Belum ada transaksi logistik terekam.
                </div>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {recentTransactionsCompact.map((t) => {
                    const isIn = t.type === "IN";
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-2.5 md:p-3.5 border border-slate-100 dark:border-slate-850 bg-slate-50/25 dark:bg-slate-900/20 hover:bg-slate-50 dark:hover:bg-slate-900/40 rounded-xl gap-2 md:gap-4 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2.5 rounded-xl shrink-0 ${
                            isIn
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-orange-50 text-orange-605 dark:bg-orange-950/40 dark:text-orange-400"
                          }`}>
                            {isIn ? (
                              <ArrowDownRight className="w-4.5 h-4.5" />
                            ) : (
                              <ArrowUpRight className="w-4.5 h-4.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-slate-805 dark:text-stone-200 block truncate hover:underline cursor-default">
                              {t.itemName}
                            </span>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 mt-1 leading-none font-medium">
                              <span className="font-mono">SKU: {t.sku}</span>
                              <span>•</span>
                              <span>
                                {new Date(t.date).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-black font-mono leading-none ${
                            isIn 
                              ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300" 
                              : "bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-355"
                          }`}>
                            {isIn ? "+" : "-"} {t.qty} {t.unitName}
                          </span>
                          <p className="text-[9px] text-slate-400 mt-1 italic max-w-[130px] truncate leading-none">
                            Notes: {t.notes || "Tanpa catatan"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedCriticalItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
                <div className="flex gap-3 items-center">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Detail Stok Menipis</h3>
                    <p className="text-xs text-slate-500">Informasi barang yang perlu segera direstok</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCriticalItem(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Nama Barang</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-lg">{selectedCriticalItem.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 mb-1">SKU</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 font-mono">{selectedCriticalItem.sku || "-"}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 mb-1">Kategori</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {data.categories.find(c => c.id === selectedCriticalItem.categoryId)?.name || "-"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                    <p className="text-xs text-red-600/70 dark:text-red-400/70 mb-1">Stok Saat Ini</p>
                    <p className="font-black text-red-600 dark:text-red-400 text-xl font-mono">{selectedCriticalItem.stock}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 mb-1">Batas Minimal</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xl font-mono">
                      {selectedCriticalItem.minStock !== undefined ? selectedCriticalItem.minStock : 5}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 mb-1">Supplier Utama</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate" title={getSupplierName(selectedCriticalItem.supplierId)}>
                      {getSupplierName(selectedCriticalItem.supplierId)}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 mb-1">Supplier Alternatif</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate" title={selectedCriticalItem.altSupplierId ? getSupplierName(selectedCriticalItem.altSupplierId) : "-"}>
                      {selectedCriticalItem.altSupplierId ? getSupplierName(selectedCriticalItem.altSupplierId) : "-"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button 
                  onClick={() => setSelectedCriticalItem(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Tutup
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
