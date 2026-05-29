import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../store/AppContext";
import { Button } from "./ui/Button";
import { JarvisTransition } from "./JarvisTransition";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  LayoutDashboard,
  ArrowRightLeft,
  PackagePlus,
  PackageMinus,
  Database,
  Users,
  Settings,
  LogOut,
  Bell,
  Menu,
  FileText,
  FileSpreadsheet,
  X,
  AlertTriangle,
  Calendar,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export const Layout: React.FC<{
  children: React.ReactNode;
  currentPath: string;
  navigate: (p: string) => void;
}> = ({ children, currentPath, navigate }) => {
  const { currentUser, setCurrentUser, data, logActivity } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lowStockCollapsed, setLowStockCollapsed] = useState(false);

  // Notifications computing
  const lowStockItems = data.items.filter(
    (item) => item.stock <= (item.minStock !== undefined ? item.minStock : 5)
  );

  const lowStockBySupplier = lowStockItems.reduce(
    (acc, item) => {
      const key = item.supplierId || "unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  const getSupplierName = (id?: string) => {
    if (!id) return "Tanpa Supplier";
    return (
      data.suppliers.find((s) => s.id === id)?.name || "Supplier Tidak Dikenal"
    );
  };

  const exportLowStockPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Laporan Stok Menipis", 14, 20);

    let yPos = 30;

    Object.keys(lowStockBySupplier).forEach((supplierId) => {
      const supplierName = getSupplierName(supplierId);
      const items = lowStockBySupplier[supplierId];

      doc.setFontSize(12);
      doc.text(`Supplier: ${supplierName}`, 14, yPos);
      yPos += 5;

      const head = [
        [
          "SKU",
          "Nama Produk",
          "Stok",
          "Min. Stok",
          "Satuan",
          "Supplier Alternatif",
        ],
      ];
      const body = items.map((item) => [
        item.sku,
        item.name,
        item.stock.toString(),
        (item.minStock !== undefined ? item.minStock : 5).toString(),
        data.units.find((u) => u.id === item.unitId)?.name || "-",
        getSupplierName(item.altSupplierId),
      ]);

      autoTable(doc, {
        startY: yPos,
        head,
        body,
        theme: "grid",
        headStyles: { fillColor: [79, 70, 229] },
        margin: { top: 10 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
    });

    doc.save("Laporan_Stok_Menipis.pdf");
  };

  const exportLowStockExcel = () => {
    const rows: any[] = [];
    Object.keys(lowStockBySupplier).forEach((supplierId) => {
      const supplierName = getSupplierName(supplierId);
      const items = lowStockBySupplier[supplierId];
      items.forEach((item) => {
        rows.push({
          "Nama Barang": item.name,
          "Stok": item.stock,
          "Satuan": data.units.find((u) => u.id === item.unitId)?.name || "-",
          "Kategori": data.categories.find((c) => c.id === item.categoryId)?.name || "-",
          "Supplier": supplierName,
          "Supplier Alternatif": getSupplierName(item.altSupplierId),
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stok Menipis");
    XLSX.writeFile(workbook, "Laporan_Stok_Menipis.xlsx");
  };

  const soonInMs = 30 * 24 * 60 * 60 * 1000;
  const expiringItems: {
    id: string;
    name: string;
    expiryDate: string;
    batchNumber?: string;
  }[] = [];
  data.items.forEach((i) => {
    if (i.expiryDate) {
      const exp = new Date(i.expiryDate).getTime();
      if (exp - Date.now() < soonInMs && exp > Date.now()) {
        expiringItems.push({
          id: `${i.id}-main`,
          name: i.name,
          expiryDate: i.expiryDate,
          batchNumber: i.batchNumber,
        });
      }
    }
    if (i.batches) {
      i.batches.forEach((b, idx) => {
        if (b.expiryDate) {
          const exp = new Date(b.expiryDate).getTime();
          if (exp - Date.now() < soonInMs && exp > Date.now()) {
            expiringItems.push({
              id: `${i.id}-b${idx}`,
              name: i.name,
              expiryDate: b.expiryDate,
              batchNumber: b.batchNumber,
            });
          }
        }
      });
    }
  });

  const recentTxs = [...data.transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const totalNotifs =
    lowStockItems.length + expiringItems.length + recentTxs.length;

  const menus = [
    {
      name: "Dashboard",
      path: "dashboard",
      icon: LayoutDashboard,
      perm: "VIEW_DASHBOARD",
    },
    {
      name: "Faktur Masuk",
      path: "inbound",
      icon: PackagePlus,
      perm: "ACCESS_PURCHASE",
    },
    {
      name: "Kasir (POS)",
      path: "outbound",
      icon: PackageMinus,
      perm: "ACCESS_POS",
    },
    {
      name: "Arus Stok",
      path: "report",
      icon: ArrowRightLeft,
      perm: "VIEW_REPORTS",
    },
    {
      name: "Master Data",
      path: "master",
      icon: Database,
      perm: "MANAGE_MASTER",
    },
    {
      name: "Pengaturan",
      path: "settings",
      icon: Settings,
      perm: "MANAGE_USERS",
    },
  ];

  const mobileNav = data.mobileNavStyle || "bottombar";
  const desktopNav = data.navStyle || "sidebar";

  return (
    <div
      className={`min-h-screen flex h-screen overflow-hidden ${
        data.theme === "dark"
          ? "dark bg-slate-950 text-white"
          : "bg-slate-100 text-slate-900"
      } ${desktopNav === "sidebar" ? "md:flex-row" : "md:flex-col"} ${
        mobileNav === "sidebar" ? "max-md:flex-row" : "max-md:flex-col"
      }`}
      style={{
        backgroundImage: data.backgroundImage ? `url(${data.backgroundImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Background Overlay */}
      {data.backgroundImage && (
        <div 
          className="absolute inset-0 pointer-events-none z-[-1]" 
          style={{ 
            backgroundColor: data.theme === 'dark' ? '#000000' : '#ffffff',
            opacity: data.backgroundOpacity !== undefined ? data.backgroundOpacity / 100 : 0.8
          }} 
        />
      )}
      {/* Sidebar - Mobile Overlay */}
      {sidebarOpen && mobileNav !== "bottombar" && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed ${
          desktopNav === "topbar" || desktopNav === "bottombar"
            ? "md:hidden"
            : "md:relative"
        } ${
          mobileNav === "bottombar" ? "max-md:hidden" : ""
        } inset-y-0 left-0 z-50 h-full ${
          sidebarOpen
            ? "w-72 translate-x-0"
            : `w-20 -translate-x-full ${
                desktopNav === "topbar" || desktopNav === "bottombar"
                  ? ""
                  : "md:translate-x-0"
              }`
        } transition-all duration-300 flex flex-col font-sans shrink-0 border-r shadow-2xl md:shadow-none`}
        style={
          data.navIsTransparent
            ? {
                backgroundColor: "transparent",
                color: data.navTextColor || "#e2e8f0",
                borderColor: "rgba(148, 163, 184, 0.1)",
              }
            : {
                backgroundColor:
                  data.navBgColor ||
                  (data.theme === "dark" ? "#111111" : "#ffffff"),
                color:
                  data.navTextColor ||
                  (data.theme === "dark" ? "#e2e8f0" : "#334155"),
                borderColor: "rgba(148, 163, 184, 0.1)",
              }
        }
      >
        {/* Mac OS like dots */}
        <div
          className={`flex px-5 py-4 gap-2 shrink-0 ${!sidebarOpen ? "justify-center" : ""}`}
        >
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
        </div>

        <div
          className={`px-4 pb-4 flex items-center justify-between shrink-0 transition-all ${!sidebarOpen ? "justify-center" : ""}`}
        >
          <div className="flex items-center">
            {data.warehouseProfile?.logo ? (
              <img
                src={data.warehouseProfile.logo}
                alt="Logo"
                className={`w-8 h-8 rounded shrink-0 object-contain shadow-sm bg-indigo-500/10 p-1`}
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                <div className="w-3 h-3 bg-white rounded-sm opacity-80"></div>
              </div>
            )}
            {sidebarOpen && (
              <span className="ml-3 font-bold text-sm tracking-widest uppercase transition-opacity">
                {data.warehouseProfile?.name || "ROUNDS"}
              </span>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors border border-slate-300 dark:border-slate-700 hidden md:block"
              style={{ opacity: 0.6 }}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="px-4 py-2 shrink-0">
          <div
            className={`flex items-center px-3 py-2.5 rounded-lg bg-slate-500/10 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all ${!sidebarOpen ? "justify-center" : "w-full"}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-50 shrink-0"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            {sidebarOpen && (
              <input
                type="text"
                placeholder="Search"
                className="ml-3 bg-transparent border-none outline-none text-sm w-full placeholder-current"
                style={{ opacity: 0.7 }}
              />
            )}
          </div>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto custom-scrollbar relative px-2">
          {menus.map((m) => {
            const Icon = m.icon;
            const active = currentPath === m.path;

            if (
              currentUser?.role !== "ADMIN" &&
              m.perm &&
              !(currentUser?.permissions || []).includes(m.perm)
            )
              return null;

            return (
              <button
                key={m.path}
                onClick={() => {
                  navigate(m.path);
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={`relative group flex items-center px-4 py-3 min-h-[44px] transition-all rounded-lg ${active ? "" : "hover:bg-slate-500/5"}`}
                style={
                  active
                    ? {
                        color: "#6366f1",
                        backgroundColor: "rgba(99, 102, 241, 0.1)",
                      }
                    : { color: "currentColor", opacity: 0.7 }
                }
                title={sidebarOpen ? undefined : m.name}
              >
                {active && !sidebarOpen && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-md"></div>
                )}

                <div
                  className={`flex items-center justify-center ${sidebarOpen ? "" : "w-full"}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                </div>

                {sidebarOpen && (
                  <>
                    <span className="ml-4 text-sm font-medium whitespace-nowrap">
                      {m.name}
                    </span>
                    {active && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-l-md"></div>
                    )}
                  </>
                )}
              </button>
            );
          })}

          <div className="px-4 py-4">
            <div
              className="border-t border-dashed opacity-20"
              style={{ borderColor: "currentColor" }}
            ></div>
          </div>

          <button
            onClick={async () => {
              logActivity("Logout", `User ${currentUser?.username} logged out`);
              try {
                const { auth } = await import("../firebase");
                const { signOut } = await import("firebase/auth");
                await signOut(auth);
              } catch (e) {}
              setCurrentUser(null);
            }}
            className={`relative group flex items-center px-4 py-3 min-h-[44px] transition-all rounded-lg hover:bg-slate-500/5`}
            style={{ color: "currentColor", opacity: 0.7 }}
            title="Logout"
          >
            <div
              className={`flex items-center justify-center ${sidebarOpen ? "" : "w-full"}`}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
            </div>
            {sidebarOpen && (
              <span className="ml-4 text-sm font-medium whitespace-nowrap">
                Logout
              </span>
            )}
          </button>
        </nav>

        <div className="p-4 border-t border-slate-500/10 shrink-0">
          <div
            className={`flex items-center ${!sidebarOpen ? "justify-center" : ""}`}
          >
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 overflow-hidden shrink-0 flex items-center justify-center ring-2 ring-indigo-500/20">
              {currentUser?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            {sidebarOpen && (
              <div className="ml-3 overflow-hidden text-left flex-1 min-w-0">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: "currentColor", opacity: 0.9 }}
                >
                  {currentUser?.username}
                </p>
                <p
                  className="text-[11px] truncate mt-0.5"
                  style={{ color: "currentColor", opacity: 0.5 }}
                >
                  {currentUser?.role === "ADMIN" ? "Administrator" : "User"}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900/50 backdrop-blur border-b dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0 relative z-30">
          <div className="flex items-center gap-2">
            {/* Hamburger button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                desktopNav === "sidebar" ? "md:block" : "md:hidden"
              } ${mobileNav !== "bottombar" ? "block" : "hidden"}`}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo and Brand */}
            <div
              className={`items-center gap-4 ${
                desktopNav === "sidebar" ? "md:hidden" : "md:flex"
              } ${mobileNav === "sidebar" ? "max-md:hidden" : "max-md:flex"}`}
            >
              <div
                className="flex flex-row items-center cursor-pointer"
                onClick={() => navigate("dashboard")}
              >
                {data.warehouseProfile?.logo ? (
                  <img
                    src={data.warehouseProfile.logo}
                    alt="Logo"
                    className={`w-8 h-8 rounded shrink-0 object-contain shadow-sm bg-indigo-500/10 p-1`}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                    <div className="w-3 h-3 bg-white rounded-sm opacity-80"></div>
                  </div>
                )}
                <span className="ml-3 font-bold text-sm tracking-widest uppercase hidden sm:block">
                  {data.warehouseProfile?.name || "ROUNDS"}
                </span>
              </div>

              {desktopNav === "topbar" && (
                <div className="hidden md:flex items-center gap-1 ml-4 border-l dark:border-slate-800 pl-4">
                  {menus.map((m) => {
                    const Icon = m.icon;
                    const active = currentPath === m.path;
                    if (
                      currentUser?.role !== "ADMIN" &&
                      m.perm &&
                      !(currentUser?.permissions || []).includes(m.perm)
                    )
                      return null;

                    return (
                      <button
                        key={m.path}
                        onClick={() => navigate(m.path)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          active
                            ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                        title={m.name}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden lg:inline">{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            <div>
              <button
                className={`p-2.5 relative rounded-xl transition-all duration-200 active:scale-95 ${
                  totalNotifs > 0
                    ? "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40 ring-2 ring-rose-500/20 shadow-md shadow-rose-500/10"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                onClick={() => setShowNotifications(true)}
                title="Buka Panel Notifikasi"
              >
                <Bell
                  className={`w-5 h-5 ${totalNotifs > 0 ? "animate-bounce" : ""}`}
                  style={{ animationDuration: "2.5s" }}
                />
                {totalNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-extrabold text-white shadow-lg ring-2 ring-white dark:ring-slate-900 animate-pulse">
                    {totalNotifs > 99 ? "99+" : totalNotifs}
                  </span>
                )}
              </button>
            </div>
            {(desktopNav === "topbar" || desktopNav === "bottombar") && (
              <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300">
                  {currentUser?.username?.charAt(0).toUpperCase() || "U"}
                </div>
                <button
                  onClick={async () => {
                    logActivity(
                      "Logout",
                      `User ${currentUser?.username} logged out`,
                    );
                    try {
                      const { auth } = await import("../firebase");
                      const { signOut } = await import("firebase/auth");
                      await signOut(auth);
                    } catch (e) {}
                    setCurrentUser(null);
                  }}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors rounded-lg"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-slate-50/50 dark:bg-slate-950/50 relative">
          <div className="max-w-7xl mx-auto h-full">
            <JarvisTransition pageKey={currentPath}>
              {children}
            </JarvisTransition>
          </div>
        </main>

        {/* Bottom Navigation Bar */}
        {(mobileNav === "bottombar" || desktopNav === "bottombar") && (
          <nav
            className={`bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex justify-around items-center shrink-0 z-30 shadow-lg ${
              desktopNav === "bottombar" ? "md:flex" : "md:hidden"
            } ${mobileNav === "bottombar" ? "flex" : "hidden"}`}
          >
            {menus.map((m) => {
              const Icon = m.icon;
              const active = currentPath === m.path;
              if (
                currentUser?.role !== "ADMIN" &&
                m.perm &&
                !(currentUser?.permissions || []).includes(m.perm)
              )
                return null;

              return (
                <button
                  key={m.path}
                  onClick={() => navigate(m.path)}
                  className={`flex flex-col items-center justify-center gap-1 px-1 py-1 rounded-lg flex-1 text-center transition-all active:scale-95 ${
                    active
                      ? "text-indigo-600 dark:text-indigo-400 font-bold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? "scale-110" : ""}`} />
                  <span className="text-[10px] sm:text-xs tracking-tight font-medium truncate max-w-[65px] sm:max-w-none">
                    {m.name}
                  </span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Floating Notification Drawer Panel */}
      <AnimatePresence>
        {showNotifications && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] z-50 transition-opacity"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%", opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-800"
            >
              {/* Header */}
              <div className="p-4 border-b border-rose-100 dark:border-slate-800 bg-rose-600 text-white dark:bg-rose-950 flex justify-between items-center shrink-0 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/20 dark:bg-rose-900/30 rounded-lg">
                    <Bell className="w-5 h-5 text-white animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-none">
                      Pusat Notifikasi
                    </h3>
                    <p className="text-[10px] text-rose-100 dark:text-rose-400 mt-1">
                      {totalNotifs} Peringatan Aktif
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1.5 rounded-lg text-rose-100 hover:text-white hover:bg-rose-700 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filtering / Summary Grid */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 py-3 shrink-0">
                <div>
                  <div className="font-bold text-rose-600 dark:text-rose-400 text-sm animate-pulse">
                    {lowStockItems.length}
                  </div>
                  <div className="font-semibold text-slate-600 dark:text-slate-300">Stok Menipis</div>
                </div>
                <div>
                  <div className="font-bold text-orange-500 dark:text-orange-400 text-sm">
                    {expiringItems.length}
                  </div>
                  <div className="font-semibold text-slate-600 dark:text-slate-300">Hampir Expired</div>
                </div>
                <div>
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                    {recentTxs.length}
                  </div>
                  <div className="font-semibold text-slate-600 dark:text-slate-300">Arus Baru</div>
                </div>
              </div>

              {/* List Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-950/20 custom-scrollbar">
                {/* Low Stock Items Section */}
                {lowStockItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-rose-50/25 dark:bg-rose-950/10 p-1.5 rounded-lg border border-rose-200/40 dark:border-rose-900/40 mb-3 select-none">
                      <button 
                        type="button"
                        onClick={() => setLowStockCollapsed(!lowStockCollapsed)}
                        className="flex items-center gap-1.5 cursor-pointer hover:opacity-85 transition-opacity text-left bg-transparent border-none p-1 shrink hover:bg-rose-50/50 dark:hover:bg-rose-950/20 rounded-md focus:outline-none"
                        title={lowStockCollapsed ? "Tampilkan Stok Menipis" : "Sembunyikan Stok Menipis"}
                      >
                        {lowStockCollapsed ? (
                          <ChevronDown className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                        )}
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                          </span>
                          Stok Menipis ({lowStockItems.length})
                        </span>
                      </button>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          onClick={exportLowStockExcel}
                          size="sm"
                          className="px-2 py-0.5 text-[10px] h-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border border-emerald-750"
                        >
                          <FileSpreadsheet className="w-3 h-3 mr-1 shrink-0" />
                          Excel
                        </Button>
                        <Button
                          onClick={exportLowStockPDF}
                          size="sm"
                          className="px-2 py-0.5 text-[10px] h-6 bg-rose-600 hover:bg-rose-700 text-white shadow-xs border border-rose-750"
                        >
                          <FileText className="w-3 h-3 mr-1 shrink-0" />
                          PDF
                        </Button>
                      </div>
                    </div>
                    
                    {!lowStockCollapsed && (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                        {lowStockItems.map((item) => {
                          const isOut = item.stock <= 0;
                          return (
                            <div
                              key={`low-${item.id}`}
                              className={`p-3 rounded-xl border text-xs flex gap-3 shadow-xs transition-colors ${
                                isOut 
                                  ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 hover:border-red-300"
                                  : "bg-rose-500/5 dark:bg-rose-950/10 border-rose-200/50 dark:border-rose-900/30 hover:border-rose-300"
                              }`}
                            >
                              <div className={`p-2 rounded-lg self-start ${isOut ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'}`}>
                                <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="font-bold text-slate-800 dark:text-stone-200 block truncate text-[11px]">
                                  {item.name}
                                </span>
                                <p className="text-slate-500 dark:text-slate-450 mt-0.5 text-[10px] font-mono leading-tight truncate">
                                  SKU: {item.sku || '-'} • Sup: {getSupplierName(item.supplierId)}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${isOut ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-405' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-405'}`}>
                                    Stok: {item.stock} {data.units.find((u) => u.id === item.unitId)?.name || ""}
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                    Min: {item.minStock !== undefined ? item.minStock : 5}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Expiring Items Section */}
                {expiringItems.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                      Masa Expired Dekat ({expiringItems.length})
                    </h4>
                    <div className="space-y-2">
                      {expiringItems.map((item) => (
                        <div
                          key={`exp-${item.id}`}
                          className="p-3 bg-orange-500/5 dark:bg-amber-950/25 rounded-xl border border-orange-200/50 dark:border-amber-900/40 text-xs flex gap-3 shadow-xs hover:border-orange-300 dark:hover:border-amber-800 transition-colors"
                        >
                          <div className="p-2 bg-orange-100 dark:bg-amber-900/50 text-orange-600 dark:text-orange-400 rounded-lg self-start">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-slate-800 dark:text-stone-200 block truncate">
                              {item.name}
                            </span>
                            <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[10px]">
                              {item.batchNumber
                                ? `Batch: ${item.batchNumber}`
                                : "Batch Utama"}
                            </p>
                            <span className="text-orange-600 dark:text-orange-400 block mt-1 font-bold">
                              Exp: {item.expiryDate}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activities */}
                {recentTxs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <History className="w-3.5 h-3.5 text-indigo-500" />
                      Arus Barang Terbaru
                    </h4>
                    <div className="space-y-2">
                      {recentTxs.map((tx) => {
                        const item = data.items.find((i) => i.id === tx.itemId);
                        const isOut = tx.type === "OUT";
                        return (
                          <div
                            key={`tx-${tx.id}`}
                            className={`p-3 rounded-xl border text-xs flex gap-3 shadow-xs hover:shadow transition-shadow ${
                              isOut
                                ? "bg-indigo-505/5 dark:bg-indigo-950/20 border-indigo-200/50 dark:border-indigo-900/30"
                                : "bg-emerald-505/5 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30"
                            }`}
                          >
                            <div
                              className={`p-2 rounded-lg self-start ${
                                isOut
                                  ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                                  : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {isOut ? (
                                <PackageMinus className="w-4 h-4" />
                              ) : (
                                <PackagePlus className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-slate-700 dark:text-stone-300 block truncate">
                                {isOut
                                  ? "Barang Keluar (POS)"
                                  : "Barang Masuk (Inbound)"}
                              </span>
                              <span className="text-slate-600 dark:text-slate-400 block text-[11px] mt-0.5 font-medium">
                                {isOut ? "-" : "+"} {tx.qty} {item?.name}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-1">
                                {new Date(tx.date).toLocaleString("id-ID", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {totalNotifs === 0 && (
                  <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center justify-center">
                    <Bell className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-700 animate-bounce" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      Aman Terkendali!
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Sistem prima, semua stok aman.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Panel */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-2 shrink-0">
                <Button
                  className="w-full bg-slate-900 hover:bg-black text-white dark:bg-slate-800 dark:hover:bg-slate-700 font-bold"
                  onClick={() => setShowNotifications(false)}
                >
                  Tutup Panel
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
