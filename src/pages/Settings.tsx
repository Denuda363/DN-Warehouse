import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useAppContext } from "../store/AppContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
  Download,
  Upload,
  Moon,
  Sun,
  Palette,
  LayoutTemplate,
} from "lucide-react";
import { UsersManagement } from "./UsersManagement";
import { JarvisTransition } from "../components/JarvisTransition";
import { ActivityLogList } from "./ActivityLogList";

export const Settings: React.FC = () => {
  const { data, updateData, resetData, currentUser, logActivity } =
    useAppContext();
  const [activeTab, setActiveTab] = useState<
    "theme" | "backup" | "profile" | "users" | "logs"
  >("theme");
  const [pinInput, setPinInput] = useState("");
  const DEFAULT_PIN = "123456";

  const handleResetApp = async () => {
    if (pinInput !== DEFAULT_PIN) {
      alert("PIN salah.");
      return;
    }
    if (confirm("Ingin mereset seluruh data aplikasi dan mengembalikan ke setelan awal? SEMUA TRANSAKSI SEBELUMNYA AKAN HILANG.")) {
       const initialData = {
         users: data.users, // preserve users
         categories: [],
         units: [],
         suppliers: [],
         staffs: [],
         items: [],
         transactions: [],
         purchaseInvoices: [],
         activityLogs: [],
         theme: "light" as "light" | "dark",
         colorTheme: "indigo",
         navStyle: "sidebar" as "sidebar" | "topbar" | "bottombar",
         mobileNavStyle: "bottombar" as "sidebar" | "topbar" | "bottombar",
       };
       await resetData(initialData as any);
       alert("Reset data berhasil!");
       setPinInput("");
    }
  };

  const handleBackup = () => {
    const backupJson = JSON.stringify(data, null, 2);
    const blob = new Blob([backupJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dn-gudang_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logActivity("Backup Data", "Mengunduh file backup aplikasi (JSON)");
  };

  const handleBackupExcel = () => {
    const wb = XLSX.utils.book_new();

    const itemsWs = XLSX.utils.json_to_sheet(data.items.map(item => ({
      ID: item.id,
      SKU: item.sku,
      Nama: item.name,
      KategoriID: item.categoryId,
      SatuanID: item.unitId,
      Stok: item.stock,
      MinStok: item.minStock || 0,
      HargaJual: item.sellingPrice || 0,
      SupplierID: item.supplierId || "",
    })));
    XLSX.utils.book_append_sheet(wb, itemsWs, "Barang");

    const categoriesWs = XLSX.utils.json_to_sheet(data.categories.map(c => ({ ID: c.id, Nama: c.name })));
    XLSX.utils.book_append_sheet(wb, categoriesWs, "Kategori");

    const unitsWs = XLSX.utils.json_to_sheet(data.units.map(u => ({ ID: u.id, Nama: u.name })));
    XLSX.utils.book_append_sheet(wb, unitsWs, "Satuan");

    const suppliersWs = XLSX.utils.json_to_sheet(data.suppliers.map(s => ({ ID: s.id, Nama: s.name, Kontak: s.contact })));
    XLSX.utils.book_append_sheet(wb, suppliersWs, "Supplier");

    const transactionsWs = XLSX.utils.json_to_sheet(data.transactions.map(t => ({
      ID: t.id,
      Tanggal: t.date,
      Tipe: t.type,
      BarangID: t.itemId,
      Qty: t.qty,
      Catatan: t.notes,
      UserID: t.userId
    })));
    XLSX.utils.book_append_sheet(wb, transactionsWs, "Transaksi");

    const usersWs = XLSX.utils.json_to_sheet(data.users.map(u => ({ 
      ID: u.id, 
      Username: u.username, 
      Role: u.role,
      Permissions: (u.permissions || []).join(","),
      AllowedCategoryIds: (u.allowedCategoryIds || []).join(",")
    })));
    XLSX.utils.book_append_sheet(wb, usersWs, "Pengguna");

    XLSX.writeFile(wb, `dn-gudang_backup_${new Date().toISOString().split("T")[0]}.xlsx`);
    logActivity("Backup Data Excel", "Mengunduh file backup aplikasi (Excel)");
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.items && parsed.users) {
          if (confirm("Restore akan menimpa semua data saat ini. Lanjutkan?")) {
            if (currentUser) {
              const newLog = {
                id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
                userId: currentUser.id,
                username: currentUser.username,
                action: "Restore Data",
                details: "Memulihkan data aplikasi dari file backup",
                timestamp: new Date().toISOString(),
              };
              parsed.activityLogs = [newLog, ...(parsed.activityLogs || [])].slice(0, 1000);
            }
            await resetData(parsed);
            alert("Restore berhasil!");
          }
        } else {
          alert("Format file backup tidak valid.");
        }
      } catch (error) {
        alert("Gagal melakukan restore. Pastikan file valid.");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const dataStr = event.target?.result;
        const wb = XLSX.read(dataStr, { type: "array" });
        
        const restoredData: any = { ...data };
        
        if (wb.SheetNames.includes("Barang")) {
          const itemsRaw = XLSX.utils.sheet_to_json<any>(wb.Sheets["Barang"]);
          restoredData.items = itemsRaw.map((row: any) => ({
            id: String(row.ID || row.id || ""),
            sku: String(row.SKU || row.sku || ""),
            name: String(row.Nama || row.name || ""),
            categoryId: String(row.KategoriID || row.categoryId || ""),
            unitId: String(row.SatuanID || row.unitId || ""),
            stock: Number(row.Stok || row.stock) || 0,
            minStock: Number(row.MinStok || row.minStock) || 0,
            sellingPrice: Number(row.HargaJual || row.sellingPrice) || 0,
            supplierId: row.SupplierID ? String(row.SupplierID) : (row.supplierId ? String(row.supplierId) : ""),
          }));
        }

        if (wb.SheetNames.includes("Kategori")) {
          const catRaw = XLSX.utils.sheet_to_json<any>(wb.Sheets["Kategori"]);
          restoredData.categories = catRaw.map((row: any) => ({
            id: String(row.ID || row.id || ""),
            name: String(row.Nama || row.name || ""),
          }));
        }

        if (wb.SheetNames.includes("Satuan")) {
          const unitRaw = XLSX.utils.sheet_to_json<any>(wb.Sheets["Satuan"]);
          restoredData.units = unitRaw.map((row: any) => ({
            id: String(row.ID || row.id || ""),
            name: String(row.Nama || row.name || ""),
          }));
        }

        if (wb.SheetNames.includes("Supplier")) {
          const supRaw = XLSX.utils.sheet_to_json<any>(wb.Sheets["Supplier"]);
          restoredData.suppliers = supRaw.map((row: any) => ({
            id: String(row.ID || row.id || ""),
            name: String(row.Nama || row.name || ""),
            contact: String(row.Kontak || row.contact || ""),
          }));
        }

        if (wb.SheetNames.includes("Transaksi")) {
          const transRaw = XLSX.utils.sheet_to_json<any>(wb.Sheets["Transaksi"]);
          restoredData.transactions = transRaw.map((row: any) => ({
            id: String(row.ID || row.id || ""),
            date: String(row.Tanggal || row.date || ""),
            type: String(row.Tipe || row.type || ""),
            itemId: String(row.BarangID || row.itemId || ""),
            qty: Number(row.Qty || row.qty) || 0,
            notes: String(row.Catatan || row.notes || ""),
            userId: String(row.UserID || row.userId || ""),
          }));
        }

        if (wb.SheetNames.includes("Pengguna")) {
          const usersRaw = XLSX.utils.sheet_to_json<any>(wb.Sheets["Pengguna"]);
          restoredData.users = usersRaw.map((row: any) => ({
            id: String(row.ID || row.id || ""),
            username: String(row.Username || row.username || ""),
            role: String(row.Role || row.role || "STAFF"),
            permissions: (row.Permissions || "").split(",").filter(Boolean),
            allowedCategoryIds: (row.AllowedCategoryIds || "").split(",").filter(Boolean),
            password: data.users.find(u => u.id === String(row.ID || row.id))?.password || "", // Preserve password
          }));
        }

        if (confirm("Restore dari Excel akan menimpa data (Barang, Kategori, Satuan, Supplier, Transaksi, Pengguna) sesuai dengan sheet yang ada. Lanjutkan?")) {
          if (currentUser) {
            const newLog = {
              id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
              userId: currentUser.id,
              username: currentUser.username,
              action: "Restore Data Excel",
              details: "Memulihkan data aplikasi dari file backup Excel",
              timestamp: new Date().toISOString(),
            };
            restoredData.activityLogs = [newLog, ...(restoredData.activityLogs || [])].slice(0, 1000);
          }
          await resetData(restoredData);
          alert("Restore dari Excel berhasil!");
        }
      } catch (error) {
        console.error("Excel restore error", error);
        alert("Gagal membaca file Excel. Pastikan format sesuai.");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const colors = [
    { id: "indigo", name: "Indigo", bgClass: "bg-indigo-600" },
    { id: "emerald", name: "Emerald", bgClass: "bg-emerald-600" },
    { id: "blue", name: "Blue", bgClass: "bg-blue-600" },
    { id: "orange", name: "Orange", bgClass: "bg-orange-600" },
    { id: "rose", name: "Rose", bgClass: "bg-rose-600" },
    { id: "purple", name: "Purple", bgClass: "bg-purple-600" },
    { id: "slate", name: "Slate", bgClass: "bg-slate-600" },
    { id: "cyan", name: "Cyan", bgClass: "bg-cyan-600" },
    { id: "red", name: "Red", bgClass: "bg-red-600" },
    { id: "amber", name: "Amber", bgClass: "bg-amber-600" },
  ] as const;

  const allTabs = [
    { id: "theme", label: "Tampilan Tema", perm: "SETTING_TAB_THEME" },
    { id: "backup", label: "Backup & Restore", perm: "SETTING_TAB_BACKUP" },
    { id: "profile", label: "Profil Gudang", perm: "SETTING_TAB_PROFILE" },
    { id: "users", label: "Manajemen Pengguna", perm: "SETTING_TAB_USERS" },
    { id: "logs", label: "Log Aktivitas", perm: "SETTING_TAB_LOGS" },
  ];

  const tabs = allTabs.filter((t) => {
    if (currentUser?.role === "ADMIN") return true;
    return (currentUser?.permissions || []).includes(t.perm);
  });

  useEffect(() => {
    if (tabs.length > 0 && !tabs.find((t) => t.id === activeTab)) {
      setActiveTab(tabs[0].id as any);
    }
  }, [tabs, activeTab]);

  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">Anda tidak memiliki akses ke menu ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8 flex flex-col h-[calc(100vh-120px)]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-slate-500 text-sm">
          Kelola konfigurasi sistem Anda.
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300 dark:hover:border-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-2">
        <JarvisTransition pageKey={activeTab} mode="tab">
          {activeTab === "theme" && (
            <Card>
              <CardHeader>
                <CardTitle>Tampilan Tema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm font-medium mb-3">
                    Mode Gelap / Terang
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant={data.theme === "light" ? "default" : "outline"}
                      onClick={() => updateData({ theme: "light" })}
                      className="w-full justify-center"
                    >
                      <Sun className="w-4 h-4 mr-2" /> Terang
                    </Button>
                    <Button
                      variant={data.theme === "dark" ? "default" : "outline"}
                      onClick={() => updateData({ theme: "dark" })}
                      className="w-full justify-center"
                    >
                      <Moon className="w-4 h-4 mr-2" /> Gelap
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-3 flex items-center">
                    <Palette className="w-4 h-4 mr-2 text-slate-500" /> Warna
                    Utama
                  </p>
                  <div className="flex gap-3 justify-center md:justify-start flex-wrap">
                    {colors.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => updateData({ colorTheme: c.id })}
                        title={`Pilih tema ${c.name}`}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${c.bgClass} ${
                          data.colorTheme === c.id
                            ? "ring-4 ring-slate-300 dark:ring-slate-700 scale-110 shadow-lg"
                            : "hover:scale-105 hover:shadow opacity-80"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-3 flex items-center">
                    Ganti Background / Wallpaper
                  </p>
                  <div className="flex flex-col gap-4">
                     <div className="flex items-center gap-4">
                        <div className="relative">
                          <Button
                            type="button"
                            variant="outline"
                            className="relative border-slate-300"
                          >
                            <Upload className="w-3.5 h-3.5 mr-2" /> Upload Background
                            <input
                              type="file"
                              accept="image/*"
                              title="Upload Background"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    updateData({
                                      backgroundImage: event.target?.result as string,
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </Button>
                        </div>
                        {data.backgroundImage && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => updateData({ backgroundImage: null })}
                          >
                            Hapus Background
                          </Button>
                        )}
                     </div>
                     {data.backgroundImage && (
                        <div>
                           <label className="text-xs text-slate-500 block mb-1">Tingkat Kegelapan/Kecerahan Transparansi Overlay Wallpaper: ({data.backgroundOpacity !== undefined ? data.backgroundOpacity : 80}%)</label>
                           <input 
                              type="range" min="0" max="100" 
                              className="w-full sm:w-64 accent-indigo-600 cursor-pointer"
                              value={data.backgroundOpacity !== undefined ? data.backgroundOpacity : 80}
                              onChange={(e) => {
                                 updateData({ backgroundOpacity: Number(e.target.value) });
                              }}
                           />
                        </div>
                     )}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-3 flex items-center">
                    <LayoutTemplate className="w-4 h-4 mr-2 text-slate-500" />{" "}
                    Gaya Navigasi Desktop (Layar Lebar)
                  </p>
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <Button
                      variant={
                        data.navStyle === "sidebar" || !data.navStyle
                          ? "default"
                          : "outline"
                      }
                      onClick={() => updateData({ navStyle: "sidebar" })}
                      className="flex-1 justify-center"
                    >
                      Sidebar Klasik
                    </Button>
                    <Button
                      variant={
                        data.navStyle === "topbar" ? "default" : "outline"
                      }
                      onClick={() => updateData({ navStyle: "topbar" })}
                      className="flex-1 justify-center"
                    >
                      Atas (Topbar)
                    </Button>
                    <Button
                      variant={
                        data.navStyle === "bottombar" ? "default" : "outline"
                      }
                      onClick={() => updateData({ navStyle: "bottombar" })}
                      className="flex-1 justify-center"
                    >
                      Bawah (Bottombar)
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-sm font-medium mb-3 flex items-center">
                    <LayoutTemplate className="w-4 h-4 mr-2 text-slate-500" />{" "}
                    Gaya Navigasi Mobile (Layar Kecil)
                  </p>
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <Button
                      variant={
                        data.mobileNavStyle === "sidebar"
                          ? "default"
                          : "outline"
                      }
                      onClick={() => updateData({ mobileNavStyle: "sidebar" })}
                      className="flex-1 justify-center"
                    >
                      Sidebar
                    </Button>
                    <Button
                      variant={
                        data.mobileNavStyle === "topbar" ? "default" : "outline"
                      }
                      onClick={() => updateData({ mobileNavStyle: "topbar" })}
                      className="flex-1 justify-center"
                    >
                      Atas (Topbar)
                    </Button>
                    <Button
                      variant={
                        data.mobileNavStyle === "bottombar" ||
                        !data.mobileNavStyle
                          ? "default"
                          : "outline"
                      }
                      onClick={() =>
                        updateData({ mobileNavStyle: "bottombar" })
                      }
                      className="flex-1 justify-center"
                    >
                      Bawah (Bottombar)
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      id="navIsTransparent"
                      checked={data.navIsTransparent || false}
                      onChange={(e) =>
                        updateData({ navIsTransparent: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label
                      htmlFor="navIsTransparent"
                      className="text-sm font-medium"
                    >
                      Navigasi Transparan
                    </label>
                  </div>

                  {!data.navIsTransparent && (
                    <div>
                      <p className="text-sm font-medium mb-1">
                        Warna Background Navigasi
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={data.navBgColor || "#0f172a"}
                          onChange={(e) =>
                            updateData({ navBgColor: e.target.value })
                          }
                          className="w-12 p-1 h-9 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={data.navBgColor || "#0f172a"}
                          onChange={(e) =>
                            updateData({ navBgColor: e.target.value })
                          }
                          className="flex-1 font-mono text-sm"
                          placeholder="#0f172a"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium mb-1">
                      Warna Teks Navigasi
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={data.navTextColor || "#e2e8f0"}
                        onChange={(e) =>
                          updateData({ navTextColor: e.target.value })
                        }
                        className="w-12 p-1 h-9 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={data.navTextColor || "#e2e8f0"}
                        onChange={(e) =>
                          updateData({ navTextColor: e.target.value })
                        }
                        className="flex-1 font-mono text-sm"
                        placeholder="#e2e8f0"
                      />
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateData({
                          navBgColor: "#0f172a",
                          navTextColor: "#e2e8f0",
                        })
                      }
                    >
                      Reset ke Default
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "backup" && (
            <Card>
              <CardHeader>
                <CardTitle>Backup & Restore</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleBackup}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Download className="w-4 h-4 mr-2" /> Backup Data (JSON)
                </Button>

                <Button
                  onClick={handleBackupExcel}
                  className="w-full mb-2 bg-emerald-600 text-white hover:bg-emerald-700 border-none shadow-sm"
                >
                  <Download className="w-4 h-4 mr-2" /> Backup Data (Excel)
                </Button>

                <div className="relative mb-2">
                  <Button className="w-full relative bg-slate-900 text-slate-50 hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200">
                    <Upload className="w-4 h-4 mr-2" /> Restore Data (JSON)
                    <input
                      title="Restore data JSON"
                      type="file"
                      accept="application/json"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleRestore}
                    />
                  </Button>
                </div>

                <div className="relative">
                  <Button className="w-full relative bg-emerald-700 text-white hover:bg-emerald-800 border-none shadow-sm">
                    <Upload className="w-4 h-4 mr-2" /> Restore Data (Excel)
                    <input
                      title="Restore data Excel"
                      type="file"
                      accept=".xlsx, .xls"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleRestoreExcel}
                    />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 text-center mt-2">
                  Simpan data secara berkala untuk menghindari kehilangan log stok.
                </p>

                <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-rose-600 mb-2">Reset Data Keseluruhan</h4>
                  <p className="text-sm text-slate-500 mb-4">
                    Peringatan: Semua data transaksi, stok, dan referensi akan terhapus. Masukkan PIN keamanan untuk melanjutkan. (PIN Default: <b>123456</b>)
                  </p>
                  <div className="flex gap-2">
                    <Input 
                      type="password" 
                      placeholder="Masukkan PIN" 
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleResetApp}
                      variant="destructive"
                      className="bg-rose-600 text-white"
                      disabled={!pinInput}
                    >
                      Reset Data
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Profil Gudang</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Nama Gudang</p>
                  <Input
                    type="text"
                    value={data.warehouseProfile?.name || ""}
                    onChange={(e) =>
                      updateData({
                        warehouseProfile: {
                          ...data.warehouseProfile,
                          name: e.target.value,
                        } as any,
                      })
                    }
                    placeholder="Ex: PT. Gudang Amanah"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Alamat</p>
                  <Input
                    type="text"
                    value={data.warehouseProfile?.address || ""}
                    onChange={(e) =>
                      updateData({
                        warehouseProfile: {
                          ...data.warehouseProfile,
                          address: e.target.value,
                        } as any,
                      })
                    }
                    placeholder="Jln. Raya No. 12"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Telepon</p>
                  <Input
                    type="text"
                    value={data.warehouseProfile?.phone || ""}
                    onChange={(e) =>
                      updateData({
                        warehouseProfile: {
                          ...data.warehouseProfile,
                          phone: e.target.value,
                        } as any,
                      })
                    }
                    placeholder="021-1234567"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Logo</p>
                  <div className="flex items-center gap-4 mt-2">
                    {data.warehouseProfile?.logo ? (
                      <img
                        src={data.warehouseProfile.logo}
                        alt="Logo"
                        className="w-16 h-16 object-contain rounded border border-slate-200 p-1 bg-white"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400">
                        <span className="text-[10px] mt-1">No Logo</span>
                      </div>
                    )}
                    <div>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="relative w-32 border-slate-300"
                        >
                          <Upload className="w-3.5 h-3.5 mr-2" /> Upload
                          <input
                            type="file"
                            accept="image/*"
                            title="Upload Logo"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  updateData({
                                    warehouseProfile: {
                                      ...data.warehouseProfile,
                                      logo: event.target?.result as string,
                                    } as any,
                                  });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </Button>
                      </div>
                      {data.warehouseProfile?.logo && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-1 text-rose-500 hover:text-rose-600 hover:bg-rose-50 w-32 h-8"
                          onClick={() =>
                            updateData({
                              warehouseProfile: {
                                ...data.warehouseProfile,
                                logo: undefined,
                              } as any,
                            })
                          }
                        >
                          Hapus Logo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "users" && <UsersManagement />}
          {activeTab === "logs" && <ActivityLogList />}
        </JarvisTransition>
      </div>
    </div>
  );
};
