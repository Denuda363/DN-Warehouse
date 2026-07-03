import React, { useState } from "react";
import { useAppContext } from "../store/AppContext";
import { ClockWidget } from "./ClockWidget";
import { Button } from "./ui/Button";
import { JarvisTransition } from "./JarvisTransition";
import { ExportLowStockModal } from "./ExportLowStockModal";
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
  Download,
} from "lucide-react";

export const Layout: React.FC<{
  children: React.ReactNode;
  currentPath: string;
  navigate: (p: string) => void;
}> = ({ children, currentPath, navigate }) => {
  const { currentUser, setCurrentUser, data, logActivity } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lowStockCollapsed, setLowStockCollapsed] = useState(false);
  const [selectedNotifTab, setSelectedNotifTab] = useState<"semua" | "stok" | "expired" | "arus">("semua");
  const [activeDetail, setActiveDetail] = useState<{
    type: "low" | "exp" | "tx";
    id: string;
    item?: any;
    tx?: any;
    batch?: any;
  } | null>(null);

  const rupiah = (val?: number) => {
    if (val === undefined || val === null) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleOpenDetail = (type: "low" | "exp" | "tx", originalData: any) => {
    if (type === "low") {
      setActiveDetail({
        type: "low",
        id: originalData.id,
        item: originalData,
      });
    } else if (type === "exp") {
      const itemIdClean = originalData.id.split("-")[0];
      const mainItem = data.items.find((i) => i.id === itemIdClean);
      setActiveDetail({
        type: "exp",
        id: originalData.id,
        item: mainItem || { name: originalData.name },
        batch: originalData,
      });
    } else if (type === "tx") {
      const txItem = data.items.find((i) => i.id === originalData.itemId);
      setActiveDetail({
        type: "tx",
        id: originalData.id,
        tx: originalData,
        item: txItem,
      });
    }
  };

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
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalNotifs =
    lowStockItems.length + expiringItems.length + recentTxs.length;

  const allNotificationsList = React.useMemo(() => {
    const list: {
      id: string;
      type: "low" | "exp" | "tx";
      title: string;
      subtitle: string;
      timeLabel: string;
      dateForSort: Date;
      originalData: any;
      severity: "danger" | "warning" | "info";
    }[] = [];

    // 1. Transactions - sorted chronologically
    recentTxs.forEach((tx) => {
      const item = data.items.find((i) => i.id === tx.itemId);
      const isOut = tx.type === "OUT";
      list.push({
        id: `tx-${tx.id}`,
        type: "tx",
        title: isOut ? "Arus Keluar (POS)" : "Arus Masuk (Inbound)",
        subtitle: `${isOut ? "-" : "+"} ${tx.qty} ${item?.name || "Produk"}`,
        timeLabel: new Date(tx.date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        dateForSort: new Date(tx.date),
        originalData: tx,
        severity: "info",
      });
    });

    // 2. Low stock items - standing alerts. To put these standing alerts of high urgency at the top, we assign them a high-priority "virtual" timestamp!
    lowStockItems.forEach((item) => {
      const isOut = item.stock <= 0;
      list.push({
        id: `low-${item.id}`,
        type: "low",
        title: `Stok Menipis: ${item.name}`,
        subtitle: `Stok: ${item.stock} ${data.units.find(u => u.id === item.unitId)?.name || ""}. Min: ${item.minStock !== undefined ? item.minStock : 5}`,
        timeLabel: "Pemberitahuan Aktif",
        // Position them highly on top of transactions (using current+Future offset so they are on top)
        dateForSort: new Date(Date.now() + 1000 * 60 * 60 * 24 * (isOut ? 10 : 5)),
        originalData: item,
        severity: isOut ? "danger" : "warning",
      });
    });

    // 3. Expiring items - alerts. We put them highly on top too!
    expiringItems.forEach((item) => {
      const expTime = new Date(item.expiryDate).getTime();
      const daysLeft = Math.ceil((expTime - Date.now()) / (1000 * 60 * 60 * 24));
      list.push({
        id: `exp-${item.id}`,
        type: "exp",
        title: `Dekat Expired: ${item.name}`,
        subtitle: `Batch: ${item.batchNumber || "Utama"} • Exp: ${item.expiryDate} (${daysLeft} Hari Lagi)`,
        timeLabel: `${daysLeft} Hari Lagi`,
        // Prioritize sooner expiration dates to be on top!
        dateForSort: new Date(Date.now() + 1000 * 60 * 60 * 24 * (30 - daysLeft)),
        originalData: item,
        severity: daysLeft <= 7 ? "danger" : "warning",
      });
    });

    // Sort by whichever has the newest/most critical sort timestamp, placing ALL matching recent notifications & critical alerts at the very top!
    return list.sort((a, b) => b.dateForSort.getTime() - a.dateForSort.getTime());
  }, [lowStockItems, expiringItems, recentTxs, data]);

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
                {data.warehouseProfile?.name || "DN-Gudang"}
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
                  {data.warehouseProfile?.name || "DN-Gudang"}
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
            <ClockWidget />
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
      
        {showNotifications && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] z-50 transition-opacity"
            />

            {/* Drawer */}
            <div
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
              </div>              {/* Filtering / Summary Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0 text-center text-xs font-bold leading-none select-none">
                <button
                  type="button"
                  onClick={() => setSelectedNotifTab("semua")}
                  className={`flex-1 py-3 text-[11px] font-bold border-b-2 transition-colors ${
                    selectedNotifTab === "semua"
                      ? "border-rose-600 text-rose-600 dark:text-rose-400 dark:border-rose-500"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Semua ({totalNotifs})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNotifTab("stok")}
                  className={`flex-1 py-3 text-[11px] font-bold border-b-2 transition-colors ${
                    selectedNotifTab === "stok"
                      ? "border-rose-600 text-rose-600 dark:text-rose-400 dark:border-rose-500"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Stok ({lowStockItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNotifTab("expired")}
                  className={`flex-1 py-3 text-[11px] font-bold border-b-2 transition-colors ${
                    selectedNotifTab === "expired"
                      ? "border-rose-600 text-rose-600 dark:text-rose-400 dark:border-rose-500"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Expired ({expiringItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNotifTab("arus")}
                  className={`flex-1 py-3 text-[11px] font-bold border-b-2 transition-colors ${
                    selectedNotifTab === "arus"
                      ? "border-rose-600 text-rose-600 dark:text-rose-400 dark:border-rose-500"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Arus Baru ({recentTxs.length})
                </button>
              </div>

              {/* List Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-950/20 custom-scrollbar">
                
                {/* 1. SEMUA TAB (Combined Chrono Feed, newest/most critical alerts at the top) */}
                {selectedNotifTab === "semua" && (
                  <>
                    {allNotificationsList.length > 0 ? (
                      <div className="space-y-3">
                        {allNotificationsList.map((notif) => {
                          const isLow = notif.type === "low";
                          const isExp = notif.type === "exp";
                          const isTx = notif.type === "tx";

                          // Determine beautiful colors based on severity / type
                          let bgClass = "bg-blue-50/50 dark:bg-blue-950/15 border-blue-100 dark:border-blue-900/20 hover:border-blue-300";
                          let iconBg = "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400";
                          let IconComponent = ArrowRightLeft;

                          if (notif.severity === "danger") {
                            bgClass = "bg-red-500/5 dark:bg-red-950/15 border-red-200/60 dark:border-red-900/30 hover:border-red-350";
                            iconBg = "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-405";
                          } else if (notif.severity === "warning") {
                            bgClass = "bg-orange-500/5 dark:bg-amber-950/15 border-orange-200/60 dark:border-amber-900/30 hover:border-orange-355";
                            iconBg = "bg-orange-100 text-orange-600 dark:bg-amber-950 dark:text-orange-405";
                          }

                          if (isLow) {
                            IconComponent = AlertTriangle;
                          } else if (isExp) {
                            IconComponent = Calendar;
                          } else if (isTx) {
                            const tx = notif.originalData;
                            IconComponent = tx.type === "OUT" ? PackageMinus : PackagePlus;
                            if (tx.type === "OUT") {
                              bgClass = "bg-indigo-500/5 dark:bg-indigo-950/15 border-indigo-200/60 dark:border-indigo-900/30 hover:border-indigo-350";
                              iconBg = "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400";
                            } else {
                              bgClass = "bg-emerald-500/5 dark:bg-emerald-950/15 border-emerald-200/60 dark:border-emerald-900/30 hover:border-emerald-350";
                              iconBg = "bg-emerald-100 text-emerald-600 dark:bg-emerald-955 dark:text-emerald-400";
                            }
                          }

                          return (
                            <div
                              key={notif.id}
                              onClick={() => handleOpenDetail(notif.type, notif.originalData)}
                              className={`p-3 rounded-xl border text-xs flex gap-3 shadow-xs hover:shadow transition-all duration-200 cursor-pointer active:scale-[0.99] select-none ${bgClass}`}
                            >
                              <div className={`p-2 rounded-lg self-start shrink-0 ${iconBg}`}>
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="font-bold text-slate-800 dark:text-stone-200 block truncate text-[11px] sm:text-xs">
                                    {notif.title}
                                  </span>
                                  <span className="text-[8px] font-black uppercase font-mono px-1 py-0.5 rounded bg-slate-500/10 text-slate-500 dark:text-slate-400 whitespace-nowrap font-bold">
                                    {notif.type === "low" ? "STOK" : notif.type === "exp" ? "EXP" : "ARUS"}
                                  </span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-450 mt-1 text-[10px] truncate leading-tight">
                                  {notif.subtitle}
                                </p>
                                <span className="text-[9px] text-slate-400 dark:text-slate-550 font-medium font-mono block mt-1.5">
                                  {notif.timeLabel}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
                        Tidak ada notifikasi aktif.
                      </div>
                    )}
                  </>
                )}

                {/* 2. STOK TAB */}
                {selectedNotifTab === "stok" && (
                  <>
                    <div className="flex justify-between items-center bg-rose-50/25 dark:bg-rose-950/10 p-1.5 rounded-lg border border-rose-200/40 dark:border-rose-900/40 mb-2 select-none shrink-0 text-left">
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wilder font-mono px-2">
                        Stok Menipis ({lowStockItems.length})
                      </span>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          onClick={() => setIsExportModalOpen(true)}
                          size="sm"
                          className="px-2 py-0.5 text-[9px] h-6 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs border border-indigo-750"
                        >
                          <Download className="w-3 h-3 mr-1 shrink-0" />
                          Ekspor
                        </Button>
                      </div>
                    </div>

                    {lowStockItems.length > 0 ? (
                      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                        {lowStockItems.map((item) => {
                          const isOut = item.stock <= 0;
                          return (
                            <div
                              key={`low-${item.id}`}
                              onClick={() => handleOpenDetail("low", item)}
                              className={`p-3 rounded-xl border text-xs flex gap-3 shadow-xs hover:shadow cursor-pointer transition-all duration-200 active:scale-[0.99] select-none ${
                                isOut 
                                  ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 hover:border-red-300"
                                  : "bg-rose-500/5 dark:bg-rose-950/10 border-rose-200/50 dark:border-rose-900/30 hover:border-rose-300"
                              }`}
                            >
                              <div className={`p-2 rounded-lg self-start shrink-0 ${isOut ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'}`}>
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="font-bold text-slate-800 dark:text-stone-200 block truncate text-[11px] sm:text-xs">
                                  {item.name}
                                </span>
                                <p className="text-slate-500 dark:text-slate-450 mt-0.5 text-[10px] font-mono leading-tight truncate">
                                  SKU: {item.sku || '-'} • Sup: {getSupplierName(item.supplierId)}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${isOut ? 'bg-red-105 text-red-700' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'}`}>
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
                    ) : (
                      <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                        Tidak ada stok barang yang menipis.
                      </div>
                    )}
                  </>
                )}

                {/* 3. EXPIRED TAB */}
                {selectedNotifTab === "expired" && (
                  <>
                    {expiringItems.length > 0 ? (
                      <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
                        {expiringItems.map((item) => {
                          const expTime = new Date(item.expiryDate).getTime();
                          const daysLeft = Math.ceil((expTime - Date.now()) / (1000 * 60 * 60 * 24));
                          return (
                            <div
                              key={`exp-${item.id}`}
                              onClick={() => handleOpenDetail("exp", item)}
                              className="p-3 bg-orange-500/5 dark:bg-amber-950/25 rounded-xl border border-orange-200/50 dark:border-amber-900/40 text-xs flex gap-3 shadow-xs hover:border-orange-350 hover:shadow cursor-pointer transition-all duration-200 active:scale-[0.99] select-none"
                            >
                              <div className="p-2 bg-orange-100 dark:bg-amber-900/50 text-orange-600 dark:text-orange-400 rounded-lg self-start shrink-0">
                                <Calendar className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="font-bold text-slate-800 dark:text-stone-200 block truncate text-[11px] sm:text-xs">
                                  {item.name}
                                </span>
                                <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[10px] font-mono leading-tight">
                                  {item.batchNumber ? `Batch: ${item.batchNumber}` : "Batch Utama"}
                                </p>
                                <span className="text-orange-650 dark:text-orange-400 block mt-1.5 font-bold font-mono text-[10px]">
                                  Exp: {item.expiryDate} ({daysLeft} Hari Lagi)
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                        Tidak ada barang mendekati batas kadaluarsa.
                      </div>
                    )}
                  </>
                )}

                {/* 4. ARUS BARU TAB */}
                {selectedNotifTab === "arus" && (
                  <>
                    {recentTxs.length > 0 ? (
                      <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
                        {recentTxs.map((tx) => {
                          const item = data.items.find((i) => i.id === tx.itemId);
                          const isOut = tx.type === "OUT";
                          return (
                            <div
                              key={`tx-${tx.id}`}
                              onClick={() => handleOpenDetail("tx", tx)}
                              className={`p-3 rounded-xl border text-xs flex gap-3 shadow-xs hover:shadow cursor-pointer transition-all duration-200 active:scale-[0.99] select-none ${
                                isOut
                                  ? "bg-indigo-505/5 dark:bg-indigo-950/15 border-indigo-200/50 dark:border-indigo-900/30 hover:border-indigo-300"
                                  : "bg-emerald-505/5 dark:bg-emerald-950/15 border-emerald-200/50 dark:border-emerald-900/30 hover:border-emerald-300"
                              }`}
                            >
                              <div
                                className={`p-2 rounded-lg self-start shrink-0 ${
                                  isOut
                                    ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                                    : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                                }`}
                              >
                                {isOut ? <PackageMinus className="w-4 h-4" /> : <PackagePlus className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="font-bold text-slate-700 dark:text-stone-300 block truncate text-[11px] sm:text-xs font-mono">
                                  {isOut ? "Barang Keluar (POS)" : "Barang Masuk (Inbound)"}
                                </span>
                                <span className="text-slate-655 dark:text-slate-400 block text-[11px] mt-0.5 font-medium leading-tight">
                                  {isOut ? "-" : "+"} {tx.qty} {item?.name || "Produk Hilang"}
                                </span>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-1.5 font-mono">
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
                    ) : (
                      <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                        Tidak ada transaksi tersimpan.
                      </div>
                    )}
                  </>
                )}

                {totalNotifs === 0 && (
                  <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center justify-center">
                    <Bell className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-700 animate-bounce" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      Semua Aman Terkendali!
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Sistem prima, tidak ada peringatan aktif.
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
            </div>
          </>
        )}
      

      {/* Detail Overlay Dialog Modal */}
      
        {activeDetail && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setActiveDetail(null)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] transition-all"
            />

            {/* Modal Card */}
            <div
              className="fixed inset-x-4 top-[10%] max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-[101] overflow-hidden flex flex-col focus:outline-none"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${
                    activeDetail.type === "low" 
                      ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
                      : activeDetail.type === "exp"
                      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                      : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                  }`}>
                    {activeDetail.type === "low" && <AlertTriangle className="w-5 h-5 animate-pulse" />}
                    {activeDetail.type === "exp" && <Calendar className="w-5 h-5" />}
                    {activeDetail.type === "tx" && <ArrowRightLeft className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5 font-mono">
                      {activeDetail.type === "low" && "DETAIL PERINGATAN STOK"}
                      {activeDetail.type === "exp" && "DETAIL BATAS KADALUARSA"}
                      {activeDetail.type === "tx" && "DETAIL AKTIVITAS ARUS"}
                    </span>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-stone-100">
                      {activeDetail.type === "low" && "Stok Barang Menipis"}
                      {activeDetail.type === "exp" && "Pemberitahuan Kadaluarsa"}
                      {activeDetail.type === "tx" && (activeDetail.tx?.type === "OUT" ? "Barang Keluar (POS)" : "Barang Masuk (Inbound)")}
                    </h4>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDetail(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-105 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300 custom-scrollbar">
                
                {/* 1. Low Stock Content */}
                {activeDetail.type === "low" && activeDetail.item && (
                  <div className="space-y-4">
                    <div className="bg-rose-500/5 border border-rose-200/50 dark:border-rose-955/40 p-4 rounded-2xl flex flex-col gap-1">
                      <span className="text-[10px] text-rose-500 dark:text-rose-400 uppercase tracking-wilder font-extrabold font-mono">Nama Produk</span>
                      <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-stone-100 leading-snug">{activeDetail.item.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">SKU: {activeDetail.item.sku || "-"}</p>
                    </div>

                    {/* Stock Alert Visualizer Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold font-mono">
                        <span className="text-slate-400">STATUS LEVEL STOK</span>
                        <span className={activeDetail.item.stock <= 0 ? "text-rose-600 dark:text-rose-450 animate-pulse" : "text-amber-600 dark:text-amber-450"}>
                          {activeDetail.item.stock <= 0 ? "HABIS TOTAL" : "MENIPIS/KRITIS"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden relative">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${activeDetail.item.stock <= 0 ? "bg-red-600" : "bg-amber-500 animate-pulse"}`} 
                          style={{ width: `${Math.max(4, Math.min(100, (activeDetail.item.stock / (activeDetail.item.minStock || 5)) * 100))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-400">
                        <span>Min Stok: {activeDetail.item.minStock !== undefined ? activeDetail.item.minStock : 5}</span>
                        <span className="font-extrabold text-slate-700 dark:text-stone-300">Stok Sekarang: {activeDetail.item.stock} {data.units.find(u => u.id === activeDetail.item.unitId)?.name || ""}</span>
                      </div>
                    </div>

                    {/* Detail Grid */}
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-150 dark:border-slate-800/80 pt-4 text-xs font-medium">
                      <div className="space-y-1">
                        <span className="text-slate-400 block font-mono font-bold">KATEGORI PRODUK</span>
                        <span className="text-slate-705 dark:text-stone-200 text-sm font-bold">
                          {data.categories.find(c => c.id === activeDetail.item.categoryId)?.name || "Kategori Umum"}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 block font-mono font-bold">ESTIMASI SELLING PRICE</span>
                        <span className="text-slate-705 dark:text-stone-200 text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                          {rupiah(activeDetail.item.sellingPrice)}
                        </span>
                      </div>
                    </div>

                    {/* Supplier Box */}
                    <div className="border border-slate-100 dark:border-slate-800/50 p-4 rounded-2xl bg-slate-50/40 dark:bg-slate-900/40 space-y-2 mt-4">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Supplier Utama Informasi</h5>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 dark:text-stone-200 text-sm">
                          {getSupplierName(activeDetail.item.supplierId)}
                        </span>
                        {activeDetail.item.supplierId && (
                          <span className="text-slate-500 font-mono text-[10px]">
                            {data.suppliers.find(s => s.id === activeDetail.item.supplierId)?.contact || "No Kontak"}
                          </span>
                        )}
                      </div>
                      {activeDetail.item.altSupplierId && (
                        <div className="pt-2 border-t border-dashed border-slate-250 dark:border-slate-800 text-[11px] text-slate-450">
                          Supplier Cadangan: <strong className="text-slate-700 dark:text-stone-300">{getSupplierName(activeDetail.item.altSupplierId)}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Expiring Content */}
                {activeDetail.type === "exp" && activeDetail.batch && (
                  <div className="space-y-4">
                    <div className="bg-amber-500/5 border border-amber-200/50 dark:border-amber-955/40 p-4 rounded-2xl flex flex-col gap-1">
                      <span className="text-[10px] text-amber-500 dark:text-amber-400 uppercase tracking-wilder font-extrabold font-mono font-bold">Nama Produk</span>
                      <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-stone-100 leading-snug">{activeDetail.item.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">SKU: {activeDetail.item.sku || "-"}</p>
                    </div>

                    <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/40 dark:border-rose-900/20 rounded-2xl flex items-center gap-3">
                      <div className="p-2.5 bg-rose-500 text-white rounded-xl">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-wide text-rose-500 dark:text-rose-450 font-black block font-mono font-bold">Tanggal Kadaluarsa</span>
                        <span className="text-base font-bold text-rose-700 dark:text-rose-300 font-mono block">
                          {activeDetail.batch.expiryDate}
                        </span>
                      </div>
                    </div>

                    {/* Detail Grid */}
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-150 dark:border-slate-800/80 pt-4 text-xs font-semibold">
                      <div className="space-y-1">
                        <span className="text-slate-400 block font-mono font-bold">NOMOR BATCH</span>
                        <span className="text-slate-700 dark:text-stone-200 text-sm font-bold font-mono">
                          {activeDetail.batch.batchNumber || "Batch Utama"}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 block font-mono font-bold">KATEGORI PRODUK</span>
                        <span className="text-slate-700 dark:text-stone-200 text-sm font-bold">
                          {data.categories.find(c => c.id === activeDetail.item.categoryId)?.name || "Kategori Umum"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Transaction Content */}
                {activeDetail.type === "tx" && activeDetail.tx && (
                  <div className="space-y-4">
                    {/* Transaction header banner */}
                    <div className={`p-4 rounded-2xl border flex flex-col gap-1 ${
                      activeDetail.tx.type === "OUT"
                        ? "bg-indigo-500/5 border-indigo-200 dark:border-indigo-955/40"
                        : "bg-emerald-500/5 border-emerald-200 dark:border-emerald-955/40"
                    }`}>
                      <div className="flex gap-2 items-center">
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded font-mono font-bold ${
                          activeDetail.tx.type === "OUT"
                            ? "bg-indigo-100 text-indigo-750 dark:bg-indigo-900/40"
                            : "bg-emerald-100 text-emerald-750 dark:bg-emerald-900/40"
                        }`}>
                          {activeDetail.tx.type === "OUT" ? "BARANG KELUAR (POS)" : "BARANG MASUK (INBOUND)"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-2 block font-mono font-bold">PRODUK YANG TERLIBAT</span>
                      <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-stone-100 leading-snug">{activeDetail.item?.name || "Produk tidak dikenal"}</h3>
                      <p className="text-xs text-slate-450 font-mono">SKU: {activeDetail.item?.sku || "-"}</p>
                    </div>

                    {/* Quantity Transacted details */}
                    <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40">
                      <div>
                        <span className="text-[11px] text-slate-400 font-mono block">JUMLAH ALIRAN STOK</span>
                        <span className={`text-2xl font-black font-mono ${activeDetail.tx.type === "OUT" ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {activeDetail.tx.type === "OUT" ? "-" : "+"} {activeDetail.tx.qty} {data.units.find(u => u.id === activeDetail.item?.unitId)?.name || ""}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 font-mono block">WAKTU EKSEKUSI</span>
                        <span className="text-xs font-bold font-mono text-slate-700 dark:text-stone-300 block mt-1">
                          {new Date(activeDetail.tx.date).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Detail Information List */}
                    <div className="space-y-3.5 pt-1.5 font-medium">
                      <div className="flex justify-between text-xs py-2 border-b border-dashed border-slate-150 dark:border-slate-800">
                        <span className="text-slate-400 font-mono text-[10px]">OPERATOR / PIC</span>
                        <span className="font-extrabold text-slate-800 dark:text-stone-200">
                          {data.users.find(u => u.id === activeDetail.tx.userId)?.username || "User"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs py-2 border-b border-dashed border-slate-150 dark:border-slate-800">
                        <span className="text-slate-400 font-mono text-[10px]">INVOICE LINK / ID</span>
                        <span className="font-extrabold text-slate-700 dark:text-stone-300 font-mono text-indigo-505">
                          {activeDetail.tx.invoiceId || "Tanpa Invoice"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5 py-1">
                        <span className="text-slate-400 font-mono text-[10px]">MEMO / CATATAN TRANSAKSI</span>
                        <div className="bg-slate-100/60 dark:bg-slate-950/30 p-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 leading-relaxed italic">
                          "{activeDetail.tx.notes || "Tidak ada catatan tambahan"}"
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/55 dark:bg-slate-900/35 flex gap-2">
                <Button
                  className="w-full bg-slate-900 hover:bg-black text-white dark:bg-slate-800 dark:hover:bg-slate-700 font-bold py-2.5 rounded-2xl"
                  onClick={() => setActiveDetail(null)}
                >
                  Selesai Meninjau
                </Button>
              </div>
            </div>
          </>
        )}
      

      <ExportLowStockModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        lowStockItems={lowStockItems}
        data={data}
      />
    </div>
  );
};
