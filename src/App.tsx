/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AppProvider, useAppContext } from "./store/AppContext";
import { Login } from "./pages/Login";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { MasterData } from "./pages/MasterData";
import { PosView } from "./pages/PosView";
import { PurchaseInvoiceContainer } from "./pages/PurchaseInvoiceContainer";
import { Report } from "./pages/Report";
import { Settings } from "./pages/Settings";

function AppContent() {
  const { currentUser, data, isLoading } = useAppContext();
  const [currentPath, setCurrentPath] = useState("dashboard");

  useEffect(() => {
    // Apply theme to document
    if (data.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [data.theme]);

  useEffect(() => {
    // Remove existing color theme classes
    document.documentElement.classList.remove(
      "theme-indigo",
      "theme-emerald",
      "theme-blue",
      "theme-orange",
      "theme-rose",
      "theme-purple",
      "theme-slate",
      "theme-cyan",
      "theme-red",
      "theme-amber",
    );
    // Add current color theme
    if (data.colorTheme) {
      document.documentElement.classList.add(`theme-${data.colorTheme}`);
    }
  }, [data.colorTheme]);

  useEffect(() => {
    // Determine path based on permissions
    const menus = [
      { path: "dashboard", perm: "VIEW_DASHBOARD" },
      { path: "inbound", perm: "ACCESS_PURCHASE" },
      { path: "outbound", perm: "ACCESS_POS" },
      { path: "report", perm: "VIEW_REPORTS" },
      { path: "master", perm: "MANAGE_MASTER" },
      { path: "settings", perm: "MANAGE_USERS" },
    ];

    if (currentUser?.role === "ADMIN") return;

    const permittedPaths = menus
      .filter((m) => (currentUser?.permissions || []).includes(m.perm))
      .map((m) => m.path);
    if (permittedPaths.length > 0 && !permittedPaths.includes(currentPath)) {
      setCurrentPath(permittedPaths[0]);
    }
  }, [currentPath, currentUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-medium">Memuat sistem...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onSuccess={() => setCurrentPath("dashboard")} />;
  }

  const renderPage = () => {
    if (currentUser?.role !== "ADMIN") {
      const menus = [
        { path: "dashboard", perm: "VIEW_DASHBOARD" },
        { path: "inbound", perm: "ACCESS_PURCHASE" },
        { path: "outbound", perm: "ACCESS_POS" },
        { path: "report", perm: "VIEW_REPORTS" },
        { path: "master", perm: "MANAGE_MASTER" },
        { path: "settings", perm: "MANAGE_USERS" },
      ];
      const currentMenu = menus.find((m) => m.path === currentPath);
      if (currentMenu && !(currentUser?.permissions || []).includes(currentMenu.perm)) {
        return (
          <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-8">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Akses Ditolak</h2>
              <p className="text-slate-500 dark:text-slate-400">Anda tidak memiliki izin untuk melihat halaman ini.</p>
            </div>
          </div>
        );
      }
    }

    switch (currentPath) {
      case "dashboard":
        return <Dashboard />;
      case "master":
        return <MasterData />;
      case "inbound":
        return <PurchaseInvoiceContainer />;
      case "outbound":
        return <PosView />;
      case "report":
        return <Report />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPath={currentPath} navigate={(path) => setCurrentPath(path)}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
