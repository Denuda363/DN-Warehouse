import React, { useState } from "react";
import { useAppContext } from "../store/AppContext";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Download,
  FileText,
  FileSpreadsheet,
  Package,
  Image as ImageIcon,
} from "lucide-react";
import { Item, Category, Unit, Supplier, Staff } from "../types";
import { JarvisTransition } from "../components/JarvisTransition";
import { ExportLowStockModal } from "../components/ExportLowStockModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { StockOpname } from "../components/StockOpname";

const generateSkuForCategory = (categoryId: string, categories: Category[], items: Item[]): string => {
  if (!categoryId) return "";
  const category = categories.find(c => c.id === categoryId);
  if (!category) return "";
  
  // Extract a 3-letter uppercase prefix from category name
  const cleanName = category.name.toUpperCase().replace(/[^A-Z0-9]/g, "");
  let prefix = "BRG";
  if (cleanName.length >= 3) {
    prefix = cleanName.substring(0, 3);
  } else if (cleanName.length > 0) {
    prefix = (cleanName + "BRG").substring(0, 3);
  }
  
  // Find maximum suffix number starting with this prefix
  let maxNum = 0;
  const regex = new RegExp(`^${prefix}-(\\d+)$`);
  items.forEach(item => {
    if (item.sku) {
      const match = item.sku.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  });

  const nextNum = maxNum + 1;
  return `${prefix}-${String(nextNum).padStart(4, "0")}`;
};

export const MasterData: React.FC = () => {
  const { data, updateData, currentUser, logActivity } = useAppContext();
  const [activeTab, setActiveTab] = useState<
    "items" | "categories" | "units" | "suppliers" | "staffs" | "low-stock" | "opname"
  >("items");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [modalType, setModalType] = useState<
    null | "items" | "categories" | "units" | "suppliers" | "staffs"
  >(null);
  const [editItemData, setEditItemData] = useState<Partial<Item> | null>(null);
  const [editCategoryData, setEditCategoryData] =
    useState<Partial<Category> | null>(null);
  const [editUnitData, setEditUnitData] = useState<Partial<Unit> | null>(null);
  const [editSupplierData, setEditSupplierData] =
    useState<Partial<Supplier> | null>(null);
  const [editStaffData, setEditStaffData] = useState<Partial<Staff> | null>(
    null,
  );

  const currentUserCategories = currentUser?.allowedCategoryIds || [];
  const hasCategoryRestriction =
    currentUser?.role !== "ADMIN" && currentUserCategories.length > 0;
  const filteredItems = hasCategoryRestriction
    ? data.items.filter((item) =>
        currentUserCategories.includes(item.categoryId),
      )
    : data.items;

  const allTabs = [
    { id: "items", label: "Produk", perm: "MASTER_TAB_ITEMS" },
    { id: "categories", label: "Kategori", perm: "MASTER_TAB_CATEGORIES" },
    { id: "units", label: "Satuan", perm: "MASTER_TAB_UNITS" },
    { id: "suppliers", label: "Supplier", perm: "MASTER_TAB_SUPPLIERS" },
    { id: "staffs", label: "Staff Gudang", perm: "MASTER_TAB_STAFF" },
    { id: "low-stock", label: "Stok Menipis", perm: "MASTER_TAB_LOWSTOCK" },
    { id: "opname", label: "Stock Opname", perm: "MASTER_TAB_OPNAME" },
  ];

  const tabs = allTabs.filter((t) => {
    if (currentUser?.role === "ADMIN") return true;
    return (currentUser?.permissions || []).includes(t.perm);
  });

  // Ensure activeTab is a permitted tab
  React.useEffect(() => {
    if (tabs.length > 0 && !tabs.find((t) => t.id === activeTab)) {
      setActiveTab(tabs[0].id as any);
    }
  }, [tabs, activeTab]);

  const handleDelete = (
    id: string,
    type: "items" | "categories" | "units" | "suppliers" | "staffs",
  ) => {
    if (!confirm("Hapus data ini?")) return;

    if (type === "items") {
      logActivity("Hapus Item", `Menghapus item dengan ID ${id}`);
      updateData({ items: data.items.filter((i) => i.id !== id) });
    } else if (type === "categories") {
      logActivity("Hapus Kategori", `Menghapus kategori dengan ID ${id}`);
      updateData({ categories: data.categories.filter((i) => i.id !== id) });
    } else if (type === "units") {
      logActivity("Hapus Satuan", `Menghapus satuan dengan ID ${id}`);
      updateData({ units: data.units.filter((i) => i.id !== id) });
    } else if (type === "suppliers") {
      logActivity("Hapus Supplier", `Menghapus supplier dengan ID ${id}`);
      updateData({ suppliers: data.suppliers.filter((i) => i.id !== id) });
    } else if (type === "staffs") {
      logActivity("Hapus Staff", `Menghapus staff dengan ID ${id}`);
      updateData({ staffs: data.staffs.filter((i) => i.id !== id) });
    }
  };

  const handleSaveItem = () => {
    if (!editItemData?.name || !editItemData?.sku) return;
    const isNew = !editItemData.id;
    
    // Filter and validate batches
    const validatedBatches = editItemData.batches?.filter((b: any) => b.batchNumber.trim() !== "") || [];
    
    // Sum stock of validated batches
    const totalBatchStock = validatedBatches.reduce((acc: number, b: any) => acc + (Number(b.stock) || 0), 0) || 0;
    
    // Get unbatched stock
    const unbatchedQuantity = Number(editItemData.unbatchedStock !== undefined ? editItemData.unbatchedStock : editItemData.stock) || 0;
    
    // Compute total stock
    const finalTotalStock = unbatchedQuantity + totalBatchStock;

    const payload = {
      ...editItemData,
      id: editItemData.id || `item-${Date.now()}`,
      unbatchedStock: unbatchedQuantity,
      stock: finalTotalStock,
      sellingPrice: Number(editItemData.sellingPrice) || 0,
      batches: validatedBatches.map((b: any) => ({
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate || "",
        stock: Number(b.stock) || 0,
      })),
    } as Item;

    if (isNew) {
      logActivity("Tambah Item", `Menambahkan item baru: ${payload.name} (${payload.sku})`);
      updateData({ items: [payload, ...data.items] });
    } else {
      logActivity("Edit Item", `Memperbarui item: ${payload.name} (${payload.sku})`);
      updateData({
        items: data.items.map((i) => (i.id === payload.id ? payload : i)),
      });
    }
    setModalType(null);
  };

  const handleSaveCategory = () => {
    if (!editCategoryData?.name) return;
    const isNew = !editCategoryData.id;
    const payload = {
      ...editCategoryData,
      id: editCategoryData.id || `cat-${Date.now()}`,
    } as Category;

    if (isNew) {
      logActivity("Tambah Kategori", `Menambahkan kategori baru: ${payload.name}`);
      updateData({ categories: [payload, ...data.categories] });
    } else {
      logActivity("Edit Kategori", `Memperbarui kategori: ${payload.name}`);
      updateData({
        categories: data.categories.map((i) =>
          i.id === payload.id ? payload : i,
        ),
      });
    }
    setModalType(null);
  };

  const handleSaveUnit = () => {
    if (!editUnitData?.name) return;
    const isNew = !editUnitData.id;
    const payload = {
      ...editUnitData,
      id: editUnitData.id || `unit-${Date.now()}`,
    } as Unit;

    if (isNew) {
      logActivity("Tambah Satuan", `Menambahkan satuan baru: ${payload.name}`);
      updateData({ units: [payload, ...data.units] });
    } else {
      logActivity("Edit Satuan", `Memperbarui satuan: ${payload.name}`);
      updateData({
        units: data.units.map((i) => (i.id === payload.id ? payload : i)),
      });
    }
    setModalType(null);
  };

  const handleSaveSupplier = () => {
    if (!editSupplierData?.name) return;
    const isNew = !editSupplierData.id;
    const payload = {
      ...editSupplierData,
      id: editSupplierData.id || `sup-${Date.now()}`,
    } as Supplier;

    if (isNew) {
      logActivity("Tambah Supplier", `Menambahkan supplier baru: ${payload.name}`);
      updateData({ suppliers: [payload, ...data.suppliers] });
    } else {
      logActivity("Edit Supplier", `Memperbarui supplier: ${payload.name}`);
      updateData({
        suppliers: data.suppliers.map((i) =>
          i.id === payload.id ? payload : i,
        ),
      });
    }
    setModalType(null);
  };

  const handleSaveStaff = () => {
    if (!editStaffData?.name) return;
    const isNew = !editStaffData.id;
    const payload = {
      ...editStaffData,
      id: editStaffData.id || `staff-${Date.now()}`,
    } as Staff;

    if (isNew) {
      logActivity("Tambah Staff", `Menambahkan staff baru: ${payload.name}`);
      updateData({ staffs: [payload, ...data.staffs] });
    } else {
      logActivity("Edit Staff", `Memperbarui staff: ${payload.name}`);
      updateData({
        staffs: data.staffs.map((i) => (i.id === payload.id ? payload : i)),
      });
    }
    setModalType(null);
  };

  const openAddModal = () => {
    if (activeTab === "items") {
      setEditItemData({
        unbatchedStock: 0,
        stock: 0,
        batches: []
      });
      setModalType("items");
    }
    if (activeTab === "categories") {
      setEditCategoryData({});
      setModalType("categories");
    }
    if (activeTab === "units") {
      setEditUnitData({});
      setModalType("units");
    }
    if (activeTab === "suppliers") {
      setEditSupplierData({});
      setModalType("suppliers");
    }
    if (activeTab === "staffs") {
      setEditStaffData({});
      setModalType("staffs");
    }
  };

  const openEditModal = (item: any) => {
    if (activeTab === "items") {
      const totalBatchStock = item.batches?.reduce((acc: number, b: any) => acc + (Number(b.stock) || 0), 0) || 0;
      const unbatchedStockVal = item.unbatchedStock !== undefined ? item.unbatchedStock : Math.max(0, (item.stock || 0) - totalBatchStock);
      setEditItemData({
        ...item,
        unbatchedStock: unbatchedStockVal,
        batches: item.batches || []
      });
      setModalType("items");
    }
    if (activeTab === "categories") {
      setEditCategoryData(item);
      setModalType("categories");
    }
    if (activeTab === "units") {
      setEditUnitData(item);
      setModalType("units");
    }
    if (activeTab === "suppliers") {
      setEditSupplierData(item);
      setModalType("suppliers");
    }
    if (activeTab === "staffs") {
      setEditStaffData(item);
      setModalType("staffs");
    }
  };  const lowStockItems = filteredItems.filter(
    (item) => item.stock <= (item.minStock !== undefined ? item.minStock : 0),
  );
  const lowStockBySupplier = lowStockItems.reduce(
    (acc, item) => {
      const key = item.supplierId || "unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, Item[]>,
  );
  const getSupplierName = (id?: string) => {
    if (!id) return "Tanpa Supplier";
    return (
      data.suppliers.find((s) => s.id === id)?.name || "Supplier Tidak Dikenal"
    );
  };

  const downloadTemplate = () => {
    let rows: any[] = [];
    let fileName = "Template.xlsx";
    if (activeTab === "items") {
      if (data.items && data.items.length > 0) {
        rows = data.items.map((item) => {
          const category = data.categories.find((c) => c.id === item.categoryId);
          const unit = data.units.find((u) => u.id === item.unitId);
          const primarySup = data.suppliers.find((s) => s.id === item.supplierId);
          const altSup = data.suppliers.find((s) => s.id === item.altSupplierId);
          return {
            SKU: item.sku || "",
            Nama_Produk: item.name || "",
            Harga_Jual: item.sellingPrice || 0,
            Stok: item.stock || 0,
            Min_Stok: item.minStock || 5,
            Kategori: category ? category.name : "",
            Satuan: unit ? unit.name : "",
            Supplier_Utama: primarySup ? primarySup.name : "",
            Kontak_Supplier_Utama: primarySup ? primarySup.contact : "",
            Supplier_Alternatif: altSup ? altSup.name : "",
            Kontak_Supplier_Alternatif: altSup ? altSup.contact : "",
          };
        });
      } else {
        rows = [
          {
            SKU: "BRG-001",
            Nama_Produk: "Contoh Produk A",
            Harga_Jual: 15000,
            Stok: 100,
            Min_Stok: 10,
            Kategori: "Makanan",
            Satuan: "Pcs",
            Supplier_Utama: "PT Sumber Rejeki",
            Kontak_Supplier_Utama: "08123456789",
            Supplier_Alternatif: "CV Makmur Abadi",
            Kontak_Supplier_Alternatif: "08987654321",
          },
        ];
      }
      fileName = "Template_Produk.xlsx";
    } else if (activeTab === "categories") {
      if (data.categories && data.categories.length > 0) {
        rows = data.categories.map((c) => ({
          Nama_Kategori: c.name,
          Deskripsi: c.description || "",
        }));
      } else {
        rows = [{ Nama_Kategori: "Makanan", Deskripsi: "Kategori untuk makanan ringan" }];
      }
      fileName = "Template_Kategori.xlsx";
    } else if (activeTab === "units") {
      if (data.units && data.units.length > 0) {
        rows = data.units.map((u) => ({
          Nama_Satuan: u.name,
          Deskripsi: u.description || "",
        }));
      } else {
        rows = [{ Nama_Satuan: "Pcs", Deskripsi: "Satuan bijian" }];
      }
      fileName = "Template_Satuan.xlsx";
    } else if (activeTab === "suppliers") {
      if (data.suppliers && data.suppliers.length > 0) {
        rows = data.suppliers.map((s) => ({
          Nama_Supplier: s.name,
          Kontak: s.contact || "",
          Alamat: s.address || "",
        }));
      } else {
        rows = [{ Nama_Supplier: "PT Sumber Rejeki", Kontak: "08123456789", Alamat: "Jl. Merdeka No. 10" }];
      }
      fileName = "Template_Supplier.xlsx";
    } else if (activeTab === "staffs") {
      if (data.staffs && data.staffs.length > 0) {
        rows = data.staffs.map((s) => ({
          Nama_Staff: s.name,
          Telepon: s.phone || "",
        }));
      } else {
        rows = [{ Nama_Staff: "Ahmad", Telepon: "08122334455" }];
      }
      fileName = "Template_Staff.xlsx";
    } else {
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, fileName);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const dataArr = XLSX.utils.sheet_to_json(ws);
      if (dataArr.length === 0) {
        alert("Data kosong!");
        return;
      }

      const newData = { ...data };
      if (activeTab === "items") {
        const newItems = dataArr.map((row: any) => {
          let categoryId = "";
          if (row.Kategori) {
            const catName = row.Kategori.toString().trim();
            let cat = newData.categories.find(
              (c) => c.name.toLowerCase() === catName.toLowerCase(),
            );
            if (!cat) {
              cat = {
                id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: catName,
              };
              newData.categories.push(cat);
            }
            categoryId = cat.id;
          }

          let unitId = "";
          if (row.Satuan) {
            const unitName = row.Satuan.toString().trim();
            let unit = newData.units.find(
              (u) => u.name.toLowerCase() === unitName.toLowerCase(),
            );
            if (!unit) {
              unit = {
                id: `u-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: unitName,
              };
              newData.units.push(unit);
            }
            unitId = unit.id;
          }

          let supplierId = "";
          if (row.Supplier_Utama) {
            const supName = row.Supplier_Utama.toString().trim();
            let sup = newData.suppliers.find(
              (s) => s.name.toLowerCase() === supName.toLowerCase(),
            );
            if (!sup) {
              sup = {
                id: `sup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: supName,
                contact: row.Kontak_Supplier_Utama?.toString().trim() || "",
              };
              newData.suppliers.push(sup);
            }
            supplierId = sup.id;
          }

          let altSupplierId = "";
          if (row.Supplier_Alternatif) {
            const altName = row.Supplier_Alternatif.toString().trim();
            let altSup = newData.suppliers.find(
              (s) => s.name.toLowerCase() === altName.toLowerCase(),
            );
            if (!altSup) {
              altSup = {
                id: `sup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: altName,
                contact:
                  row.Kontak_Supplier_Alternatif?.toString().trim() || "",
              };
              newData.suppliers.push(altSup);
            }
            altSupplierId = altSup.id;
          }

          return {
            id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sku: row.SKU || "",
            name: row.Nama_Produk || row.Nama_Barang || "Unknown",
            sellingPrice: Number(row.Harga_Jual) || 0,
            stock: Number(row.Stok) || 0,
            minStock: row.Min_Stok !== undefined ? Number(row.Min_Stok) : 5,
            categoryId,
            unitId,
            supplierId,
            altSupplierId,
          };
        });
        newData.items = [...newData.items, ...newItems];
      } else if (activeTab === "categories") {
        const newCats = dataArr.map((row: any) => ({
          id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: row.Nama_Kategori || "Unknown",
          description: row.Deskripsi || "",
        }));
        newData.categories = [...newData.categories, ...newCats];
      } else if (activeTab === "units") {
        const newUnits = dataArr.map((row: any) => ({
          id: `u-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: row.Nama_Satuan || "Unknown",
          description: row.Deskripsi || "",
        }));
        newData.units = [...newData.units, ...newUnits];
      } else if (activeTab === "suppliers") {
        const newSups = dataArr.map((row: any) => ({
          id: `sup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: row.Nama_Supplier || "Unknown",
          contact: row.Kontak || "",
          address: row.Alamat || "",
        }));
        newData.suppliers = [...newData.suppliers, ...newSups];
      } else if (activeTab === "staffs") {
        const newStaffs = dataArr.map((row: any) => ({
          id: `staff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: row.Nama_Staff || "Unknown",
          phone: row.Telepon || "",
        }));
        newData.staffs = [...newData.staffs, ...newStaffs];
      }
      updateData(newData);
      alert("Import berhasil!");
      if (e.target) e.target.value = ""; // reset file input
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-120px)] relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Master Data</h1>
          <p className="text-slate-500 text-sm">
            Kelola data referensi aplikasi Anda.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {activeTab === "low-stock" ? (
            <Button
              onClick={() => setIsExportModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Ekspor Data
            </Button>
          ) : (
            <>
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="text-slate-600 dark:text-slate-300 w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" /> Template Excel
              </Button>
              <div className="relative w-full sm:w-auto flex">
                <Button
                  variant="outline"
                  className="text-slate-600 dark:text-slate-300 relative border-emerald-600 text-emerald-600 hover:bg-emerald-50 w-full sm:w-auto flex-1"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Import Excel
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    title="Import Excel"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleImport}
                  />
                </Button>
              </div>
              <Button
                onClick={openAddModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1 sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" /> Tambah Data
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b dark:border-slate-800 overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <JarvisTransition pageKey={activeTab} mode="tab">
        {activeTab === "opname" ? (
          <StockOpname />
        ) : (
          <Card className="flex-1 flex flex-col overflow-hidden w-full">
            <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center w-full">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                placeholder="Cari data..."
                className="pl-9 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 border-b dark:border-slate-800">
              {activeTab === "items" && (
                <tr>
                  <th className="px-6 py-4 font-medium">SKU</th>
                  <th className="px-6 py-4 font-medium">Nama Produk</th>
                  <th className="px-6 py-4 font-medium">Kategori</th>
                  <th className="px-6 py-4 font-medium">Satuan Utama</th>
                  <th className="px-6 py-4 font-medium">Supplier</th>
                  <th className="px-6 py-4 font-medium">Alt. Supplier</th>
                  <th className="px-6 py-4 font-medium text-right text-indigo-700 dark:text-indigo-400 font-semibold">Stok (Satuan)</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              )}
              {activeTab === "categories" && (
                <tr>
                  <th className="px-6 py-4 font-medium w-32">ID</th>
                  <th className="px-6 py-4 font-medium">Nama Kategori</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              )}
              {activeTab === "units" && (
                <tr>
                  <th className="px-6 py-4 font-medium w-32">ID</th>
                  <th className="px-6 py-4 font-medium">Nama Satuan</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              )}
              {activeTab === "suppliers" && (
                <tr>
                  <th className="px-6 py-4 font-medium w-32">ID</th>
                  <th className="px-6 py-4 font-medium">Nama Supplier</th>
                  <th className="px-6 py-4 font-medium">Kontak</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              )}
              {activeTab === "staffs" && (
                <tr>
                  <th className="px-6 py-4 font-medium w-32">ID</th>
                  <th className="px-6 py-4 font-medium">Nama Staff Gudang</th>
                  <th className="px-6 py-4 font-medium">Telepon</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              )}
              {activeTab === "low-stock" && (
                <tr>
                  <th className="px-6 py-4 font-medium">Supplier Utama</th>
                  <th className="px-6 py-4 font-medium">SKU</th>
                  <th className="px-6 py-4 font-medium">Nama Produk</th>
                  <th className="px-6 py-4 font-medium text-center">
                    Stok Saat Ini
                  </th>
                  <th className="px-6 py-4 font-medium text-center">
                    Min. Stok
                  </th>
                  <th className="px-6 py-4 font-medium">Supplier Alternatif</th>
                </tr>
              )}

            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {activeTab === "items" &&
                filteredItems
                  .filter((i) =>
                    i.name.toLowerCase().includes(searchTerm.toLowerCase()),
                  )
                  .map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    >
                      <td className="px-6 py-3 font-mono text-xs">
                        {item.sku}
                      </td>
                      <td className="px-6 py-3 font-medium">
                        <div className="flex gap-3 items-center">
                          {item.imageUrl ? (
                            <div className="w-10 h-10 shrink-0 rounded bg-slate-100 overflow-hidden border border-slate-200 dark:border-slate-800">
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 shrink-0 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400">
                              <Package className="w-5 h-5 opacity-50" />
                            </div>
                          )}
                          <div>
                            <div>{item.name}</div>
                            <div className="text-[10px] text-slate-500 mt-1 flex flex-col gap-0.5">
                              {item.batchNumber && (
                                <span>
                                  Batch Utama: {item.batchNumber} (Exp:{" "}
                                  {item.expiryDate || "-"}) (Stok: {item.unbatchedStock !== undefined ? item.unbatchedStock : item.stock})
                                </span>
                              )}
                              {item.batches &&
                                item.batches.length > 0 &&
                                item.batches.map((b, idx) => (
                                  <span key={idx} className="text-slate-650 dark:text-slate-400">
                                    Batch: <strong className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">{b.batchNumber}</strong> (Exp: {b.expiryDate || "-"}) (Stok: <strong className="font-bold text-slate-700 dark:text-slate-200">{b.stock ?? 0}</strong>)
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {
                          data.categories.find((c) => c.id === item.categoryId)
                            ?.name
                        }
                      </td>
                      <td className="px-6 py-3">
                        {data.units.find((c) => c.id === item.unitId)?.name}
                        {item.alternateUnits &&
                          item.alternateUnits.length > 0 && (
                            <div className="text-[10px] text-slate-500 mt-1">
                              + {item.alternateUnits.length} Satuan Alternatif
                            </div>
                          )}
                      </td>
                      <td className="px-6 py-3">
                        {item.supplierId
                          ? data.suppliers.find((s) => s.id === item.supplierId)
                              ?.name || "-"
                          : "-"}
                      </td>
                      <td className="px-6 py-3">
                        {item.altSupplierId
                          ? data.suppliers.find(
                              (s) => s.id === item.altSupplierId,
                            )?.name || "-"
                          : "-"}
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-slate-900 dark:text-white">
                        {item.stock} {data.units.find((u) => u.id === item.unitId)?.name || ""}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Button
                          onClick={() => openEditModal(item)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-indigo-600"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(item.id, "items")}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
              {activeTab === "categories" &&
                data.categories
                  .filter((i) =>
                    i.name.toLowerCase().includes(searchTerm.toLowerCase()),
                  )
                  .map((cat) => (
                    <tr
                      key={cat.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    >
                      <td className="px-6 py-3 font-mono text-xs text-slate-500">
                        {cat.id}
                      </td>
                      <td className="px-6 py-3 font-medium">{cat.name}</td>
                      <td className="px-6 py-3 text-right">
                        <Button
                          onClick={() => openEditModal(cat)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-indigo-600"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(cat.id, "categories")}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
              {activeTab === "units" &&
                data.units
                  .filter((i) =>
                    i.name.toLowerCase().includes(searchTerm.toLowerCase()),
                  )
                  .map((unit) => (
                    <tr
                      key={unit.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    >
                      <td className="px-6 py-3 font-mono text-xs text-slate-500">
                        {unit.id}
                      </td>
                      <td className="px-6 py-3 font-medium">{unit.name}</td>
                      <td className="px-6 py-3 text-right">
                        <Button
                          onClick={() => openEditModal(unit)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-indigo-600"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(unit.id, "units")}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
              {activeTab === "suppliers" &&
                data.suppliers
                  .filter((i) =>
                    i.name.toLowerCase().includes(searchTerm.toLowerCase()),
                  )
                  .map((sup) => (
                    <tr
                      key={sup.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    >
                      <td className="px-6 py-3 font-mono text-xs text-slate-500">
                        {sup.id}
                      </td>
                      <td className="px-6 py-3 font-medium">{sup.name}</td>
                      <td className="px-6 py-3">{sup.contact}</td>
                      <td className="px-6 py-3 text-right">
                        <Button
                          onClick={() => openEditModal(sup)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-indigo-600"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(sup.id, "suppliers")}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
              {activeTab === "staffs" &&
                (data.staffs || [])
                  .filter((i) =>
                    i.name.toLowerCase().includes(searchTerm.toLowerCase()),
                  )
                  .map((st) => (
                    <tr
                      key={st.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    >
                      <td className="px-6 py-3 font-mono text-xs text-slate-500">
                        {st.id}
                      </td>
                      <td className="px-6 py-3 font-medium">{st.name}</td>
                      <td className="px-6 py-3">{st.phone}</td>
                      <td className="px-6 py-3 text-right">
                        <Button
                          onClick={() => openEditModal(st)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-indigo-600"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(st.id, "staffs")}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
              {activeTab === "low-stock" &&
                Object.keys(lowStockBySupplier).map((supplierId) => {
                  const supplierName = getSupplierName(supplierId).toLowerCase();
                  const items = lowStockBySupplier[supplierId].filter(
                    (i) =>
                      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (i.sku &&
                        i.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      supplierName.includes(searchTerm.toLowerCase()),
                  );

                  if (items.length === 0) return null;

                  return items.map((item, idx) => (
                    <tr
                      key={`${supplierId}-${item.id}`}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    >
                      {idx === 0 && (
                        <td
                          className="px-6 py-3 font-bold text-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/20 dark:text-indigo-300 align-top border-b-0"
                          rowSpan={items.length}
                        >
                          {getSupplierName(supplierId)}
                        </td>
                      )}
                      <td className="px-6 py-3 font-mono text-xs text-slate-500">
                        {item.sku || "-"}
                      </td>
                      <td className="px-6 py-3 font-medium">{item.name}</td>
                      <td className="px-6 py-3 text-center font-bold text-rose-600 dark:text-rose-400">
                        {item.stock}{" "}
                        {data.units.find((u) => u.id === item.unitId)?.name}
                      </td>
                      <td className="px-6 py-3 text-center text-slate-500 font-medium">
                        {item.minStock !== undefined ? item.minStock : 5}
                      </td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                        {getSupplierName(item.altSupplierId)}
                      </td>
                    </tr>
                  ));
                })}
              {activeTab === "low-stock" &&
                Object.keys(lowStockBySupplier).length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-slate-500 italic"
                    >
                      Semua stok dalam keadaan aman.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </Card>
      )}
      </JarvisTransition>

      {/* MODALS */}
      {modalType === "categories" && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-4">
              {editCategoryData?.id ? "Edit" : "Tambah"} Kategori
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1">
                Nama Kategori
              </label>
              <Input
                value={editCategoryData?.name || ""}
                onChange={(e) =>
                  setEditCategoryData({
                    ...editCategoryData,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModalType(null)}>
                Batal
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleSaveCategory}
              >
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}

      {modalType === "units" && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-4">
              {editUnitData?.id ? "Edit" : "Tambah"} Satuan
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1">
                Nama Satuan
              </label>
              <Input
                value={editUnitData?.name || ""}
                onChange={(e) =>
                  setEditUnitData({ ...editUnitData, name: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModalType(null)}>
                Batal
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleSaveUnit}
              >
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}

      {modalType === "suppliers" && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-4">
              {editSupplierData?.id ? "Edit" : "Tambah"} Supplier
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1">
                Nama Supplier
              </label>
              <Input
                value={editSupplierData?.name || ""}
                onChange={(e) =>
                  setEditSupplierData({
                    ...editSupplierData,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1">Kontak</label>
              <Input
                value={editSupplierData?.contact || ""}
                onChange={(e) =>
                  setEditSupplierData({
                    ...editSupplierData,
                    contact: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModalType(null)}>
                Batal
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleSaveSupplier}
              >
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}

      {modalType === "staffs" && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-4">
              {editStaffData?.id ? "Edit" : "Tambah"} Staff Gudang
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1">
                Nama Staff Gudang
              </label>
              <Input
                value={editStaffData?.name || ""}
                onChange={(e) =>
                  setEditStaffData({
                    ...editStaffData,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1">Telepon</label>
              <Input
                value={editStaffData?.phone || ""}
                onChange={(e) =>
                  setEditStaffData({
                    ...editStaffData,
                    phone: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModalType(null)}>
                Batal
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleSaveStaff}
              >
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}

      {modalType === "items" && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 py-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-4xl shadow-xl flex flex-col max-h-full">
            <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold">
                {editItemData?.id ? "Edit" : "Tambah"} Produk
              </h3>
              <button onClick={() => setModalType(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6 flex gap-6 items-center">
                <div className="w-24 h-24 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                  {editItemData?.imageUrl ? (
                    <img src={editItemData.imageUrl} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-slate-500">No Image</span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Upload Gambar Produk</label>
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditItemData({ ...editItemData, imageUrl: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                    className="max-w-xs cursor-pointer"
                  />
                  <p className="text-xs text-slate-500 mt-1">Format gambar: JPG, PNG. Maks 2MB di sarankan.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-bold mb-1">
                    SKU / Kode Produk <span className="text-indigo-600 dark:text-indigo-400 font-semibold">(Otomatis/Unik)</span>
                  </label>
                  <Input
                    value={editItemData?.sku || ""}
                    onChange={(e) =>
                      setEditItemData({ ...editItemData, sku: e.target.value })
                    }
                    placeholder="Pilih kategori untuk otomatisasi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">
                    Nama Produk
                  </label>
                  <Input
                    value={editItemData?.name || ""}
                    onChange={(e) =>
                      setEditItemData({ ...editItemData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">
                    Kategori
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                    value={editItemData?.categoryId || ""}
                    onChange={(e) => {
                      const catId = e.target.value;
                      const isNew = !editItemData?.id;
                      const computedSku = isNew || !editItemData?.sku
                        ? generateSkuForCategory(catId, data.categories, data.items)
                        : (editItemData?.sku || "");
                      
                      setEditItemData({
                        ...editItemData,
                        categoryId: catId,
                        sku: computedSku,
                      });
                    }}
                  >
                    <option value="">Pilih Kategori</option>
                    {data.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">
                    Satuan Utama
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                    value={editItemData?.unitId || ""}
                    onChange={(e) =>
                      setEditItemData({
                        ...editItemData,
                        unitId: e.target.value,
                      })
                    }
                  >
                    <option value="">Pilih Satuan</option>
                    {data.units.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1 text-slate-700 dark:text-stone-300">
                      Stok Tanpa Batch / Umum
                    </label>
                    <Input
                      type="number"
                      value={editItemData?.unbatchedStock !== undefined ? editItemData.unbatchedStock : ""}
                      onChange={(e) =>
                        setEditItemData({
                          ...editItemData,
                          unbatchedStock: Number(e.target.value),
                        })
                      }
                      placeholder="Stok umum"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1 text-indigo-700 dark:text-indigo-400">
                      Total Stok (Gabungan)
                    </label>
                    <div className="h-10 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-350 font-mono font-black rounded-lg border border-indigo-200/50 dark:border-indigo-900/40 flex items-center justify-center">
                      {(Number(editItemData?.unbatchedStock !== undefined ? editItemData.unbatchedStock : 0) || 0) + 
                       (editItemData?.batches?.reduce((acc: number, b: any) => acc + (Number(b.stock) || 0), 0) || 0)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1/2">
                      Min. Stok
                    </label>
                    <Input
                      type="number"
                      value={editItemData?.minStock !== undefined ? editItemData.minStock : ""}
                      onChange={(e) =>
                        setEditItemData({
                          ...editItemData,
                          minStock: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 pt-4 border-t dark:border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-sm">
                      Info Batch & Kadaluwarsa
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const bt = editItemData?.batches
                          ? [...editItemData.batches]
                          : [];
                        bt.push({ batchNumber: "", expiryDate: "", stock: 0 });
                        setEditItemData({ ...editItemData, batches: bt });
                      }}
                    >
                      + Tambah Batch
                    </Button>
                  </div>

                  <div className="mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded">
                    <h5 className="text-xs font-bold mb-2 text-slate-500">
                      Batch Utama
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold mb-1">
                          Nomor Batch
                        </label>
                        <Input
                          value={editItemData?.batchNumber || ""}
                          onChange={(e) =>
                            setEditItemData({
                              ...editItemData,
                              batchNumber: e.target.value,
                            })
                          }
                          placeholder="OPSIONAL"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold mb-1">
                          Tanggal Expired
                        </label>
                        <Input
                          type="date"
                          value={editItemData?.expiryDate || ""}
                          onChange={(e) =>
                            setEditItemData({
                              ...editItemData,
                              expiryDate: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {editItemData?.batches?.map((b, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 items-center mb-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded"
                    >
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold mb-1">
                          Nomor Batch
                        </label>
                        <Input
                          value={b.batchNumber}
                          placeholder="Batch #"
                          onChange={(e) => {
                            const newer = [...editItemData.batches!];
                            newer[idx].batchNumber = e.target.value;
                            setEditItemData({
                              ...editItemData,
                              batches: newer,
                            });
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold mb-1">
                          Tanggal Expired
                        </label>
                        <Input
                          type="date"
                          value={b.expiryDate}
                          onChange={(e) => {
                            const newer = [...editItemData.batches!];
                            newer[idx].expiryDate = e.target.value;
                            setEditItemData({
                              ...editItemData,
                              batches: newer,
                            });
                          }}
                        />
                      </div>
                      <div className="w-24">
                        <label className="block text-[11px] font-bold mb-1 text-indigo-600 dark:text-indigo-400">
                          Stok Batch
                        </label>
                        <Input
                          type="number"
                          value={b.stock !== undefined ? b.stock : ""}
                          onChange={(e) => {
                            const newer = [...editItemData.batches!];
                            newer[idx].stock = Number(e.target.value);
                            setEditItemData({
                              ...editItemData,
                              batches: newer,
                            });
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div className="pt-5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newer = [...editItemData.batches!];
                            newer.splice(idx, 1);
                            setEditItemData({
                              ...editItemData,
                              batches: newer,
                            });
                          }}
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="col-span-1 md:col-span-2 pt-4 border-t dark:border-slate-800">
                  <h4 className="font-bold text-sm mb-3">Supplier</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-1">
                        Supplier Utama
                      </label>
                      <select
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        value={editItemData?.supplierId || ""}
                        onChange={(e) =>
                          setEditItemData({
                            ...editItemData,
                            supplierId: e.target.value,
                          })
                        }
                      >
                        <option value="">Pilih Supplier Utama</option>
                        {data.suppliers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">
                        Supplier Alternatif
                      </label>
                      <select
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        value={editItemData?.altSupplierId || ""}
                        onChange={(e) =>
                          setEditItemData({
                            ...editItemData,
                            altSupplierId: e.target.value,
                          })
                        }
                      >
                        <option value="">Pilih Supplier Alternatif</option>
                        {data.suppliers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 pt-4 border-t dark:border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-sm">Satuan Alternatif</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const au = editItemData?.alternateUnits
                          ? [...editItemData.alternateUnits]
                          : [];
                        au.push({ unitId: "", conversionRate: 1 });
                        setEditItemData({
                          ...editItemData,
                          alternateUnits: au,
                        });
                      }}
                    >
                      + Tambah Satuan Alternatif
                    </Button>
                  </div>
                  {editItemData?.alternateUnits?.map((au, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 items-center mb-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded"
                    >
                      <select
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        value={au.unitId}
                        onChange={(e) => {
                          const newer = [...editItemData.alternateUnits!];
                          newer[idx].unitId = e.target.value;
                          setEditItemData({
                            ...editItemData,
                            alternateUnits: newer,
                          });
                        }}
                      >
                        <option value="">Pilih Satuan</option>
                        {data.units.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <span className="text-sm font-bold text-slate-500">
                        =
                      </span>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Nilai Konversi (thd Satuan Utama)"
                        value={au.conversionRate}
                        onChange={(e) => {
                          const newer = [...editItemData.alternateUnits!];
                          newer[idx].conversionRate = Number(e.target.value);
                          setEditItemData({
                            ...editItemData,
                            alternateUnits: newer,
                          });
                        }}
                      />
                      <span className="text-sm whitespace-nowrap text-slate-500 line-clamp-1 flex-1">
                        {data.units.find((u) => u.id === editItemData.unitId)
                          ?.name || "Satuan Utama"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newer = [...editItemData.alternateUnits!];
                          newer.splice(idx, 1);
                          setEditItemData({
                            ...editItemData,
                            alternateUnits: newer,
                          });
                        }}
                        className="text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {(!editItemData?.alternateUnits ||
                    editItemData?.alternateUnits.length === 0) && (
                    <p className="text-sm text-slate-500 italic">
                      Belum ada satuan alternatif dikonfigurasi.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t dark:border-slate-800 flex justify-end gap-2 shrink-0 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
              <Button variant="ghost" onClick={() => setModalType(null)}>
                Batal
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleSaveItem}
              >
                Simpan Produk
              </Button>
            </div>
          </div>
        </div>
      )}
      <ExportLowStockModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        lowStockItems={lowStockItems}
        data={data}
      />
    </div>
  );
};
