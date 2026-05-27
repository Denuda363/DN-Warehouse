import React, { useState, useEffect } from "react";
import { useAppContext } from "../store/AppContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Download, Upload, Moon, Sun, Palette } from "lucide-react";
import { UsersManagement } from "./UsersManagement";
import { JarvisTransition } from "../components/JarvisTransition";
import { ActivityLogList } from "./ActivityLogList";

export const Settings: React.FC = () => {
  const { data, updateData, resetData, currentUser, logActivity } = useAppContext();
  const [activeTab, setActiveTab] = useState<
    "theme" | "backup" | "profile" | "users" | "logs"
  >("theme");

  const handleBackup = () => {
    const backupJson = JSON.stringify(data, null, 2);
    const blob = new Blob([backupJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gudangsync_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logActivity("Backup Data", "Mengunduh file backup aplikasi");
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.items && parsed.users) {
          if (confirm("Restore akan menimpa semua data saat ini. Lanjutkan?")) {
            resetData(parsed);
            logActivity("Restore Data", "Memulihkan data aplikasi dari file backup");
            alert("Restore berhasil!");
          }
        } else {
          alert("Format file backup tidak valid.");
        }
      } catch (error) {
        alert("Gagal membaca file JSON.");
      }
    };
    reader.readAsText(file);
  };

  const colors = [
    { id: "indigo", name: "Indigo", bgClass: "bg-indigo-600" },
    { id: "emerald", name: "Emerald", bgClass: "bg-emerald-600" },
    { id: "blue", name: "Blue", bgClass: "bg-blue-600" },
    { id: "orange", name: "Orange", bgClass: "bg-orange-600" },
    { id: "rose", name: "Rose", bgClass: "bg-rose-600" },
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
                <p className="text-sm font-medium mb-3">Mode Gelap / Terang</p>
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
                className="w-full mb-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Download className="w-4 h-4 mr-2" /> Backup Data (JSON)
              </Button>

              <div className="relative">
                <Button className="w-full relative bg-slate-900 text-slate-50 hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200">
                  <Upload className="w-4 h-4 mr-2" /> Restore Data
                  <input
                    title="Restore data"
                    type="file"
                    accept="application/json"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleRestore}
                  />
                </Button>
              </div>
              <p className="text-xs text-slate-500 text-center mt-2">
                Simpan data secara berkala untuk menghindari kehilangan log
                stok.
              </p>
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
