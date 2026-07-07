import React, { useState } from "react";
import { useAppContext } from "../store/AppContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { User, Role } from "../types";
import { Edit, Trash2, Plus, Save, X, Eye, EyeOff } from "lucide-react";

export const UsersManagement: React.FC = () => {
  const { data, updateData, currentUser, logActivity } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const AVAILABLE_PERMISSIONS = [
    { id: "VIEW_DASHBOARD", label: "Menu: Dashboard" },
    { id: "ACCESS_POS", label: "Menu: Kasir (POS)" },
    { id: "ACCESS_PURCHASE", label: "Menu: Faktur Masuk" },
    { id: "VIEW_REPORTS", label: "Menu: Arus Stok" },
    { id: "MANAGE_MASTER", label: "Menu: Master Data (Utama)" },
    { id: "MASTER_TAB_ITEMS", label: "Tab: Barang / Stok" },
    { id: "MASTER_TAB_CATEGORIES", label: "Tab: Kategori" },
    { id: "MASTER_TAB_UNITS", label: "Tab: Satuan" },
    { id: "MASTER_TAB_SUPPLIERS", label: "Tab: Supplier" },
    { id: "MASTER_TAB_STAFF", label: "Tab: Staff Gudang" },
    { id: "MASTER_TAB_LOWSTOCK", label: "Tab: Stok Menipis" },
    { id: "MANAGE_USERS", label: "Menu: Pengaturan" },
    { id: "SETTING_TAB_THEME", label: "Tab: Tampilan Tema" },
    { id: "SETTING_TAB_BACKUP", label: "Tab: Backup & Restore" },
    { id: "SETTING_TAB_PROFILE", label: "Tab: Profil Gudang" },
    { id: "SETTING_TAB_USERS", label: "Tab: Manajemen Pengguna" },
    { id: "SETTING_TAB_LOGS", label: "Tab: Log Aktivitas" },
  ];

  const handleEdit = (user: User) => {
    setFormData(user);
    setIsEditing(true);
  };

  const handeAddNew = () => {
    setFormData({
      id: `user-${Date.now()}`,
      username: "",
      password: "",
      role: "STAFF",
      permissions: [],
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!formData.username || !formData.role) return;

    const existing = data.users.find((u) => u.id === formData.id);
    let newUsers;
    if (existing) {
      newUsers = data.users.map((u) =>
        u.id === formData.id ? ({ ...u, ...formData } as User) : u,
      );
      logActivity("Edit Pengguna", `Memperbarui hak akses/data pengguna: ${formData.username}`);
    } else {
      newUsers = [...data.users, formData as User];
      logActivity("Tambah Pengguna", `Menambahkan pengguna baru: ${formData.username}`);
    }

    updateData({ users: newUsers });
    setIsEditing(false);
  };

  const handleDelete = (id: string) => {
    if (id === currentUser?.id) {
      alert("Anda tidak bisa menghapus akun Anda sendiri.");
      return;
    }
    if (confirm("Hapus pengguna ini?")) {
      const userToDelete = data.users.find(u => u.id === id);
      logActivity("Hapus Pengguna", `Menghapus pengguna: ${userToDelete?.username}`);
      updateData({ users: data.users.filter((u) => u.id !== id) });
    }
  };

  const togglePermission = (permId: string) => {
    const currentPerms = formData.permissions || [];
    let newPerms;
    if (currentPerms.includes(permId)) {
      newPerms = currentPerms.filter((p) => p !== permId);
    } else {
      newPerms = [...currentPerms, permId];
    }
    setFormData({ ...formData, permissions: newPerms });
  };

  const toggleCategory = (catId: string) => {
    const currentCats = formData.allowedCategoryIds || [];
    let newCats;
    if (currentCats.includes(catId)) {
      newCats = currentCats.filter((c) => c !== catId);
    } else {
      newCats = [...currentCats, catId];
    }
    setFormData({ ...formData, allowedCategoryIds: newCats });
  };

  return (
    <Card className="md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manajemen Pengguna & Hak Akses</CardTitle>
        {!isEditing && (
          <Button
            onClick={handeAddNew}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Tambah Pengguna
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50 mb-4 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold mb-4 flex items-center justify-between text-slate-800 dark:text-slate-100">
              {data.users.find((u) => u.id === formData.id)
                ? "Edit Pengguna"
                : "Tambah Pengguna Baru"}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                <X className="w-4 h-4 mr-1" /> Batal
              </Button>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b dark:border-slate-800 pb-4 mb-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Username
                </label>
                <Input
                  value={formData.username || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="Username"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Password
                </label>
                <Input
                  type="password"
                  value={formData.password || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Isi untuk mengubah password"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Role
                </label>
                <select
                  value={formData.role || "STAFF"}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as Role })
                  }
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="STAFF">STAFF</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Hak Akses (Permissions)
              </label>
              <div className="space-y-2">
                {AVAILABLE_PERMISSIONS.map((perm) => (
                  <label
                    key={perm.id}
                    className="flex items-center space-x-3 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      title={perm.label}
                      checked={(formData.permissions || []).includes(perm.id)}
                      onChange={() => togglePermission(perm.id)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 accent-indigo-600"
                    />
                    <span className="text-sm font-medium">{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Hak Akses Kategori (Kosongkan jika bisa akses semua)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {data.categories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center space-x-3 p-2 rounded border dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      title={cat.name}
                      checked={(formData.allowedCategoryIds || []).includes(
                        cat.id,
                      )}
                      onChange={() => toggleCategory(cat.id)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 accent-indigo-600"
                    />
                    <span className="text-sm font-medium">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" /> Simpan Pengguna
              </Button>
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border rounded-lg overflow-hidden dark:border-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Password</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Hak Akses</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {data.users.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
                >
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>{visiblePasswords[u.id] ? (u.password || "Tidak ada password") : "••••••••"}</span>
                      {u.password && (
                        <button
                          onClick={() => togglePasswordVisibility(u.id)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                          title={visiblePasswords[u.id] ? "Sembunyikan password" : "Lihat password"}
                        >
                          {visiblePasswords[u.id] ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs font-bold font-mono">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {(u.permissions || []).length} akses aktif
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(u)}
                      className="text-slate-500 hover:text-indigo-600 h-8 w-8 px-0 mr-1"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(u.id)}
                      className="text-slate-500 hover:text-red-600 h-8 w-8 px-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
