import React, { createContext, useContext, useEffect, useState } from "react";
import type {
  AppData,
  User,
  Category,
  Unit,
  Supplier,
  Staff,
  Item,
  Transaction,
  PurchaseInvoice,
} from "../types";
import { db, auth } from "../firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

const defaultData: AppData = {
  users: [
    {
      id: "admin-1",
      username: "admin",
      password: "password", // kept for compatibility although unused
      role: "ADMIN",
      permissions: [
        "MANAGE_USERS",
        "MANAGE_MASTER",
        "VIEW_REPORTS",
        "MANAGE_TRANSACTIONS",
      ],
    },
  ],
  categories: [
    { id: "cat-1", name: "Elektronik" },
    { id: "cat-2", name: "Perabot" },
  ],
  units: [
    { id: "unit-1", name: "Pcs" },
    { id: "unit-2", name: "Box" },
  ],
  suppliers: [
    { id: "sup-1", name: "PT Sumber Makmur", contact: "08123456789" },
  ],
  staffs: [{ id: "staff-1", name: "Budi Santoso", phone: "08111222333" }],
  items: [
    {
      id: "item-1",
      sku: "ELK-001",
      name: "Laptop ASUS",
      categoryId: "cat-1",
      unitId: "unit-1",
      stock: 15,
      minStock: 5,
    },
    {
      id: "item-2",
      sku: "PRB-001",
      name: "Meja Kantor",
      categoryId: "cat-2",
      unitId: "unit-1",
      stock: 3,
      minStock: 10,
    },
  ],
  transactions: [],
  purchaseInvoices: [],
  theme: "light",
  colorTheme: "indigo",
};

type AppContextType = {
  data: AppData;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  updateData: (partial: Partial<AppData>) => void;
  resetData: (newData: AppData) => void;
  isLoading: boolean;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<AppData>(defaultData);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  useEffect(() => {
    let isSettingInitial = false;

    const unsub = onSnapshot(
      doc(db, "appData", "main"),
      async (snap) => {
        if (snap.exists()) {
          const fetched = { ...defaultData, ...snap.data() } as AppData;
          setData(fetched);

          // Match currently logged in google user to local User by email or assume admin
          const savedUserStr = localStorage.getItem("gudang_user");
          if (savedUserStr) {
            try {
              setCurrentUser(JSON.parse(savedUserStr));
            } catch (e) {}
          }
          setIsLoading(false);
        } else {
          if (!isSettingInitial) {
            isSettingInitial = true;
            try {
              await setDoc(doc(db, "appData", "main"), defaultData);
              setData(defaultData);
            } catch (e) {
              console.error(e);
            }
            setIsLoading(false);
          }
        }
      },
      (error) => {
        console.error(error);
        setIsLoading(false);
      },
    );

    return unsub;
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("gudang_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("gudang_user");
    }
  }, [currentUser]);

  const updateData = async (partial: Partial<AppData>) => {
    const newData = { ...data, ...partial };
    setData(newData);
    try {
      await setDoc(doc(db, "appData", "main"), newData);
    } catch (e) {
      console.error("Failed to sync to firebase:", e);
    }
  };

  const resetData = async (newData: AppData) => {
    setData(newData);
    try {
      await setDoc(doc(db, "appData", "main"), newData);
    } catch (e) {
      console.error("Failed to sync to firebase:", e);
    }
  };

  return (
    <AppContext.Provider
      value={{
        data,
        currentUser,
        setCurrentUser,
        updateData,
        resetData,
        isLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useAppContext must be used within AppProvider");
  return context;
};
