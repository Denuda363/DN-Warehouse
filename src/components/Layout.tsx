import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../store/AppContext";
import { Button } from "./ui/Button";
import { JarvisTransition } from "./JarvisTransition";
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
  X,
  AlertTriangle,
  Calendar,
  History,
} from "lucide-react";

export const Layout: React.FC<{
  children: React.ReactNode;
  currentPath: string;
  navigate: (p: string) => void;
}> = ({ children, currentPath, navigate }) => {
  const { currentUser, setCurrentUser, data } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  // Notifications computing
  const lowStockItems = data.items.filter((i) => i.stock <= i.minStock);

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

  return (
    <div
      className={`min-h-screen flex h-screen overflow-hidden ${data.theme === "dark" ? "dark bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}
    >
      {/* Sidebar - Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 h-full ${sidebarOpen ? "w-72 translate-x-0" : "w-20 -translate-x-full md:translate-x-0"} transition-all duration-300 flex flex-col font-sans shrink-0 border-r shadow-2xl md:shadow-none`}
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
              try {
                 const { auth } = await import("../firebase");
                 const { signOut } = await import("firebase/auth");
                 await signOut(auth);
              } catch(e){}
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
        <header className="h-16 bg-white dark:bg-slate-900/50 backdrop-blur border-b dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-6">
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
                <Bell className={`w-5 h-5 ${totalNotifs > 0 ? "animate-bounce" : ""}`} style={{ animationDuration: "2.5s" }} />
                {totalNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-extrabold text-white shadow-lg ring-2 ring-white dark:ring-slate-900 animate-pulse">
                    {totalNotifs > 99 ? "99+" : totalNotifs}
                  </span>
                )}
              </button>
            </div>
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
                    <h3 className="font-bold text-base leading-none">Pusat Notifikasi</h3>
                    <p className="text-[10px] text-rose-100 dark:text-rose-400 mt-1">{totalNotifs} Peringatan Aktif</p>
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
                  <div className="font-bold text-rose-600 dark:text-rose-400 text-sm">{lowStockItems.length}</div>
                  <div>Stok Menipis</div>
                </div>
                <div>
                  <div className="font-bold text-orange-500 dark:text-orange-400 text-sm">{expiringItems.length}</div>
                  <div>Hampir Expired</div>
                </div>
                <div>
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{recentTxs.length}</div>
                  <div>Arus Baru</div>
                </div>
              </div>

              {/* List Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-950/20 custom-scrollbar">
                {/* Low Stock Section */}
                {lowStockItems.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      Stok Menipis ({lowStockItems.length})
                    </h4>
                    <div className="space-y-2">
                      {lowStockItems.map((item) => (
                        <div
                          key={`ls-${item.id}`}
                          className="p-3 bg-red-500/5 dark:bg-rose-950/25 rounded-xl border border-red-200/50 dark:border-rose-900/40 text-xs flex gap-3 shadow-xs hover:border-red-300 dark:hover:border-rose-800 transition-colors"
                        >
                          <div className="p-2 bg-red-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg self-start">
                            <AlertTriangle className="w-4 h-4 animate-bounce" style={{ animationDuration: '3s' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-slate-800 dark:text-stone-200 block truncate">
                              {item.name}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 block mt-0.5 font-mono text-[10px]">
                              SKU: {item.sku}
                            </span>
                            <span className="text-rose-600 dark:text-rose-400 font-bold block mt-1 font-semibold">
                              Sisa: {item.stock} / Min: {item.minStock}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
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
                              {item.batchNumber ? `Batch: ${item.batchNumber}` : "Batch Utama"}
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
                              {isOut ? <PackageMinus className="w-4 h-4" /> : <PackagePlus className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-slate-700 dark:text-stone-300 block truncate">
                                {isOut ? "Barang Keluar (POS)" : "Barang Masuk (Inbound)"}
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
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Aman Terkendali!</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Sistem prima, semua stok aman.</p>
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
