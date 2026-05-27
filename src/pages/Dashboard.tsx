import React, { useMemo } from "react";
import { useAppContext } from "../store/AppContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import {
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  TrendingUp,
  Compass,
  ShoppingBag,
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
import { motion } from "motion/react";

const COLORS = [
  "#6366f1",
  "#10b981",
  "#3b82f6",
  "#f97316",
  "#f43f5e",
  "#8b5cf6",
  "#f59e0b",
  "#06b6d4",
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
              <span className="font-bold">{entry.value}</span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC = () => {
  const { data } = useAppContext();

  const totalItems = data.items.length;
  const totalStock = data.items.reduce((acc, item) => acc + item.stock, 0);
  const lowStock = data.items.filter(
    (item) => item.stock <= item.minStock,
  ).length;

  const thisMonthTransactions = useMemo(() => {
    const now = new Date();
    return data.transactions.filter(
      (t) => new Date(t.date).getMonth() === now.getMonth(),
    );
  }, [data.transactions]);

  const itemsIn = thisMonthTransactions.filter((t) => t.type === "IN").length;
  const itemsOut = thisMonthTransactions.filter((t) => t.type === "OUT").length;

  // Last 7 days Area Chart Data
  const chartData = useMemo(() => {
    const res = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];

      const inCount = data.transactions
        .filter((t) => t.type === "IN" && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + t.qty, 0);
      const outCount = data.transactions
        .filter((t) => t.type === "OUT" && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + t.qty, 0);

      res.push({
        name: d.toLocaleDateString("id-ID", { weekday: "short" }),
        "Barang Masuk": inCount,
        "Barang Keluar": outCount,
      });
    }
    return res;
  }, [data.transactions]);

  // Category Distribution Pie Chart Data
  const categoryDistribution = useMemo(() => {
    const rawCounts: Record<string, number> = {};
    data.items.forEach((item) => {
      const cat = data.categories.find((c) => c.id === item.categoryId);
      const name = cat ? cat.name : "Uncategorized";
      rawCounts[name] = (rawCounts[name] || 0) + item.stock;
    });

    const list = Object.entries(rawCounts)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    return list.slice(0, 8); // top 8 categories
  }, [data.items, data.categories]);

  // Top Products Horizontal Bar Chart Data
  const topProductsData = useMemo(() => {
    return [...data.items]
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 5)
      .map((item) => ({
        name:
          item.name.length > 15
            ? item.name.substring(0, 15) + "..."
            : item.name,
        Stok: item.stock,
      }));
  }, [data.items]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Dashboard Overview
        </h1>
        <p className="text-slate-500 text-sm">
          Ringkasan aktivitas dan status stok gudang secara real-time.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Total Jenis Barang
                </p>
                <h2 className="text-3xl font-bold">{totalItems}</h2>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100/30">
                <Layers className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-16 w-16 bg-indigo-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Total Stok Fisik
                </p>
                <h2 className="text-3xl font-bold">{totalStock}</h2>
              </div>
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100/30">
                <Package className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-16 w-16 bg-rose-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Limit Stok (Menipis)
                </p>
                <h2
                  className={`text-3xl font-bold ${lowStock > 0 ? "text-rose-500" : "text-slate-800 dark:text-slate-100"}`}
                >
                  {lowStock}
                </h2>
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center border ${lowStock > 0 ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border-rose-100/30" : "bg-slate-50 text-slate-450 dark:bg-slate-900/50 dark:text-slate-400 border-slate-100/30"}`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Inbound / Outbound Bulan Ini
                </p>
                <div className="flex gap-4 items-center">
                  <span className="flex items-center text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    <ArrowDownRight className="w-4 h-4 mr-0.5 shrink-0" />{" "}
                    {itemsIn}
                  </span>
                  <span className="flex items-center text-sm font-bold text-orange-600 dark:text-orange-400">
                    <ArrowUpRight className="w-4 h-4 mr-0.5 shrink-0" />{" "}
                    {itemsOut}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-100/30">
                <TrendingUp className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Modern Dashboard Charts Bento-Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Curved Gradient Area Activity Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="hover:shadow-md transition-all h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
              <div>
                <CardTitle className="text-base font-semibold">
                  Aktivitas 7 Hari Terakhir
                </CardTitle>
                <p className="text-xs text-slate-400 mt-1">
                  Status volume barang masuk vs keluar harian.
                </p>
              </div>
              <div className="flex gap-6 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />{" "}
                  Masuk
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />{" "}
                  Keluar
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px] flex items-center p-6 pt-0">
              <div className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="gradientIn"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="gradientOut"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#f97316"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f97316"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(148, 163, 184, 0.12)"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      name="Barang Masuk"
                      dataKey="Barang Masuk"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#gradientIn)"
                      strokeWidth={2}
                      activeDot={{ r: 5 }}
                    />
                    <Area
                      type="monotone"
                      name="Barang Keluar"
                      dataKey="Barang Keluar"
                      stroke="#f97316"
                      fillOpacity={1}
                      fill="url(#gradientOut)"
                      strokeWidth={2}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Chart 2: Inventory Distribution Donut Chart */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md transition-all h-full flex flex-col">
            <CardHeader className="pb-0 shrink-0">
              <CardTitle className="text-base font-semibold">
                Rasio Kategori Barang
              </CardTitle>
              <p className="text-xs text-slate-400 mt-1">
                Perbandingan stok fisik berdasarkan kategori.
              </p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center p-6">
              {categoryDistribution.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm flex flex-col items-center justify-center">
                  <Compass className="w-10 h-10 mb-2 opacity-20" />
                  Belum ada kategori terisi stok.
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
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
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
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center flex flex-col pointer-events-none">
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                        {categoryDistribution.length}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Kategori
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 w-full">
                    {categoryDistribution.slice(0, 4).map((entry, index) => (
                      <div
                        key={entry.name}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <span className="truncate text-slate-600 dark:text-slate-300 font-medium flex-1">
                          {entry.name}
                        </span>
                        <span className="font-bold text-slate-850 dark:text-slate-200">
                          {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 3: Horizontal Bars for Top Stock Commodities */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="hover:shadow-md transition-all h-full flex flex-col">
            <CardHeader className="pb-2 shrink-0">
              <CardTitle className="text-base font-semibold">
                Top 5 Stok Barang Tertinggi
              </CardTitle>
              <p className="text-xs text-slate-400 mt-1">
                Rangkuman komoditas barang dengan jumlah unit terbanyak.
              </p>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px] flex items-center p-6 pt-0">
              {topProductsData.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm flex flex-col items-center justify-center w-full">
                  <ShoppingBag className="w-10 h-10 mb-2 opacity-20" />
                  Belum ada data barang.
                </div>
              ) : (
                <div className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topProductsData}
                      layout="vertical"
                      margin={{ top: 15, right: 15, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="rgba(148, 163, 184, 0.12)"
                      />
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 11,
                          fill: "#64748b",
                          fontWeight: 500,
                        }}
                        width={110}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="Stok"
                        fill="#6366f1"
                        radius={[0, 4, 4, 0]}
                        barSize={18}
                        background={{
                          fill: "rgba(148, 163, 184, 0.05)",
                          radius: 4,
                        }}
                      >
                        {topProductsData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
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

        {/* Action Needed Section for Low Stock Items */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md transition-all h-full flex flex-col">
            <CardHeader className="shrink-0">
              <CardTitle className="text-base font-semibold">
                Peringatan Rekomendasi Stok ({lowStock})
              </CardTitle>
              <p className="text-xs text-slate-400 mt-1">
                Daftar produk yang berada di bawah limit minimal.
              </p>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto max-h-[300px] pr-2 p-6 pt-0 custom-scrollbar">
              <div className="space-y-3">
                {data.items.filter((i) => i.stock <= i.minStock).length ===
                0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm flex flex-col items-center justify-center">
                    <Compass className="w-8 h-8 mb-2 opacity-20 text-emerald-500" />
                    Kondisi logistik prima. Semua stok di atas limit aman.
                  </div>
                ) : (
                  data.items
                    .filter((i) => i.stock <= i.minStock)
                    .map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-rose-100/50 bg-rose-50/25 dark:border-rose-950/30 dark:bg-rose-950/10 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors"
                      >
                        <div className="min-w-0 pr-4">
                          <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-450 uppercase tracking-widest mt-1">
                            SKU: {item.sku}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-rose-600 font-extrabold text-base dark:text-rose-400">
                            {item.stock}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Limit: {item.minStock}
                          </p>
                        </div>
                      </motion.div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};
