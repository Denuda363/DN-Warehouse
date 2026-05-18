import React, { useState } from "react";
import { useAppContext } from "../store/AppContext";
import { Button } from "./ui/Button";
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
            onClick={() => setCurrentUser(null)}
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
            <div className="relative">
              <button
                className="p-2 relative rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5" />
                {totalNotifs > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow ring-2 ring-white dark:ring-slate-900">
                    {totalNotifs > 99 ? "99+" : totalNotifs}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-3 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
                    <span className="font-semibold text-sm">
                      Notifikasi ({totalNotifs})
                    </span>
                    <button
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                      onClick={() => setShowNotifications(false)}
                    >
                      Tutup
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {lowStockItems.map((item) => (
                      <div
                        key={`ls-${item.id}`}
                        className="p-3 bg-red-50 dark:bg-rose-900/10 rounded-lg border border-red-100 dark:border-rose-900/30 text-sm"
                      >
                        <span className="font-bold text-rose-600 dark:text-rose-400 block mb-1">
                          ⚠️ Stok Menipis
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">
                          {item.name} (Sisa: {item.stock})
                        </span>
                      </div>
                    ))}
                    {expiringItems.map((item) => (
                      <div
                        key={`exp-${item.id}`}
                        className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-900/30 text-sm"
                      >
                        <span className="font-bold text-orange-600 dark:text-orange-400 block mb-1">
                          ⏳ Akan Expired
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">
                          {item.name}{" "}
                          {item.batchNumber
                            ? `(Batch: ${item.batchNumber})`
                            : ""}{" "}
                          - Exp: {item.expiryDate}
                        </span>
                      </div>
                    ))}
                    {recentTxs.map((tx) => {
                      const item = data.items.find((i) => i.id === tx.itemId);
                      const isOut = tx.type === "OUT";
                      return (
                        <div
                          key={`tx-${tx.id}`}
                          className={`p-3 rounded-lg border text-sm ${isOut ? "bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30" : "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30"}`}
                        >
                          <div
                            className={`font-bold mb-1 ${isOut ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400"}`}
                          >
                            {isOut ? "📦 Barang Keluar" : "📥 Barang Masuk"} -{" "}
                            {new Date(tx.date).toLocaleDateString()}
                          </div>
                          <div className="text-slate-600 dark:text-slate-300">
                            {isOut ? "-" : "+"}
                            {tx.qty} {item?.name}
                          </div>
                        </div>
                      );
                    })}
                    {totalNotifs === 0 && (
                      <div className="px-4 py-8 text-center text-slate-500 text-sm flex flex-col items-center">
                        <Bell className="w-8 h-8 mb-2 opacity-20" />
                        Belum ada notifikasi
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-slate-50/50 dark:bg-slate-950/50 relative">
          <div className="max-w-7xl mx-auto h-full">{children}</div>
        </main>
      </div>
    </div>
  );
};
