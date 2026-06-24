import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Item, AppData } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, FileText, FileSpreadsheet, Plus, Trash2 } from 'lucide-react';

interface ExportLowStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  lowStockItems: Item[];
  data: AppData;
}

interface ColumnConfig {
  id: string;
  field: string;
  customHeader: string;
}

const AVAILABLE_FIELDS = [
  { value: 'sku', label: 'SKU' },
  { value: 'name', label: 'Nama Produk' },
  { value: 'stock', label: 'Stok' },
  { value: 'minStock', label: 'Min. Stok' },
  { value: 'unit', label: 'Satuan' },
  { value: 'category', label: 'Kategori' },
  { value: 'supplier', label: 'Supplier Utama' },
  { value: 'altSupplier', label: 'Supplier Alternatif' },
  { value: 'custom_blank', label: 'Kolom Kosong (Kustom)' },
];

const PAPER_SIZES = [
  { value: 'a4', label: 'A4' },
  { value: 'f4', label: 'F4 (Folio)' },
  { value: 'letter', label: 'Letter' },
  { value: 'legal', label: 'Legal' },
];

export const ExportLowStockModal: React.FC<ExportLowStockModalProps> = ({ isOpen, onClose, lowStockItems, data }) => {
  const [groupBySupplier, setGroupBySupplier] = useState(true);
  const [paperSize, setPaperSize] = useState('a4');
  const [orientation, setOrientation] = useState<'portrait'|'landscape'>('portrait');
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: '1', field: 'sku', customHeader: 'SKU' },
    { id: '2', field: 'name', customHeader: 'Nama Produk' },
    { id: '3', field: 'stock', customHeader: 'Stok' },
    { id: '4', field: 'minStock', customHeader: 'Min. Stok' },
    { id: '5', field: 'unit', customHeader: 'Satuan' },
  ]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set(lowStockItems.map(i => i.id)));

  React.useEffect(() => {
    if (isOpen) {
      setSelectedItemIds(new Set(lowStockItems.map(i => i.id)));
    }
  }, [isOpen, lowStockItems]);

  if (!isOpen) return null;

  const getFieldValue = (item: Item, field: string) => {
    switch (field) {
      case 'sku': return item.sku || '-';
      case 'name': return item.name || '-';
      case 'stock': return item.stock.toString();
      case 'minStock': return item.minStock?.toString() || '0';
      case 'unit': return data.units.find(u => u.id === item.unitId)?.name || '-';
      case 'category': return data.categories.find(c => c.id === item.categoryId)?.name || '-';
      case 'supplier': return data.suppliers.find(s => s.id === item.supplierId)?.name || 'Tanpa Supplier';
      case 'altSupplier': return data.suppliers.find(s => s.id === item.altSupplierId)?.name || '-';
      case 'custom_blank': return ' ';
      default: return '-';
    }
  };

  const addColumn = () => {
    const newId = Date.now().toString();
    setColumns([...columns, { id: newId, field: 'name', customHeader: 'Nama Produk' }]);
  };

  const removeColumn = (id: string) => {
    setColumns(columns.filter(c => c.id !== id));
  };

  const updateColumn = (id: string, updates: Partial<ColumnConfig>) => {
    setColumns(columns.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const getFormatSize = (size: string): [number, number] => {
    switch(size) {
      case 'a4': return [210, 297];
      case 'f4': return [210, 330];
      case 'letter': return [215.9, 279.4];
      case 'legal': return [215.9, 355.6];
      default: return [210, 297];
    }
  };

  const handleExportPDF = () => {
    const format = getFormatSize(paperSize);
    const doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: format
    });
    
    doc.setFontSize(16);
    doc.text("Laporan Stok Menipis", 14, 20);

    const head = [columns.map(c => c.customHeader)];
    
    const itemsToExport = lowStockItems.filter(i => selectedItemIds.has(i.id));

    if (groupBySupplier) {
      let yPos = 30;
      const grouped = itemsToExport.reduce((acc, item) => {
        const key = item.supplierId || "unknown";
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {} as Record<string, Item[]>);

      Object.keys(grouped).forEach((supplierId) => {
        const supplierName = data.suppliers.find(s => s.id === supplierId)?.name || "Tanpa Supplier";
        const items = grouped[supplierId];

        doc.setFontSize(12);
        doc.text(`Supplier: ${supplierName}`, 14, yPos);
        yPos += 5;

        const body = items.map(item => columns.map(c => getFieldValue(item, c.field)));

        autoTable(doc, {
          startY: yPos,
          head,
          body,
          theme: "grid",
          headStyles: { fillColor: [79, 70, 229] },
          margin: { top: 10 },
          didDrawPage: (data) => {
            doc.setFontSize(10);
            const pageCount = (doc as any).internal.getNumberOfPages();
            doc.text(
              `Halaman ${pageCount}`,
              doc.internal.pageSize.getWidth() - 20,
              doc.internal.pageSize.getHeight() - 10,
              { align: 'right' }
            );
          }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;

        if (yPos > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          yPos = 20;
        }
      });
    } else {
      const body = itemsToExport.map(item => columns.map(c => getFieldValue(item, c.field)));
      autoTable(doc, {
        startY: 30,
        head,
        body,
        theme: "grid",
        headStyles: { fillColor: [79, 70, 229] },
        didDrawPage: (data) => {
          doc.setFontSize(10);
          const pageCount = (doc as any).internal.getNumberOfPages();
          doc.text(
            `Halaman ${pageCount}`,
            doc.internal.pageSize.getWidth() - 20,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'right' }
          );
        }
      });
    }

    doc.save("Laporan_Stok_Menipis.pdf");
    onClose();
  };

  const handleExportExcel = () => {
    const rows: any[] = [];
    const itemsToExport = lowStockItems.filter(i => selectedItemIds.has(i.id));
    
    if (groupBySupplier) {
      const grouped = itemsToExport.reduce((acc, item) => {
        const key = item.supplierId || "unknown";
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {} as Record<string, Item[]>);

      Object.keys(grouped).forEach((supplierId) => {
        const items = grouped[supplierId];
        items.forEach(item => {
          const rowData: any = {};
          columns.forEach(c => {
            rowData[c.customHeader] = getFieldValue(item, c.field);
          });
          rows.push(rowData);
        });
      });
    } else {
      itemsToExport.forEach(item => {
        const rowData: any = {};
        columns.forEach(c => {
          rowData[c.customHeader] = getFieldValue(item, c.field);
        });
        rows.push(rowData);
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stok Menipis");
    XLSX.writeFile(workbook, "Laporan_Stok_Menipis.xlsx");
    onClose();
  };

  const toggleItemSelection = (id: string) => {
    const newSelected = new Set(selectedItemIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItemIds(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedItemIds.size === lowStockItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(lowStockItems.map(i => i.id)));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Ekspor Data Stok Menipis</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">Pengaturan Umum</h3>
              
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={groupBySupplier}
                  onChange={(e) => setGroupBySupplier(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Kelompokkan berdasarkan Supplier
              </label>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">Pengaturan PDF</h3>
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Ukuran Kertas</label>
                <select 
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value)}
                  className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                >
                  {PAPER_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Orientasi Kertas</label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
                  <button 
                    onClick={() => setOrientation('portrait')}
                    className={`flex-1 text-xs py-1.5 rounded-sm font-medium transition-colors ${orientation === 'portrait' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                  >
                    Portrait
                  </button>
                  <button 
                    onClick={() => setOrientation('landscape')}
                    className={`flex-1 text-xs py-1.5 rounded-sm font-medium transition-colors ${orientation === 'landscape' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                  >
                    Landscape
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Columns */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
              <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Pengaturan Kolom</h3>
              <Button size="sm" variant="outline" onClick={addColumn} className="h-8">
                <Plus className="w-4 h-4 mr-1" /> Tambah Kolom
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_40px] gap-2 px-2 text-xs font-medium text-slate-500">
                <div>Data</div>
                <div>Nama Header Kolom</div>
                <div></div>
              </div>
              
              {columns.map((col) => (
                <div key={col.id} className="grid grid-cols-[1fr_1fr_40px] gap-2 items-center bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                  <select
                    value={col.field}
                    onChange={(e) => {
                      const newField = e.target.value;
                      const fieldLabel = AVAILABLE_FIELDS.find(f => f.value === newField)?.label || '';
                      updateColumn(col.id, { field: newField, customHeader: fieldLabel });
                    }}
                    className="text-sm rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  >
                    {AVAILABLE_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <Input 
                    value={col.customHeader}
                    onChange={(e) => updateColumn(col.id, { customHeader: e.target.value })}
                    className="h-[38px]"
                    placeholder="Nama Header"
                  />
                  <button 
                    onClick={() => removeColumn(col.id)}
                    disabled={columns.length <= 1}
                    className="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Item Selection */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
              <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Pilih Item ({selectedItemIds.size}/{lowStockItems.length})</h3>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedItemIds.size === lowStockItems.length && lowStockItems.length > 0}
                  onChange={toggleAllSelection}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Pilih Semua
              </label>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-900/50">
              {lowStockItems.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">Tidak ada item stok menipis</div>
              ) : (
                lowStockItems.map(item => (
                  <label key={item.id} className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={selectedItemIds.has(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name}</div>
                      <div className="text-xs text-slate-500">Stok: {item.stock} / Min: {item.minStock || 0}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Ekspor Excel
          </Button>
          <Button onClick={handleExportPDF} className="bg-rose-600 hover:bg-rose-700 text-white">
            <FileText className="w-4 h-4 mr-2" />
            Ekspor PDF
          </Button>
        </div>
      </div>
    </div>
  );
};
