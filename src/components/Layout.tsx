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
      className={`min-h-screen flex ${data.theme === "dark" ? "dark bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}
    >
      {/* Sidebar - Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 ${sidebarOpen ? "w-72 translate-x-0" : "w-20 -translate-x-full lg:translate-x-0"} transition-all duration-300 border-r border-slate-800/20 shadow-2xl lg:shadow-none flex flex-col font-sans`}
        style={
          data.navIsTransparent
            ? { backgroundColor: "transparent", color: data.navTextColor || "#e2e8f0" }
            : {
                backgroundColor: data.navBgColor || (data.theme === "dark" ? "#111111" : "#ffffff"),
                color: data.navTextColor || (data.theme === "dark" ? "#e2e8f0" : "#334155"),
              }
        }
      >
        {/* Mac OS like dots */}
        <div className="flex px-5 pt-5 pb-2 gap-1.5 shrink-0">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>

        <div className="px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center">
            {data.warehouseProfile?.logo ? (
              <img
                src={data.warehouseProfile.logo}
                alt="Logo"
                className={`w-8 h-8 rounded shrink-0 object-contain shadow-sm bg-indigo-500/10 p-1`}
              />
            ) : (
              <div className="w-8 h-8 rounded bg-indigo-500/10 flex items-center justify-center shrink-0">
                <div className="w-4 h-4 bg-indigo-500 rounded-sm"></div>
              </div>
            )}
            {sidebarOpen && (
              <span className="ml-3 font-bold text-base tracking-wide uppercase" style={{ color: data.navTextColor || (data.theme === "dark" ? "#ffffff" : "#0f172a") }}>
                {data.warehouseProfile?.name || "ROUNDS"}
              </span>
            )}
          </div>
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-md border hover:bg-slate-500/10 transition-colors" style={{ borderColor: "currentColor", opacity: 0.5 }}>
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="px-4 py-3 shrink-0">
           <div className="flex items-center w-full px-3 py-2 rounded-md bg-slate-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              {sidebarOpen && (
                <input 
                   type="text" 
                   placeholder="Search" 
                   className="ml-3 bg-transparent border-none outline-none text-sm w-full placeholder-current" 
                   style={{ opacity: 0.7 }}
                   disabled
                />
              )}
           </div>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto custom-scrollbar relative">
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
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`relative group flex items-center px-6 py-3 transition-colors ${active ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
                style={
                  active ? { color: "#6366f1" } : { color: "currentColor" }
                }
                title={sidebarOpen ? undefined : m.name}
              >
                {active && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-l-md"></div>
                )}

                <Icon className="w-5 h-5 flex-shrink-0" />
                
                {sidebarOpen && (
                  <span className="ml-4 text-sm font-medium">
                    {m.name}
                  </span>
                )}
              </button>
            );
          })}

          <div className="px-6 py-4">
             <div className="border-t border-dashed opacity-20" style={{ borderColor: 'currentColor' }}></div>
          </div>

          <button
             onClick={() => setCurrentUser(null)}
             className={`relative group flex items-center px-6 py-3 transition-colors opacity-60 hover:opacity-100`}
             style={{ color: "currentColor" }}
             title="Logout"
          >
             <LogOut className="w-5 h-5 flex-shrink-0" />
             {sidebarOpen && <span className="ml-4 text-sm font-medium">Logout</span>}
          </button>
        </nav>

        <div className="p-5 border-t border-dashed opacity-90 shrink-0" style={{ borderColor: 'currentColor', borderTopWidth: '1px', borderStyle: 'dashed', borderOpacity: 0.2 }}>
          <div className={`flex items-center ${!sidebarOpen ? 'justify-center' : ''}`}>
             <div className="w-9 h-9 rounded-full bg-rose-200 overflow-hidden shrink-0 flex items-center justify-center">
                {currentUser?.username?.charAt(0).toUpperCase() || "U"}
             </div>
             {sidebarOpen && (
               <div className="ml-3 overflow-hidden text-left">
                 <p className="text-sm font-medium truncate" style={{ color: "currentColor", opacity: 0.9 }}>{currentUser?.username}</p>
                 <p className="text-[11px] truncate mt-0.5 lowercase" style={{ color: "currentColor", opacity: 0.5 }}>{currentUser?.username}@gudang.com</p>
               </div>
             )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-6">
            <div className="relative">
              <div
                className="cursor-pointer mr-2"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-6 h-6 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors" />
                {totalNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
                    {totalNotifs > 99 ? "99+" : totalNotifs}
                  </span>
                )}
              </div>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden flex flex-col max-h-96">
                  <div className="p-3 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                    <span className="font-bold text-sm">
                      Notifikasi ({totalNotifs})
                    </span>
                    <button
                      className="text-xs text-indigo-600 hover:underline"
                      onClick={() => setShowNotifications(false)}
                    >
                      Tutup
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {lowStockItems.map((item) => (
                      <div
                        key={`ls-${item.id}`}
                        className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-900/30 text-xs"
                      >
                        <span className="font-bold text-red-600 dark:text-red-400">
                          Stok Menipis:
                        </span>{" "}
                        {item.name} (Sisa: {item.stock})
                      </div>
                    ))}
                    {expiringItems.map((item) => (
                      <div
                        key={`exp-${item.id}`}
                        className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-100 dark:border-orange-900/30 text-xs"
                      >
                        <span className="font-bold text-orange-600 dark:text-orange-400">
                          Akan Expired:
                        </span>{" "}
                        {item.name}{" "}
                        {item.batchNumber ? `(Batch: ${item.batchNumber})` : ""}{" "}
                        - Exp: {item.expiryDate}
                      </div>
                    ))}
                    {recentTxs.map((tx) => {
                      const item = data.items.find((i) => i.id === tx.itemId);
                      const isOut = tx.type === "OUT";
                      return (
                        <div
                          key={`tx-${tx.id}`}
                          className={`p-2 rounded border text-xs ${isOut ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30" : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30"}`}
                        >
                          <div className="font-bold mb-1">
                            {isOut ? "Barang Keluar" : "Barang Masuk"} -{" "}
                            {new Date(tx.date).toLocaleDateString()}
                          </div>
                          <div>
                            {isOut ? "-" : "+"}
                            {tx.qty} {item?.name}
                          </div>
                        </div>
                      );
                    })}
                    {totalNotifs === 0 && (
                      <div className="p-4 text-center text-slate-500 text-sm">
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
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950 relative">
          {children}
        </main>
      </div>
    </div>
  );
};
