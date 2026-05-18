/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './store/AppContext';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { MasterData } from './pages/MasterData';
import { PosView } from './pages/PosView';
import { PurchaseInvoiceContainer } from './pages/PurchaseInvoiceContainer';
import { Report } from './pages/Report';
import { Settings } from './pages/Settings';

function AppContent() {
  const { currentUser, data } = useAppContext();
  const [currentPath, setCurrentPath] = useState('dashboard');

  useEffect(() => {
    // Apply theme to document
    if (data.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [data.theme]);

  useEffect(() => {
    // Remove existing color theme classes
    document.documentElement.classList.remove(
      'theme-indigo', 'theme-emerald', 'theme-blue', 'theme-orange', 'theme-rose'
    );
    // Add current color theme
    if (data.colorTheme) {
      document.documentElement.classList.add(`theme-${data.colorTheme}`);
    }
  }, [data.colorTheme]);

  if (!currentUser) {
    return <Login onSuccess={() => setCurrentPath('dashboard')} />;
  }

  const renderPage = () => {
    switch (currentPath) {
      case 'dashboard': return <Dashboard />;
      case 'master': return <MasterData />;
      case 'inbound': return <PurchaseInvoiceContainer />;
      case 'outbound': return <PosView />;
      case 'report': return <Report />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
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
