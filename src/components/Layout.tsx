import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { Button } from './ui/Button';
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
} from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode; currentPath: string; navigate: (p: string) => void }> = ({ children, currentPath, navigate }) => {
  const { currentUser, setCurrentUser, data } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  // Notifications computing
  const lowStockItems = data.items.filter(i => i.stock <= i.minStock);
  
  const soonInMs = 30 * 24 * 60 * 60 * 1000;
  const expiringItems: { id: string; name: string; expiryDate: string; batchNumber?: string }[] = [];
  data.items.forEach(i => {
    if(i.expiryDate) {
      const exp = new Date(i.expiryDate).getTime();
      if(exp - Date.now() < soonInMs && exp > Date.now()) {
        expiringItems.push({ id: `${i.id}-main`, name: i.name, expiryDate: i.expiryDate, batchNumber: i.batchNumber });
      }
    }
    if(i.batches) {
      i.batches.forEach((b, idx) => {
        if(b.expiryDate) {
          const exp = new Date(b.expiryDate).getTime();
          if(exp - Date.now() < soonInMs && exp > Date.now()) {
            expiringItems.push({ id: `${i.id}-b${idx}`, name: i.name, expiryDate: b.expiryDate, batchNumber: b.batchNumber });
          }
        }
      });
    }
  });

  const recentTxs = [...data.transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  const totalNotifs = lowStockItems.length + expiringItems.length + recentTxs.length;

  const menus = [
    { name: 'Dashboard', path: 'dashboard', icon: LayoutDashboard },
    { name: 'Faktur Masuk', path: 'inbound', icon: PackagePlus },
    { name: 'Kasir (POS)', path: 'outbound', icon: PackageMinus },
    { name: 'Arus Stok', path: 'report', icon: ArrowRightLeft },
    { name: 'Master Data', path: 'master', icon: Database },
    { name: 'Pengaturan', path: 'settings', icon: Settings },
  ];

  return (
    <div className={`min-h-screen flex ${data.theme === 'dark' ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Sidebar - Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 ${sidebarOpen ? 'w-72 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0'} transition-all duration-300 border-r border-slate-800/60 shadow-2xl lg:shadow-none flex flex-col font-sans ${data.navIsTransparent ? 'backdrop-blur-md bg-transparent' : ''}`}
        style={data.navIsTransparent ? {
          color: data.navTextColor || '#e2e8f0'
        } : {
          backgroundColor: data.navBgColor || '#0f172a', // default slate-900
          color: data.navTextColor || '#e2e8f0' // default slate-200
        }}
      >
        <div 
          className="h-20 flex items-center justify-center border-b border-indigo-500/10 relative overflow-hidden shrink-0"
          style={{ backgroundColor: data.navIsTransparent ? 'transparent' : (data.navBgColor ? 'transparent' : '#0f172a') }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-transparent"></div>
          {data.warehouseProfile?.logo ? (
            <img src={data.warehouseProfile.logo} alt="Logo" className={`w-8 h-8 rounded shrink-0 object-contain transition-all shadow-[0_0_8px_rgba(255,255,255,0.2)] ${!sidebarOpen && 'lg:scale-110'}`} />
          ) : (
            <Database className={`w-8 h-8 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all shrink-0 ${!sidebarOpen && 'lg:scale-110'}`} />
          )}
          {sidebarOpen && <span className="ml-3 font-black text-xl tracking-tight bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent drop-shadow-sm truncate pr-2">{data.warehouseProfile?.name || 'GudangSync'}</span>}
        </div>
        <nav className="flex-1 py-6 flex flex-col gap-2 px-4 overflow-y-auto custom-scrollbar">
          {menus.map(m => {
            const Icon = m.icon;
            const active = currentPath === m.path;
            
            // basic permission check for UI mapping
            if (m.path === 'settings' && !currentUser?.permissions.includes('MANAGE_USERS')) return null;

            return (
              <button
                key={m.path}
                onClick={() => {
                  navigate(m.path);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`relative group flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 overflow-hidden ${active ? 'bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)] border border-indigo-500/30 text-indigo-300' : 'hover:bg-slate-800/50 border border-transparent opacity-80 hover:opacity-100'}`}
                style={!active && data.navTextColor ? { color: data.navTextColor } : {}}
                title={sidebarOpen ? undefined : m.name}
              >
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>}
                
                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${active ? 'scale-110 drop-shadow-[0_0_5px_rgba(99,102,241,0.4)]' : 'group-hover:scale-110 group-hover:text-indigo-300'}`} />
                {sidebarOpen && <span className="ml-4 text-sm font-semibold tracking-wide">{m.name}</span>}
              </button>
            )
          })}
        </nav>
        <div className="p-4 border-t border-slate-800/60 bg-slate-900/50 flex flex-col gap-3 backdrop-blur-md">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-shrink-0 items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-100 truncate">{currentUser?.username}</p>
                <p className="text-[10px] text-indigo-300/80 uppercase tracking-widest truncate font-medium mt-0.5">{currentUser?.role}</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 mx-auto rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
              {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <button
            onClick={() => setCurrentUser(null)}
            className={`flex items-center w-full px-4 py-3 rounded-xl text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 border border-transparent transition-all ${!sidebarOpen ? 'justify-center px-0' : ''}`}
            title="Keluar"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="ml-4 text-sm font-semibold tracking-wide">Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex items-center justify-between px-6">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="cursor-pointer mr-2" onClick={() => setShowNotifications(!showNotifications)}>
                <Bell className="w-6 h-6 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors" />
                {totalNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
                    {totalNotifs > 99 ? '99+' : totalNotifs}
                  </span>
                )}
              </div>
              
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden flex flex-col max-h-96">
                  <div className="p-3 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                    <span className="font-bold text-sm">Notifikasi ({totalNotifs})</span>
                    <button className="text-xs text-indigo-600 hover:underline" onClick={() => setShowNotifications(false)}>Tutup</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {lowStockItems.map(item => (
                      <div key={`ls-${item.id}`} className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-900/30 text-xs">
                        <span className="font-bold text-red-600 dark:text-red-400">Stok Menipis:</span> {item.name} (Sisa: {item.stock})
                      </div>
                    ))}
                    {expiringItems.map(item => (
                      <div key={`exp-${item.id}`} className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-100 dark:border-orange-900/30 text-xs">
                        <span className="font-bold text-orange-600 dark:text-orange-400">Akan Expired:</span> {item.name} {item.batchNumber ? `(Batch: ${item.batchNumber})` : ''} - Exp: {item.expiryDate}
                      </div>
                    ))}
                    {recentTxs.map(tx => {
                      const item = data.items.find(i => i.id === tx.itemId);
                      const isOut = tx.type === 'OUT';
                      return (
                        <div key={`tx-${tx.id}`} className={`p-2 rounded border text-xs ${isOut ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30'}`}>
                           <div className="font-bold mb-1">{isOut ? 'Barang Keluar' : 'Barang Masuk'} - {new Date(tx.date).toLocaleDateString()}</div>
                           <div>{isOut ? '-' : '+'}{tx.qty} {item?.name}</div>
                        </div>
                      )
                    })}
                    {totalNotifs === 0 && (
                      <div className="p-4 text-center text-slate-500 text-sm">Belum ada notifikasi</div>
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
