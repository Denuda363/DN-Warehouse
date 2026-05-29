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
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  getDocFromServer,
} from "firebase/firestore";
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
    },
    {
      id: "item-2",
      sku: "PRB-001",
      name: "Meja Kantor",
      categoryId: "cat-2",
      unitId: "unit-1",
      stock: 3,
    },
  ],
  transactions: [],
  purchaseInvoices: [],
  activityLogs: [],
  theme: "light",
  colorTheme: "indigo",
  navStyle: "sidebar",
  mobileNavStyle: "bottombar",
};

type AppContextType = {
  data: AppData;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  updateData: (partial: Partial<AppData>) => void;
  resetData: (newData: AppData) => void;
  isLoading: boolean;
  logActivity: (action: string, details: string, userOverride?: User) => void;
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
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, "appData", "connection_test"));
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("the client is offline")
        ) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();

    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
  }, []);

  useEffect(() => {
    let isSettingInitial = false;
    setIsLoading(true);

    const unsub = onSnapshot(
      doc(db, "appData", "main"),
      async (snap) => {
        if (snap.exists()) {
          const fetched = { ...defaultData, ...snap.data() } as AppData;
          setData(fetched);

          const savedUserStr =
            sessionStorage.getItem("gudang_user") ||
            localStorage.getItem("gudang_user");
          if (savedUserStr) {
            try {
              const parsed = JSON.parse(savedUserStr);
              if (firebaseUser) {
                // Security verification: ensure it matches logged in Google user email
                if (parsed.username === firebaseUser.email) {
                  setCurrentUser(parsed);
                } else if (
                  fetched.users.find((u) => u.username === firebaseUser.email)
                ) {
                  setCurrentUser(
                    fetched.users.find(
                      (u) => u.username === firebaseUser.email,
                    ) as User,
                  );
                } else {
                  setCurrentUser(null);
                }
              } else {
                // Local session: verify it exists in fetched.users
                const activeLocalUser = fetched.users.find(
                  (u) => u.username === parsed.username,
                );
                if (activeLocalUser) {
                  setCurrentUser(activeLocalUser);
                } else {
                  setCurrentUser(null);
                }
              }
            } catch (e) {
              setCurrentUser(null);
            }
          } else {
            if (
              firebaseUser &&
              fetched.users.find((u) => u.username === firebaseUser.email)
            ) {
              setCurrentUser(
                fetched.users.find(
                  (u) => u.username === firebaseUser.email,
                ) as User,
              );
            } else {
              setCurrentUser(null);
            }
          }
          setIsLoading(false);
        } else {
          if (!isSettingInitial) {
            isSettingInitial = true;
            try {
              // If main document doesn't exist, try to initialize it.
              await setDoc(doc(db, "appData", "main"), defaultData);
              setData(defaultData);
            } catch (e) {
              handleFirestoreError(e, OperationType.CREATE, "appData/main");
            }
            setIsLoading(false);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "appData/main");
      },
    );

    return () => unsub();
  }, [firebaseUser]);

  useEffect(() => {
    if (currentUser) {
      if (localStorage.getItem("gudang_remember") !== "false") {
        localStorage.setItem("gudang_user", JSON.stringify(currentUser));
        sessionStorage.removeItem("gudang_user");
      } else {
        sessionStorage.setItem("gudang_user", JSON.stringify(currentUser));
        localStorage.removeItem("gudang_user");
      }
    } else {
      localStorage.removeItem("gudang_user");
      sessionStorage.removeItem("gudang_user");
    }
  }, [currentUser]);

  const updateData = async (partial: Partial<AppData>) => {
    const newData = { ...data, ...partial };
    setData(newData);
    try {
      await setDoc(doc(db, "appData", "main"), newData);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, "appData/main");
    }
  };

  const resetData = async (newData: AppData) => {
    setData(newData);
    try {
      await setDoc(doc(db, "appData", "main"), newData);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, "appData/main");
    }
  };

  const logActivity = (
    action: string,
    details: string,
    userOverride?: User,
  ) => {
    const user = userOverride || currentUser;
    if (!user) return;
    const newLog = {
      id:
        "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      userId: user.id,
      username: user.username,
      action,
      details,
      timestamp: new Date().toISOString(),
    };

    const currentLogs = data.activityLogs || [];
    const newLogs = [newLog, ...currentLogs].slice(0, 1000); // Keep last 1000 logs max

    const newData = { ...data, activityLogs: newLogs };
    setData(newData);
    setDoc(doc(db, "appData", "main"), newData).catch((e) => {
      console.error("Failed to save activity log", e);
    });
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
        logActivity,
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
