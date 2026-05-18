import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AppData, User, Category, Unit, Supplier, Item, Transaction } from '../types';

const defaultData: AppData = {
  users: [
    {
      id: 'admin-1',
      username: 'admin',
      password: 'password', // in real application, this should be hashed
      role: 'ADMIN',
      permissions: ['MANAGE_USERS', 'MANAGE_MASTER', 'VIEW_REPORTS', 'MANAGE_TRANSACTIONS'],
    }
  ],
  categories: [{ id: 'cat-1', name: 'Elektronik' }, { id: 'cat-2', name: 'Perabot' }],
  units: [{ id: 'unit-1', name: 'Pcs' }, { id: 'unit-2', name: 'Box' }],
  suppliers: [{ id: 'sup-1', name: 'PT Sumber Makmur', contact: '08123456789' }],
  items: [
    { id: 'item-1', sku: 'ELK-001', name: 'Laptop ASUS', categoryId: 'cat-1', unitId: 'unit-1', stock: 15, minStock: 5 },
    { id: 'item-2', sku: 'PRB-001', name: 'Meja Kantor', categoryId: 'cat-2', unitId: 'unit-1', stock: 3, minStock: 10 },
  ],
  transactions: [],
  purchaseInvoices: [],
  theme: 'light',
  colorTheme: 'indigo',
};

type AppContextType = {
  data: AppData;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  updateData: (partial: Partial<AppData>) => void;
  resetData: (newData: AppData) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(defaultData);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('gudang_data');
    if (saved) {
      try {
        setData({ ...defaultData, ...JSON.parse(saved) });
      } catch (e) {
        console.error("Failed to parse saved data");
      }
    }
    const savedUser = localStorage.getItem('gudang_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        // ignore
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('gudang_data', JSON.stringify(data));
    }
  }, [data, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      if (currentUser) {
        localStorage.setItem('gudang_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('gudang_user');
      }
    }
  }, [currentUser, isLoaded]);

  const updateData = (partial: Partial<AppData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const resetData = (newData: AppData) => {
    setData(newData);
  };

  if (!isLoaded) return null; // Or a loader

  return (
    <AppContext.Provider value={{ data, currentUser, setCurrentUser, updateData, resetData }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};
