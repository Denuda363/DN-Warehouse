import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, Plus, Edit, Trash2, X, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Item, Category, Unit, Supplier } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const MasterData: React.FC = () => {
  const { data, updateData } = useAppContext();
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'units' | 'suppliers' | 'low-stock'>('items');
  const [searchTerm, setSearchTerm] = useState('');

  const [modalType, setModalType] = useState<null | 'items' | 'categories' | 'units' | 'suppliers'>(null);
  const [editItemData, setEditItemData] = useState<Partial<Item> | null>(null);
  const [editCategoryData, setEditCategoryData] = useState<Partial<Category> | null>(null);
  const [editUnitData, setEditUnitData] = useState<Partial<Unit> | null>(null);
  const [editSupplierData, setEditSupplierData] = useState<Partial<Supplier> | null>(null);

  const tabs = [
    { id: 'items', label: 'Barang / Stok' },
    { id: 'categories', label: 'Kategori' },
    { id: 'units', label: 'Satuan' },
    { id: 'suppliers', label: 'Supplier' },
    { id: 'low-stock', label: 'Stok Menipis' },
  ];

  const handleDelete = (id: string, type: 'items' | 'categories' | 'units' | 'suppliers') => {
    if (!confirm('Hapus data ini?')) return;
    
    if (type === 'items') {
      updateData({ items: data.items.filter(i => i.id !== id) });
    } else if (type === 'categories') {
      updateData({ categories: data.categories.filter(i => i.id !== id) });
    } else if (type === 'units') {
      updateData({ units: data.units.filter(i => i.id !== id) });
    } else if (type === 'suppliers') {
      updateData({ suppliers: data.suppliers.filter(i => i.id !== id) });
    }
  };

  const handleSaveItem = () => {
    if (!editItemData?.name || !editItemData?.sku) return;
    const isNew = !editItemData.id;
    const payload = {
      ...editItemData,
      id: editItemData.id || `item-${Date.now()}`,
      stock: Number(editItemData.stock) || 0,
      minStock: Number(editItemData.minStock) || 0,
      sellingPrice: Number(editItemData.sellingPrice) || 0
    } as Item;

    if (isNew) {
      updateData({ items: [payload, ...data.items] });
    } else {
      updateData({ items: data.items.map(i => i.id === payload.id ? payload : i) });
    }
    setModalType(null);
  };

  const handleSaveCategory = () => {
    if (!editCategoryData?.name) return;
    const isNew = !editCategoryData.id;
    const payload = {
      ...editCategoryData,
      id: editCategoryData.id || `cat-${Date.now()}`
    } as Category;

    if (isNew) {
      updateData({ categories: [payload, ...data.categories] });
    } else {
      updateData({ categories: data.categories.map(i => i.id === payload.id ? payload : i) });
    }
    setModalType(null);
  };

  const handleSaveUnit = () => {
    if (!editUnitData?.name) return;
    const isNew = !editUnitData.id;
    const payload = {
      ...editUnitData,
      id: editUnitData.id || `unit-${Date.now()}`
    } as Unit;

    if (isNew) {
      updateData({ units: [payload, ...data.units] });
    } else {
      updateData({ units: data.units.map(i => i.id === payload.id ? payload : i) });
    }
    setModalType(null);
  };

  const handleSaveSupplier = () => {
    if (!editSupplierData?.name) return;
    const isNew = !editSupplierData.id;
    const payload = {
      ...editSupplierData,
      id: editSupplierData.id || `sup-${Date.now()}`
    } as Supplier;

    if (isNew) {
      updateData({ suppliers: [payload, ...data.suppliers] });
    } else {
      updateData({ suppliers: data.suppliers.map(i => i.id === payload.id ? payload : i) });
    }
    setModalType(null);
  };

  const openAddModal = () => {
    if (activeTab === 'items') { setEditItemData({}); setModalType('items'); }
    if (activeTab === 'categories') { setEditCategoryData({}); setModalType('categories'); }
    if (activeTab === 'units') { setEditUnitData({}); setModalType('units'); }
    if (activeTab === 'suppliers') { setEditSupplierData({}); setModalType('suppliers'); }
  };

  const openEditModal = (item: any) => {
    if (activeTab === 'items') { setEditItemData(item); setModalType('items'); }
    if (activeTab === 'categories') { setEditCategoryData(item); setModalType('categories'); }
    if (activeTab === 'units') { setEditUnitData(item); setModalType('units'); }
    if (activeTab === 'suppliers') { setEditSupplierData(item); setModalType('suppliers'); }
  };

  const lowStockItems = data.items.filter(item => item.stock <= item.minStock);
  const lowStockBySupplier = lowStockItems.reduce((acc, item) => {
    const key = item.supplierId || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, Item[]>);

  const getSupplierName = (id?: string) => {
    if (!id) return 'Tanpa Supplier';
    return data.suppliers.find(s => s.id === id)?.name || 'Supplier Tidak Dikenal';
  };

  const exportLowStockPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Laporan Stok Menipis', 14, 20);
    
    let yPos = 30;
    
    Object.keys(lowStockBySupplier).forEach(supplierId => {
      const supplierName = getSupplierName(supplierId);
      const items = lowStockBySupplier[supplierId];
      
      doc.setFontSize(12);
      doc.text(`Supplier: ${supplierName}`, 14, yPos);
      yPos += 5;
      
      const head = [['SKU', 'Nama Barang', 'Stok', 'Min. Stok', 'Satuan', 'Supplier Alternatif']];
      const body = items.map(item => [
        item.sku,
        item.name,
        item.stock.toString(),
        item.minStock.toString(),
        data.units.find(u => u.id === item.unitId)?.name || '-',
        getSupplierName(item.altSupplierId)
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head,
        body,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        margin: { top: 10 }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
    });
    
    doc.save('Laporan_Stok_Menipis.pdf');
  };

  const exportLowStockExcel = () => {
    const rows: any[] = [];
    Object.keys(lowStockBySupplier).forEach(supplierId => {
      const supplierName = getSupplierName(supplierId);
      const items = lowStockBySupplier[supplierId];
      items.forEach(item => {
        rows.push({
          'Supplier Utama': supplierName,
          'SKU': item.sku,
          'Nama Barang': item.name,
          'Stok Saat Ini': item.stock,
          'Minimum Stok': item.minStock,
          'Satuan': data.units.find(u => u.id === item.unitId)?.name || '-',
          'Supplier Alternatif': getSupplierName(item.altSupplierId)
        });
      });
    });
    
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stok Menipis');
    XLSX.writeFile(workbook, 'Laporan_Stok_Menipis.xlsx');
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-120px)] relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Data</h1>
          <p className="text-slate-500 text-sm">Kelola data referensi aplikasi Anda.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'low-stock' ? (
            <>
              <Button onClick={exportLowStockExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border border-emerald-700">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
              <Button onClick={exportLowStockPDF} className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm border border-rose-700">
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </>
          ) : (
            <Button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Data
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b dark:border-slate-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari data..." 
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 sticky top-0 border-b dark:border-slate-800">
              {activeTab === 'items' && (
                <tr>
                  <th className="px-6 py-4 font-medium">SKU</th>
                  <th className="px-6 py-4 font-medium">Nama Barang</th>
                  <th className="px-6 py-4 font-medium">Kategori</th>
                  <th className="px-6 py-4 font-medium">Satuan Utama</th>
                  <th className="px-6 py-4 font-medium text-right">Harga</th>
                  <th className="px-6 py-4 font-medium text-right">Stok</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              )}
              {activeTab === 'categories' && (
                <tr>
                  <th className="px-6 py-4 font-medium w-32">ID</th>
                  <th className="px-6 py-4 font-medium">Nama Kategori</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              )}
              {activeTab === 'units' && (
                <tr>
                  <th className="px-6 py-4 font-medium w-32">ID</th>
                  <th className="px-6 py-4 font-medium">Nama Satuan</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              )}
              {activeTab === 'suppliers' && (
                <tr>
                  <th className="px-6 py-4 font-medium w-32">ID</th>
                  <th className="px-6 py-4 font-medium">Nama Supplier</th>
                  <th className="px-6 py-4 font-medium">Kontak</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              )}
              {activeTab === 'low-stock' && (
                <tr>
                  <th className="px-6 py-4 font-medium">Supplier Utama</th>
                  <th className="px-6 py-4 font-medium">SKU</th>
                  <th className="px-6 py-4 font-medium">Nama Barang</th>
                  <th className="px-6 py-4 font-medium text-center">Stok Saat Ini</th>
                  <th className="px-6 py-4 font-medium text-center">Min. Stok</th>
                  <th className="px-6 py-4 font-medium">Supplier Alternatif</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {activeTab === 'items' && data.items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="px-6 py-3 font-mono text-xs">{item.sku}</td>
                  <td className="px-6 py-3 font-medium">
                    <div>{item.name}</div>
                    <div className="text-[10px] text-slate-500 mt-1 flex flex-col gap-0.5">
                      {item.batchNumber && <span>Batch Utama: {item.batchNumber} (Exp: {item.expiryDate})</span>}
                      {item.batches && item.batches.length > 0 && item.batches.map((b, idx) => (
                         <span key={idx}>Batch: {b.batchNumber} (Exp: {b.expiryDate})</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3">{data.categories.find(c => c.id === item.categoryId)?.name}</td>
                  <td className="px-6 py-3">
                     {data.units.find(c => c.id === item.unitId)?.name}
                     {item.alternateUnits && item.alternateUnits.length > 0 && (
                        <div className="text-[10px] text-slate-500 mt-1">
                          + {item.alternateUnits.length} Satuan Alternatif
                        </div>
                     )}
                  </td>
                  <td className="px-6 py-3 text-right text-indigo-600 font-medium">Rp {new Intl.NumberFormat('id-ID').format(item.sellingPrice || 0)}</td>
                  <td className="px-6 py-3 text-right font-bold">{item.stock}</td>
                  <td className="px-6 py-3 text-right">
                    <Button onClick={() => openEditModal(item)} variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-indigo-600"><Edit className="w-4 h-4" /></Button>
                    <Button onClick={() => handleDelete(item.id, 'items')} variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
              {activeTab === 'categories' && data.categories.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(cat => (
                <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="px-6 py-3 font-mono text-xs text-slate-500">{cat.id}</td>
                  <td className="px-6 py-3 font-medium">{cat.name}</td>
                  <td className="px-6 py-3 text-right">
                    <Button onClick={() => openEditModal(cat)} variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-indigo-600"><Edit className="w-4 h-4" /></Button>
                    <Button onClick={() => handleDelete(cat.id, 'categories')} variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
              {activeTab === 'units' && data.units.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(unit => (
                <tr key={unit.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="px-6 py-3 font-mono text-xs text-slate-500">{unit.id}</td>
                  <td className="px-6 py-3 font-medium">{unit.name}</td>
                  <td className="px-6 py-3 text-right">
                    <Button onClick={() => openEditModal(unit)} variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-indigo-600"><Edit className="w-4 h-4" /></Button>
                    <Button onClick={() => handleDelete(unit.id, 'units')} variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
              {activeTab === 'suppliers' && data.suppliers.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(sup => (
                <tr key={sup.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="px-6 py-3 font-mono text-xs text-slate-500">{sup.id}</td>
                  <td className="px-6 py-3 font-medium">{sup.name}</td>
                  <td className="px-6 py-3">{sup.contact}</td>
                  <td className="px-6 py-3 text-right">
                    <Button onClick={() => openEditModal(sup)} variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-indigo-600"><Edit className="w-4 h-4" /></Button>
                    <Button onClick={() => handleDelete(sup.id, 'suppliers')} variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
              {activeTab === 'low-stock' && Object.keys(lowStockBySupplier).map(supplierId => {
                const items = lowStockBySupplier[supplierId].filter(i => 
                  i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  (i.sku && i.sku.toLowerCase().includes(searchTerm.toLowerCase()))
                );
                
                if (items.length === 0) return null;
                
                return items.map((item, idx) => (
                  <tr key={`${supplierId}-${item.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    {idx === 0 && (
                      <td className="px-6 py-3 font-bold text-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/20 dark:text-indigo-300 align-top border-b-0" rowSpan={items.length}>
                        {getSupplierName(supplierId)}
                      </td>
                    )}
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">{item.sku || '-'}</td>
                    <td className="px-6 py-3 font-medium">{item.name}</td>
                    <td className="px-6 py-3 text-center font-bold text-rose-600 dark:text-rose-400">
                      {item.stock} {data.units.find(u => u.id === item.unitId)?.name}
                    </td>
                    <td className="px-6 py-3 text-center text-slate-500">
                      {item.minStock}
                    </td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                      {getSupplierName(item.altSupplierId)}
                    </td>
                  </tr>
                ));
              })}
              {activeTab === 'low-stock' && Object.keys(lowStockBySupplier).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">
                    Semua stok dalam keadaan aman.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODALS */}
      {modalType === 'categories' && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-4">{editCategoryData?.id ? 'Edit' : 'Tambah'} Kategori</h3>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1">Nama Kategori</label>
              <Input value={editCategoryData?.name || ''} onChange={e => setEditCategoryData({ ...editCategoryData, name: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModalType(null)}>Batal</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveCategory}>Simpan</Button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'units' && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-4">{editUnitData?.id ? 'Edit' : 'Tambah'} Satuan</h3>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1">Nama Satuan</label>
              <Input value={editUnitData?.name || ''} onChange={e => setEditUnitData({ ...editUnitData, name: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModalType(null)}>Batal</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveUnit}>Simpan</Button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'suppliers' && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-4">{editSupplierData?.id ? 'Edit' : 'Tambah'} Supplier</h3>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1">Nama Supplier</label>
              <Input value={editSupplierData?.name || ''} onChange={e => setEditSupplierData({ ...editSupplierData, name: e.target.value })} />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1">Kontak</label>
              <Input value={editSupplierData?.contact || ''} onChange={e => setEditSupplierData({ ...editSupplierData, contact: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModalType(null)}>Batal</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveSupplier}>Simpan</Button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'items' && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 py-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-4xl shadow-xl flex flex-col max-h-full">
            <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center shrink-0">
               <h3 className="text-lg font-bold">{editItemData?.id ? 'Edit' : 'Tambah'} Barang</h3>
               <button onClick={() => setModalType(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">SKU / Kode Barang</label>
                  <Input value={editItemData?.sku || ''} onChange={e => setEditItemData({ ...editItemData, sku: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Nama Barang</label>
                  <Input value={editItemData?.name || ''} onChange={e => setEditItemData({ ...editItemData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Kategori</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                    value={editItemData?.categoryId || ''}
                    onChange={e => setEditItemData({ ...editItemData, categoryId: e.target.value })}
                  >
                    <option value="">Pilih Kategori</option>
                    {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Satuan Utama</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                    value={editItemData?.unitId || ''}
                    onChange={e => setEditItemData({ ...editItemData, unitId: e.target.value })}
                  >
                    <option value="">Pilih Satuan</option>
                    {data.units.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Harga Jual Dasar</label>
                  <Input type="number" value={editItemData?.sellingPrice || ''} onChange={e => setEditItemData({ ...editItemData, sellingPrice: Number(e.target.value) })} />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold mb-1">Stok Awal</label>
                    <Input type="number" value={editItemData?.stock || ''} onChange={e => setEditItemData({ ...editItemData, stock: Number(e.target.value) })} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold mb-1">Min. Stok</label>
                    <Input type="number" value={editItemData?.minStock || ''} onChange={e => setEditItemData({ ...editItemData, minStock: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 pt-4 border-t dark:border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-sm">Info Batch & Kadaluwarsa</h4>
                    <Button variant="outline" size="sm" onClick={() => {
                        const bt = editItemData?.batches ? [...editItemData.batches] : [];
                        bt.push({ batchNumber: '', expiryDate: '' });
                        setEditItemData({ ...editItemData, batches: bt });
                    }}>+ Tambah Batch</Button>
                  </div>
                  
                  <div className="mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded">
                    <h5 className="text-xs font-bold mb-2 text-slate-500">Batch Utama</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold mb-1">Nomor Batch</label>
                        <Input value={editItemData?.batchNumber || ''} onChange={e => setEditItemData({ ...editItemData, batchNumber: e.target.value })} placeholder="OPSIONAL" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold mb-1">Tanggal Expired</label>
                        <Input type="date" value={editItemData?.expiryDate || ''} onChange={e => setEditItemData({ ...editItemData, expiryDate: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {editItemData?.batches?.map((b, idx) => (
                    <div key={idx} className="flex gap-2 items-center mb-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                      <div className="flex-1">
                         <label className="block text-[11px] font-bold mb-1">Nomor Batch</label>
                         <Input value={b.batchNumber} onChange={e => {
                           const newer = [...editItemData.batches!];
                           newer[idx].batchNumber = e.target.value;
                           setEditItemData({ ...editItemData, batches: newer });
                         }} />
                      </div>
                      <div className="flex-1">
                         <label className="block text-[11px] font-bold mb-1">Tanggal Expired</label>
                         <Input type="date" value={b.expiryDate} onChange={e => {
                           const newer = [...editItemData.batches!];
                           newer[idx].expiryDate = e.target.value;
                           setEditItemData({ ...editItemData, batches: newer });
                         }} />
                      </div>
                      <div className="pt-5">
                         <Button variant="ghost" size="sm" onClick={() => {
                           const newer = [...editItemData.batches!];
                           newer.splice(idx, 1);
                           setEditItemData({ ...editItemData, batches: newer });
                         }} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="col-span-1 md:col-span-2 pt-4 border-t dark:border-slate-800">
                  <h4 className="font-bold text-sm mb-3">Supplier</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-1">Supplier Utama</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        value={editItemData?.supplierId || ''}
                        onChange={e => setEditItemData({ ...editItemData, supplierId: e.target.value })}
                      >
                        <option value="">Pilih Supplier Utama</option>
                        {data.suppliers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Supplier Alternatif</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        value={editItemData?.altSupplierId || ''}
                        onChange={e => setEditItemData({ ...editItemData, altSupplierId: e.target.value })}
                      >
                        <option value="">Pilih Supplier Alternatif</option>
                        {data.suppliers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 pt-4 border-t dark:border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-sm">Satuan Alternatif</h4>
                    <Button variant="outline" size="sm" onClick={() => {
                      const au = editItemData?.alternateUnits ? [...editItemData.alternateUnits] : [];
                      au.push({ unitId: '', conversionRate: 1 });
                      setEditItemData({ ...editItemData, alternateUnits: au });
                    }}>+ Tambah Satuan Alternatif</Button>
                  </div>
                  {editItemData?.alternateUnits?.map((au, idx) => (
                    <div key={idx} className="flex gap-2 items-center mb-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                        value={au.unitId}
                        onChange={e => {
                          const newer = [...editItemData.alternateUnits!];
                          newer[idx].unitId = e.target.value;
                          setEditItemData({ ...editItemData, alternateUnits: newer });
                        }}
                      >
                        <option value="">Pilih Satuan</option>
                        {data.units.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <span className="text-sm font-bold text-slate-500">=</span >
                      <Input 
                        type="number" 
                        min={1}
                        placeholder="Nilai Konversi (thd Satuan Utama)" 
                        value={au.conversionRate} 
                        onChange={e => {
                          const newer = [...editItemData.alternateUnits!];
                          newer[idx].conversionRate = Number(e.target.value);
                          setEditItemData({ ...editItemData, alternateUnits: newer });
                        }} 
                      />
                      <span className="text-sm whitespace-nowrap text-slate-500 line-clamp-1 flex-1">
                        {data.units.find(u => u.id === editItemData.unitId)?.name || 'Satuan Utama'}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => {
                        const newer = [...editItemData.alternateUnits!];
                        newer.splice(idx, 1);
                        setEditItemData({ ...editItemData, alternateUnits: newer });
                      }} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  {(!editItemData?.alternateUnits || editItemData?.alternateUnits.length === 0) && (
                    <p className="text-sm text-slate-500 italic">Belum ada satuan alternatif dikonfigurasi.</p>
                  )}
                </div>

              </div>
            </div>
            <div className="p-4 border-t dark:border-slate-800 flex justify-end gap-2 shrink-0 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
              <Button variant="ghost" onClick={() => setModalType(null)}>Batal</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveItem}>Simpan Barang</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

