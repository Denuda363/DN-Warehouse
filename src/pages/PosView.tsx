import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, History, UserSquare, Users, CreditCard, ScanLine, Save, ArrowLeft, Edit, Trash2, RotateCcw, X, FileText, LayoutGrid, List } from 'lucide-react';
import { Item, Transaction } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type CartItem = Item & {
  cartQty: number; // total base units
  inputQty: number; // qty in selected unit
  selectedUnitId: string;
  selectedBatch?: string; // "unbatched" or specific batch number
};

export const PosView: React.FC = () => {
  const { data, updateData, currentUser, logActivity } = useAppContext();
  const [activeCategory, setActiveCategory] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [posLayout, setPosLayout] = useState<'grid' | 'list'>('grid');
  const [mobileView, setMobileView] = useState<'products' | 'cart'>('products');

  const [viewMode, setViewMode] = useState<'pos' | 'history'>('pos');
  const [penyedia, setPenyedia] = useState<string>('');
  const [historySearch, setHistorySearch] = useState('');
  const [editTxModal, setEditTxModal] = useState<{ id: string, qty: number } | null>(null);
  const [returnTxModal, setReturnTxModal] = useState<{ id: string, qty: number, maxQty: number } | null>(null);

  const [txDate, setTxDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [historyStartDate, setHistoryStartDate] = useState<string>('');
  const [historyEndDate, setHistoryEndDate] = useState<string>('');

  const colors = [
    'bg-amber-400', 'bg-lime-400', 'bg-purple-600', 'bg-stone-400',
    'bg-emerald-700', 'bg-cyan-500', 'bg-rose-200', 'bg-red-500', 'bg-sky-200'
  ];

  const downloadPosTemplate = () => {
    const rows = [
      {
        SKU: "BRG-001",
        Nama_Produk: "Contoh Produk A",
        Qty: 2,
        Satuan: "Pcs",
        Nomor_Batch: "BATCH-A1"
      },
      {
        SKU: "BRG-002",
        Nama_Produk: "Contoh Produk B",
        Qty: 5,
        Satuan: "Box",
        Nomor_Batch: "unbatched"
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "POS_Cart");
    XLSX.writeFile(workbook, "Template_Import_POS.xlsx");
  };

  const handlePosExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const dataArr: any[] = XLSX.utils.sheet_to_json(ws);
        if (dataArr.length === 0) {
          alert("Data excel kosong!");
          return;
        }

        const importedCartItems: CartItem[] = [];
        const warnings: string[] = [];

        dataArr.forEach((row: any) => {
          const skuStr = String(row.SKU || "").trim();
          if (!skuStr) return;

          const matchedItem = data.items.find(
            (item) => item.sku?.toLowerCase() === skuStr.toLowerCase()
          );

          if (!matchedItem) {
            warnings.push(`SKU "${skuStr}" tidak ditemukan di Master Data.`);
            return;
          }

          const qty = Number(row.Qty || row.QTY || row.Jumlah || 1);
          if (qty <= 0) return;

          // Determine corresponding unit id
          let unitId = matchedItem.unitId;
          const unitNameStr = String(row.Satuan || row.SATUAN || "").trim();
          if (unitNameStr) {
            const matchedUnit = data.units.find(
              (u) => u.name.toLowerCase() === unitNameStr.toLowerCase()
            );
            if (matchedUnit) {
              if (matchedUnit.id === matchedItem.unitId) {
                unitId = matchedItem.unitId;
              } else {
                const altMatch = matchedItem.alternateUnits?.find(
                  (alt) => alt.unitId === matchedUnit.id
                );
                if (altMatch) {
                  unitId = matchedUnit.id;
                } else {
                  warnings.push(`Satuan "${unitNameStr}" bukan satuan alternatif valid untuk SKU "${skuStr}". Menggunakan default.`);
                }
              }
            } else {
              warnings.push(`Satuan "${unitNameStr}" tidak ditemukan. Menggunakan default.`);
            }
          }

          // Determine batch number
          let batchNo = "unbatched";
          const excelBatch = String(row.Nomor_Batch || row.NOMOR_BATCH || row.Batch || "").trim();
          if (excelBatch) {
            batchNo = excelBatch;
          } else {
            const totalBatchStock = matchedItem.batches?.reduce((acc: number, b: any) => acc + (b.stock || 0), 0) || 0;
            const unbatchedStock = Math.max(0, matchedItem.stock - totalBatchStock);
            if (unbatchedStock === 0 && matchedItem.batches && matchedItem.batches.length > 0) {
              const firstAvailableBatch = matchedItem.batches.find((b: any) => (b.stock ?? 0) > 0);
              if (firstAvailableBatch) {
                batchNo = firstAvailableBatch.batchNumber;
              }
            }
          }

          // Construct CartItem object
          const conversion = getConversionRate(matchedItem, unitId);
          const cartQty = qty * conversion;

          const tempCartItem: CartItem = {
            ...matchedItem,
            inputQty: qty,
            cartQty: cartQty,
            selectedUnitId: unitId,
            selectedBatch: batchNo
          };

          // Check batch stock validation
          const availableStock = getSelectedBatchStock(tempCartItem);
          if (availableStock < cartQty) {
            warnings.push(
              `Stok tidak mencukupi untuk "${matchedItem.name}" (${
                batchNo === "unbatched" ? "Tanpa Batch" : `Batch ${batchNo}`
              }). Tersedia: ${availableStock}, Meminta: ${cartQty}`
            );
            const maxInputQty = Math.floor(availableStock / conversion);
            if (maxInputQty > 0) {
              tempCartItem.inputQty = maxInputQty;
              tempCartItem.cartQty = maxInputQty * conversion;
              importedCartItems.push(tempCartItem);
            }
          } else {
            importedCartItems.push(tempCartItem);
          }
        });

        if (importedCartItems.length > 0) {
          setCart((prev) => {
            const merged = [...prev];
            importedCartItems.forEach((newItem) => {
              const dupIdx = merged.findIndex((item) => item.id === newItem.id);
              if (dupIdx >= 0) {
                merged[dupIdx] = newItem;
              } else {
                merged.push(newItem);
              }
            });
            return merged;
          });

          let successMsg = `Berhasil mengimpor ${importedCartItems.length} barang ke dalam keranjang POS!`;
          if (warnings.length > 0) {
            successMsg += `\n\nCatatan / Peringatan:\n` + warnings.join("\n");
          }
          alert(successMsg);
        } else {
          let errorMsg = "Tidak ada barang valid yang berhasil diimpor ke keranjang!";
          if (warnings.length > 0) {
            errorMsg += `\n\nMasalah:\n` + warnings.join("\n");
          }
          alert(errorMsg);
        }
      } catch (err) {
        console.error(err);
        alert("Gagal memproses file excel. Pastikan format file sesuai.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  const filteredItems = useMemo(() => {
    return data.items.filter(item => {
      // Restriction by permissions
      const currentUserCategories = currentUser?.allowedCategoryIds || [];
      const hasCategoryRestriction = currentUser?.role !== 'ADMIN' && currentUserCategories.length > 0;
      if (hasCategoryRestriction && !currentUserCategories.includes(item.categoryId)) {
        return false;
      }
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      if (activeCategory !== 'Semua') {
        const cat = data.categories.find(c => c.id === item.categoryId);
        return cat?.name === activeCategory;
      }
      return true;
    });
  }, [data.items, data.categories, searchTerm, activeCategory, currentUser]);

  const getSelectedBatchStock = (item: CartItem): number => {
    if (!item.selectedBatch || item.selectedBatch === 'unbatched') {
      return item.stock;
    }
    const match = item.batches?.find(b => b.batchNumber === item.selectedBatch);
    return match ? (match.stock ?? 0) : 0;
  };

  const getConversionRate = (item: Item, unitId: string) => {
     if (unitId === item.unitId) return 1;
     const alt = item.alternateUnits?.find(u => u.unitId === unitId);
     return alt ? alt.conversionRate : 1;
  };

  const addToCart = (item: Item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        const availableStock = getSelectedBatchStock(existing);
        const conversion = getConversionRate(item, existing.selectedUnitId);
        const totalNeeded = existing.cartQty + 1 * conversion;
        if (totalNeeded > availableStock) {
          alert(`Stok tidak mencukupi untuk batch "${existing.selectedBatch === 'unbatched' ? 'Tanpa Batch' : existing.selectedBatch}"!`);
          return prev;
        }
        return prev.map(i => i.id === item.id ? { ...i, inputQty: i.inputQty + 1, cartQty: totalNeeded } : i);
      }
      
      let initialBatch = 'unbatched';
      const totalBatchStock = item.batches?.reduce((acc, b) => acc + (b.stock || 0), 0) || 0;
      const unbatchedStock = Math.max(0, item.stock - totalBatchStock);
      
      if (unbatchedStock === 0 && item.batches && item.batches.length > 0) {
        const firstAvailableBatch = item.batches.find(b => (b.stock ?? 0) > 0);
        if (firstAvailableBatch) {
          initialBatch = firstAvailableBatch.batchNumber;
        }
      }

      const tempCartItem: CartItem = { 
        ...item, 
        inputQty: 1, 
        cartQty: 1, 
        selectedUnitId: item.unitId,
        selectedBatch: initialBatch
      };

      const availableStock = getSelectedBatchStock(tempCartItem);
      if (availableStock < 1) {
        alert('Stok untuk produk ini habis!');
        return prev;
      }

      return [...prev, tempCartItem];
    });
  };

  const updateCartBatch = (id: string, batchNo: string) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const itemWithNewBatch = { ...i, selectedBatch: batchNo };
        const conversion = getConversionRate(itemWithNewBatch, itemWithNewBatch.selectedUnitId);
        const availableStock = getSelectedBatchStock(itemWithNewBatch);
        const maxInputQty = Math.floor(availableStock / conversion);
        const val = Math.min(i.inputQty, maxInputQty);
        const finalQty = maxInputQty > 0 ? Math.max(0, val) : 0;
        return { 
          ...itemWithNewBatch, 
          inputQty: finalQty, 
          cartQty: finalQty * conversion 
        };
      }
      return i;
    }));
  };

  const updateCartQty = (id: string, qty: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const conversion = getConversionRate(i, i.selectedUnitId);
        const availableStock = getSelectedBatchStock(i);
        const maxInputQty = Math.floor(availableStock / conversion);
        const validQty = Math.max(0, Math.min(qty, maxInputQty));
        return { ...i, inputQty: validQty, cartQty: validQty * conversion };
      }
      return i;
    }));
  };

  const updateCartUnit = (id: string, unitId: string) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const conversion = getConversionRate(i, unitId);
        const availableStock = getSelectedBatchStock(i);
        const maxInputQty = Math.floor(availableStock / conversion);
        const validQty = Math.max(0, Math.min(i.inputQty, maxInputQty));
        return { ...i, selectedUnitId: unitId, inputQty: validQty, cartQty: validQty * conversion };
      }
      return i;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleCheckout = () => {
    const activeCart = cart.filter(item => item.cartQty > 0);
    if (activeCart.length === 0) {
      alert('Tidak ada barang dengan jumlah lebih dari 0 untuk dicheckout!');
      return;
    }
    
    const groupId = `POS-${Date.now()}`;
    const now = new Date();
    const timeString = now.toISOString().substring(11); // e.g. "12:00:00.000Z"
    const date = `${txDate}T${timeString}`;

    // Create transactions for each out
    const newTxs: Transaction[] = activeCart.map(item => {
      const selectedBatchStr = item.selectedBatch === 'unbatched' ? 'Tanpa Batch' : `Batch ${item.selectedBatch}`;
      const noteStr = penyedia 
        ? `Penyedia: ${penyedia} | ${selectedBatchStr}` 
        : `POS Transaction (${selectedBatchStr})`;
        
      return {
        id: `tx-out-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        groupId,
        date,
        type: 'OUT',
        itemId: item.id,
        qty: item.cartQty,
        displayUnitId: item.selectedUnitId,
        displayQty: item.inputQty,
        conversionRate: getConversionRate(item, item.selectedUnitId),
        notes: noteStr,
        userId: currentUser?.id || 'unknown'
      };
    });

    logActivity("Transaksi Keluar (POS)", `Mengeluarkan ${activeCart.length} jenis barang. Penyedia: ${penyedia || '-'}`);

    // Deduct stock
    const newItems = data.items.map(item => {
      const inCart = activeCart.find(c => c.id === item.id);
      if (inCart) {
        const qtyToDeduct = inCart.cartQty;
        const selectedBatch = inCart.selectedBatch || 'unbatched';
        
        // Calculate updated unbatchedStock
        const totalBatchStock = item.batches?.reduce((acc, b) => acc + (b.stock || 0), 0) || 0;
        const currentUnbatched = item.unbatchedStock !== undefined ? item.unbatchedStock : Math.max(0, item.stock - totalBatchStock);
        
        let newUnbatched = currentUnbatched;
        let newBatches = item.batches ? [...item.batches] : [];
        
        if (selectedBatch === 'unbatched') {
          newUnbatched = Math.max(0, currentUnbatched - qtyToDeduct);
        } else {
          newBatches = newBatches.map(b => {
            if (b.batchNumber === selectedBatch) {
              return { ...b, stock: Math.max(0, (b.stock || 0) - qtyToDeduct) };
            }
            return b;
          });
        }
        
        // Return updated item with updated individual stocks and total stock
        const updatedTotalStock = Math.max(0, item.stock - qtyToDeduct);
        return {
          ...item,
          unbatchedStock: newUnbatched,
          batches: newBatches,
          stock: updatedTotalStock
        };
      }
      return item;
    });

    updateData({
      transactions: [...newTxs, ...data.transactions],
      items: newItems
    });

    setCart([]);
    setPenyedia('');
    alert(`Data Transaksi Berhasil Disimpan!`);
  };

  const handleDeleteHistory = (tx: Transaction) => {
    if (!confirm('Hapus transaksi ini dan kembalikan stok?')) return;
    
    // Find item details
    const item = data.items.find(i => i.id === tx.itemId);
    const itemName = item ? item.name : tx.itemId;
    logActivity("Hapus Riwayat Transaksi", `Menghapus transaksi ${tx.type === 'IN' ? 'Masuk' : 'Keluar'} untuk item ${itemName}`);

    const newItems = data.items.map(item => {
      if (item.id === tx.itemId) {
        return { ...item, stock: item.stock + tx.qty };
      }
      return item;
    });
    updateData({
      transactions: data.transactions.filter(t => t.id !== tx.id),
      items: newItems
    });
  };

  const handleEditHistory = () => {
    if (!editTxModal) return;
    const tx = data.transactions.find(t => t.id === editTxModal.id);
    if (!tx) return;

    if (editTxModal.qty <= 0) {
      alert('Qty harus lebih besar dari 0');
      return;
    }

    const newDisplayQty = editTxModal.qty;
    const newQty = newDisplayQty * (tx.conversionRate || 1);
    const diff = tx.qty - newQty; // if old qty 5, new qty 3, diff = 2 (return to stock)

    const newItems = data.items.map(item => {
      if (item.id === tx.itemId) {
        return { ...item, stock: item.stock + diff };
      }
      return item;
    });

    updateData({
      transactions: data.transactions.map(t => t.id === tx.id ? { ...t, qty: newQty, displayQty: newDisplayQty } : t),
      items: newItems
    });
    setEditTxModal(null);
  };

  const handleReturnHistory = () => {
    if (!returnTxModal) return;
    const { id, qty, maxQty } = returnTxModal;
    if (qty <= 0 || qty > maxQty) {
      alert(`Qty retur tidak valid (maks: ${maxQty})`);
      return;
    }

    const originalTx = data.transactions.find(t => t.id === id);
    if (!originalTx) return;
    
    const returnQty = qty * (originalTx.conversionRate || 1);

    const returnTx: Transaction = {
      id: `tx-ret-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'IN',
      itemId: originalTx.itemId,
      qty: returnQty,
      displayUnitId: originalTx.displayUnitId,
      displayQty: qty,
      conversionRate: originalTx.conversionRate,
      notes: `Retur dari transaksi ${originalTx.id}`,
      userId: currentUser?.id || 'unknown'
    };

    const newItems = data.items.map(item => {
      if (item.id === originalTx.itemId) {
        return { ...item, stock: item.stock + returnQty };
      }
      return item;
    });

    updateData({
      transactions: [returnTx, ...data.transactions],
      items: newItems
    });
    setReturnTxModal(null);
    alert('Retur berhasil dicatat.');
  };

  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const currentUserCategories = currentUser?.allowedCategoryIds || [];
  const hasCategoryRestriction = currentUser?.role !== 'ADMIN' && currentUserCategories.length > 0;

  const historyTxs = data.transactions.filter(t => {
     if (t.type !== 'OUT') return false;
     if (hasCategoryRestriction) {
        const item = data.items.find(i => i.id === t.itemId);
        if (!item || !currentUserCategories.includes(item.categoryId)) return false;
     }
     return true;
  });
  
  // Group by groupId (or id for old ones)
  const groupedHistory = historyTxs.reduce((acc, tx) => {
    const key = tx.groupId || tx.id;
    if (!acc[key]) {
      acc[key] = {
        id: key,
        date: tx.date,
        notes: tx.notes,
        transactions: []
      };
    }
    // Update notes if missing
    if (!acc[key].notes && tx.notes) {
       acc[key].notes = tx.notes;
    }
    acc[key].transactions.push(tx);
    return acc;
  }, {} as Record<string, { id: string; date: string; notes: string; transactions: Transaction[] }>);

  const historyGroupsList = Object.values(groupedHistory)
    .map(g => g as { id: string; date: string; notes: string; transactions: Transaction[] })
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredHistoryGroups = historyGroupsList.filter(group => {
    // Date filter logic
    const groupDateOnly = group.date.substring(0, 10);
    if (historyStartDate && groupDateOnly < historyStartDate) return false;
    if (historyEndDate && groupDateOnly > historyEndDate) return false;

    const matchId = group.id.toLowerCase().includes(historySearch.toLowerCase());
    const matchItemName = group.transactions.some(tx => {
      const item = data.items.find(i => i.id === tx.itemId);
      return item?.name.toLowerCase().includes(historySearch.toLowerCase());
    });
    return matchId || matchItemName;
  });

  const exportPosHistoryPdf = () => {
    const doc = new jsPDF();
    doc.text('Riwayat POS / Transaksi Keluar', 14, 15);
    
    const tableData: any[][] = [];
    filteredHistoryGroups.forEach(group => {
      const gId = group.id.startsWith('POS-') ? group.id : group.id.split('-').slice(0,4).join('-');
      group.transactions.forEach(tx => {
        const item = data.items.find(i => i.id === tx.itemId);
        tableData.push([
          new Date(group.date).toLocaleString('id-ID'),
          gId,
          item?.name || 'Unknown',
          `${tx.displayQty || tx.qty} ${data.units.find(u => u.id === (tx.displayUnitId || item?.unitId))?.name || ''}`,
          group.notes || '-'
        ]);
      });
    });

    autoTable(doc, {
      head: [['Tanggal', 'No Transaksi', 'Barang', 'Qty', 'Penyedia / Keterangan']],
      body: tableData,
      startY: 20,
    });
    doc.save(`riwayat_pos_${new Date().getTime()}.pdf`);
  };

  const exportNotaPdf = (group: { id: string; date: string; notes: string; transactions: Transaction[] }) => {
    const doc = new jsPDF();
    const gId = group.id.startsWith('POS-') ? group.id : group.id.split('-').slice(0,4).join('-');
    const profile = data.warehouseProfile;
    
    // Header
    doc.setFontSize(20);
    doc.text(profile?.name || 'DN-Gudang', 14, 20);
    doc.setFontSize(10);
    doc.text(profile?.address || 'Alamat tidak tersedia', 14, 28);
    doc.text(profile?.phone || 'Telepon tidak tersedia', 14, 34);
    
    doc.line(14, 38, 196, 38);
    
    doc.setFontSize(14);
    doc.text('NOTA TRANSAKSI / BARANG KELUAR', 14, 48);
    doc.setFontSize(10);
    doc.text(`No. Transaksi: ${gId}`, 14, 56);
    doc.text(`Tanggal: ${new Date(group.date).toLocaleString('id-ID')}`, 14, 62);
    doc.text(`Keterangan / Penyedia: ${group.notes || '-'}`, 14, 68);

    const tableData: any[][] = [];
    group.transactions.forEach((tx, idx) => {
       const item = data.items.find(i => i.id === tx.itemId);
       tableData.push([
         idx + 1,
         item?.name || 'Unknown',
         `${tx.displayQty || tx.qty} ${data.units.find(u => u.id === (tx.displayUnitId || item?.unitId))?.name || ''}`
       ]);
    });

    autoTable(doc, {
      head: [['No', 'Barang', 'Qty']],
      body: tableData,
      startY: 75,
    });

    doc.save(`nota_${gId}.pdf`);
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-2 lg:gap-4 -mx-4 -mt-4 lg:m-0 p-2 lg:p-4 bg-slate-100 dark:bg-slate-900 lg:rounded-xl overflow-hidden shadow-sm">
      {viewMode === 'pos' && (
        <div className="flex lg:hidden bg-white dark:bg-slate-950 p-1 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 shrink-0">
          <button 
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${mobileView === 'products' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
            onClick={() => setMobileView('products')}
          >
            Barang
          </button>
          <button 
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${mobileView === 'cart' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
            onClick={() => setMobileView('cart')}
          >
            Keranjang ({cart.length})
          </button>
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden min-h-0">
        {/* Left Pane - Products */}
        <div className={`flex-[2] flex-col gap-4 min-w-0 pb-4 lg:pb-0 overflow-y-auto lg:overflow-hidden ${mobileView === 'products' || viewMode === 'history' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
            <div className="relative flex-1 w-full">
              <UserSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                list="staffs-list"
                placeholder="Pencarian Staff Gudang..." 
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 pl-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                value={penyedia}
                onChange={e => setPenyedia(e.target.value)}
              />
              <datalist id="staffs-list">
                {(data.staffs || []).map(s => <option key={s.id} value={s.name} />)}
              </datalist>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-40">
                <Input 
                  type="date"
                  value={txDate}
                  onChange={e => setTxDate(e.target.value)}
                  className="h-10 w-full bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                />
              </div>
              {viewMode === 'pos' && (
                 <Button variant="outline" className="h-10 flex-1 sm:flex-none text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 sm:px-4" onClick={() => setViewMode('history')}>
                   <History className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Riwayat List</span>
                 </Button>
              )}
            </div>
            {viewMode === 'history' && (
               <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                 <Button variant="outline" className="h-10 flex-1 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950" onClick={exportPosHistoryPdf}>
                   <FileText className="w-4 h-4 mr-2" /> Export
                 </Button>
                 <Button variant="outline" className="h-10 flex-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setViewMode('pos')}>
                   <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
                 </Button>
               </div>
            )}
          </div>

          {viewMode === 'pos' ? (
            <>
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Cari..." 
                    className="pl-9 h-11 bg-white dark:bg-slate-950 border-slate-200 shadow-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="relative flex-1">
                  <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                  <Input placeholder="Scan..." className="pl-9 h-11 border-indigo-200 shadow-sm dark:bg-slate-950 focus-visible:ring-indigo-500" />
                </div>
              </div>

              {/* Categories & Layout Toggle */}
              <div className="flex gap-2 justify-between items-center shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-2 flex-1 hide-scrollbar pt-1">
                  <button
                    onClick={() => setActiveCategory('Semua')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors shadow-sm ${
                      activeCategory === 'Semua' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Semua
                  </button>
                  {data.categories.filter(cat => {
                     const currentUserCategories = currentUser?.allowedCategoryIds || [];
                     const hasCategoryRestriction = currentUser?.role !== 'ADMIN' && currentUserCategories.length > 0;
                     return !hasCategoryRestriction || currentUserCategories.includes(cat.id);
                  }).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors shadow-sm ${
                        activeCategory === cat.name ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <div className="flex bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 rounded-lg shadow-sm shrink-0 gap-1 mb-2">
                  <button
                    onClick={() => setPosLayout('grid')}
                    className={`p-1.5 rounded-md transition-colors ${posLayout === 'grid' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 font-bold' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPosLayout('list')}
                    className={`p-1.5 rounded-md transition-colors ${posLayout === 'list' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 font-bold' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Product Grid / List Container */}
              <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-inner">
                {posLayout === 'grid' ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {filteredItems.map((item, idx) => {
                      const colorClass = colors[idx % colors.length];
                      const inCart = cart.find(c => c.id === item.id);
                      return (
                        <div 
                          key={item.id} 
                          onClick={() => { if (item.stock > 0) addToCart(item); }}
                          className={`bg-white dark:bg-slate-950 border rounded-lg overflow-hidden relative flex flex-col p-1.5 ${item.stock > 0 ? 'border-slate-200 dark:border-slate-800 cursor-pointer hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group' : 'border-red-200 dark:border-red-900/50 cursor-not-allowed opacity-70 grayscale-[50%]'} ${inCart ? 'ring-2 ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`}
                        >
                          {inCart && (
                            <div className="absolute top-1 right-1 bg-indigo-600 text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full z-10 shadow-sm border-[1.5px] border-white dark:border-slate-900">
                              {inCart.inputQty}
                            </div>
                          )}
                          <div className={`h-14 ${colorClass} rounded-md flex items-center justify-center relative overflow-hidden ${item.stock > 0 ? 'group-hover:opacity-90 transition-opacity' : ''} shrink-0`}>
                            <span className="text-lg font-bold text-white/90 drop-shadow-sm">{getInitials(item.name)}</span>
                            <div className="absolute bottom-1 right-1 bg-black/40 text-white text-[8px] px-1 py-0.5 rounded font-mono">
                              {item.sku || '-'}
                            </div>
                            {item.stock <= 0 && (
                              <div className="absolute inset-0 bg-red-900/40 backdrop-blur-[1px] flex items-center justify-center">
                                <span className="text-[10px] bg-red-500 text-white font-bold px-2 py-0.5 rounded shadow-sm rotate-[-10deg]">STOK HABIS</span>
                              </div>
                            )}
                          </div>
                          <div className="pt-1.5 flex flex-col flex-1">
                            <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight text-[11px] flex-1">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                              {item.stock} {data.units.find(u => u.id === item.unitId)?.name}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {filteredItems.map((item, idx) => {
                      const colorClass = colors[idx % colors.length];
                      const inCart = cart.find(c => c.id === item.id);
                      return (
                        <div 
                          key={item.id} 
                          onClick={() => { if (item.stock > 0) addToCart(item); }}
                          className={`bg-white dark:bg-slate-950 border rounded-lg p-2 flex items-center gap-2 relative overflow-hidden ${item.stock > 0 ? 'border-slate-200 dark:border-slate-800 cursor-pointer hover:shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group' : 'border-red-200 dark:border-red-900/50 cursor-not-allowed opacity-75 grayscale-[30%]'} ${inCart ? 'ring-1 ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`}
                        >
                          {inCart && (
                            <div className="absolute top-1 right-1 bg-indigo-600 text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full z-10 shadow-sm border-[1.5px] border-white dark:border-slate-900">
                              {inCart.inputQty}
                            </div>
                          )}
                          <div className={`w-10 h-10 rounded-md ${colorClass} flex items-center justify-center shrink-0 relative overflow-hidden`}>
                            <span className="text-xs font-bold text-white">{getInitials(item.name)}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate leading-tight">{item.name}</h4>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{item.sku || '-'}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                              {item.stock} {data.units.find(u => u.id === item.unitId)?.name}
                            </p>
                          </div>
                          
                          {item.stock <= 0 && (
                            <div className="absolute inset-0 bg-red-900/10 dark:bg-red-900/20 flex items-center justify-center pointer-events-none">
                               <span className="text-[10px] bg-red-500 text-white font-bold px-2 py-0.5 rounded shadow-sm">STOK HABIS</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
               <div className="p-4 border-b dark:border-slate-800 flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Cari riwayat berdasar no transaksi atau nama produk..." 
                      className="pl-9 h-11"
                      value={historySearch}
                      onChange={e => setHistorySearch(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={historyStartDate}
                      onChange={e => setHistoryStartDate(e.target.value)}
                      className="h-11 w-full sm:w-auto text-sm"
                      title="Tanggal Awal"
                    />
                    <Input
                      type="date"
                      value={historyEndDate}
                      onChange={e => setHistoryEndDate(e.target.value)}
                      className="h-11 w-full sm:w-auto text-sm"
                      title="Tanggal Akhir"
                    />
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-3">
                    {filteredHistoryGroups.map(group => {
                       const isExpanded = expandedGroupId === group.id;
                       
                       const totalItems = group.transactions.length;
                       const totalQty = group.transactions.reduce((sum, t) => sum + t.qty, 0);

                       return (
                         <div key={group.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-3">
                           <div 
                             className="flex justify-between items-start cursor-pointer group"
                             onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                           >
                             <div>
                               <div className="flex items-center gap-2 mb-1">
                                 <span className="text-xs font-bold font-mono bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded">
                                   {group.id.startsWith('POS-') ? group.id : group.id.split('-').slice(0,4).join('-')}
                                 </span>
                                 <span className="text-xs text-slate-500">
                                   {new Date(group.date).toLocaleString('id-ID')}
                                 </span>
                               </div>
                               <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                 {totalItems} Macam Barang Keluar
                               </h4>
                               <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{group.notes || '-'}</p>
<Button size="sm" variant="outline" className="mt-2 h-7 px-2 text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 border-rose-200 dark:border-rose-900" onClick={(e) => { e.stopPropagation(); exportNotaPdf(group); }}>
  <FileText className="w-3 h-3 mr-1" /> Export Nota
</Button>
                             </div>
                             <div className="text-right">
                               <div className="text-2xl font-black text-rose-500 dark:text-rose-400">
                                 -{totalQty}
                               </div>
                               <div className="text-xs font-bold text-slate-500">
                                 Total Qty
                               </div>
                             </div>
                           </div>
                           
                           {isExpanded && (
                             <div className="mt-3 divide-y dark:divide-slate-800/50 border-t dark:border-slate-800/50 pt-3">
                               {group.transactions.map(tx => {
                                  const item = data.items.find(i => i.id === tx.itemId);
                                  return (
                                    <div key={tx.id} className="py-3 flex justify-between items-center group/item hover:bg-white dark:hover:bg-slate-900 -mx-2 px-2 rounded transition-colors">
                                      <div className="flex-1">
                                        <div className="font-bold text-slate-800 dark:text-slate-200">{item?.name || 'Unknown Item'}</div>
                                        <div className="text-[10px] uppercase font-mono text-slate-400">{tx.id}</div>
                                      </div>
                                      <div className="text-right mr-4 font-bold text-rose-500 shrink-0">
                                        -{tx.displayQty || tx.qty} {data.units.find(u => u.id === (tx.displayUnitId || item?.unitId))?.name || ''}
                                        {tx.displayQty && tx.displayQty !== tx.qty && (
                                           <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                             Total: {tx.qty} {data.units.find(u => u.id === item?.unitId)?.name}
                                           </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity">
                                         <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={(e) => { e.stopPropagation(); setReturnTxModal({ id: tx.id, maxQty: tx.displayQty || tx.qty, qty: 1 }); }} title="Retur">
                                           <RotateCcw className="w-4 h-4" />
                                         </Button>
                                         <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={(e) => { e.stopPropagation(); setEditTxModal({ id: tx.id, qty: tx.displayQty || tx.qty }); }} title="Edit Qty">
                                           <Edit className="w-4 h-4" />
                                         </Button>
                                         <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDeleteHistory(tx); }} title="Hapus">
                                           <Trash2 className="w-4 h-4" />
                                         </Button>
                                      </div>
                                    </div>
                                  )
                               })}
                             </div>
                           )}
                         </div>
                       )
                    })}
                    {filteredHistoryGroups.length === 0 && (
                      <div className="text-center py-10 text-slate-500">Tidak ada riwayat transaksi keluar.</div>
                    )}
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Right Pane - Cart */}
        <div className={`flex-1 min-h-0 w-full lg:max-w-[400px] lg:min-w-[320px] bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex-col shrink-0 lg:shrink ${mobileView === 'cart' && viewMode === 'pos' ? 'flex' : 'hidden lg:flex'}`}>
          {/* Cart Section Header with Excel Import/Template triggers */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/40 rounded-t-xl shrink-0">
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-sans">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              Keranjang POS ({cart.length})
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={downloadPosTemplate}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-1 rounded transition-colors uppercase tracking-wider cursor-pointer"
                title="Unduh Template Excel POS"
              >
                Template
              </button>
              <label className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-55 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-1 rounded cursor-pointer transition-colors uppercase tracking-wider block">
                <span>Import</span>
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handlePosExcelImport} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>
          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                 <CreditCard className="w-16 h-16 opacity-20" />
                 <p className="font-medium text-sm">Belum ada barang dipilih</p>
               </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex gap-3 justify-between items-start border-b dark:border-slate-800 pb-3">
                   <div className="flex-1">
                     <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{item.name}</h4>
                     {/* Batch Selector Dropdown */}
                     <div className="mt-2 text-[11px]">
                       <label className="block text-[9px] text-indigo-600 dark:text-indigo-400 font-bold mb-0.5">Pilih Batch:</label>
                       <select
                         value={item.selectedBatch || 'unbatched'}
                         onChange={(e) => updateCartBatch(item.id, e.target.value)}
                         className="flex h-7 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200"
                       >
                         <option value="unbatched">
                           Tanpa Batch / Umum (Stok: {item.stock})
                         </option>
                         {item.batches?.map(b => (
                           <option key={b.batchNumber} value={b.batchNumber}>
                             Batch: {b.batchNumber} (Stok: {b.stock ?? 0}{b.expiryDate ? `, Exp: ${b.expiryDate}` : ''})
                           </option>
                         ))}
                       </select>
                     </div>
                     <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 font-mono">
                       SKU: {item.sku || '-'}
                     </p>
                     {item.alternateUnits && item.alternateUnits.length > 0 ? (
                        <select
                          value={item.selectedUnitId}
                          onChange={(e) => updateCartUnit(item.id, e.target.value)}
                          className="mt-2 flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 font-medium text-slate-600"
                        >
                           <option value={item.unitId}>{data.units.find(u => u.id === item.unitId)?.name || 'Satuan Utama'}</option>
                           {item.alternateUnits.map(au => (
                             <option key={au.unitId} value={au.unitId}>{data.units.find(u => u.id === au.unitId)?.name || 'Satuan Alternatif'}</option>
                           ))}
                        </select>
                      ) : (
                        <div className="text-xs font-medium text-slate-500 mt-2 px-1">
                          {data.units.find(u => u.id === item.unitId)?.name || 'Satuan'}
                        </div>
                      )}
                   </div>
                   <div className="flex flex-col items-end gap-1 h-full">
                     <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 p-1.5 rounded-md self-end mb-2 transition-colors">
                       <Trash2 className="w-3.5 h-3.5" />
                     </button>
                     <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mt-auto">
                       <button onClick={() => updateCartQty(item.id, item.inputQty - 1)} className="w-7 h-7 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded hover:shadow-sm">-</button>
                       <Input 
                         type="number"
                         className="w-10 sm:w-14 h-7 text-center font-bold px-1 py-0 appearance-none bg-transparent border-none focus:ring-0 focus:outline-none dark:text-white" 
                         value={item.inputQty === 0 ? 0 : (item.inputQty || '')}
                         onChange={e => {
                           const val = parseInt(e.target.value);
                           if (!isNaN(val)) {
                             updateCartQty(item.id, val);
                           } else {
                             updateCartQty(item.id, 0);
                           }
                         }}
                         min={0}
                       />
                       <button onClick={() => updateCartQty(item.id, item.inputQty + 1)} className="w-7 h-7 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded hover:shadow-sm">+</button>
                     </div>
                     {item.cartQty !== item.inputQty && (
                       <div className="text-[10px] text-slate-500 mt-1 font-mono text-center w-full">
                         = {item.cartQty} {data.units.find(u => u.id === item.unitId)?.name}
                       </div>
                     )}
                   </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout Panel */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3 rounded-b-xl">
            <Button 
              onClick={handleCheckout}
              disabled={cart.length === 0 || cart.every(item => item.cartQty === 0)}
              className="w-full h-14 mt-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg rounded-xl shadow-md border-b-4 border-indigo-700 hover:mt-3 hover:mb-[-4px] hover:border-b-0 active:border-b-0 transition-all flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <Save className="w-5 h-5" /> SIMPAN
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Edit TX Modal */}
      {editTxModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 shadow-2xl">
            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-100 flex items-center justify-between">
              Edit Qty Transaksi
              <button onClick={() => setEditTxModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">New Qty</label>
              <Input 
                type="number" 
                min="1"
                value={editTxModal.qty} 
                onChange={e => setEditTxModal({ ...editTxModal, qty: Number(e.target.value) })} 
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleEditHistory} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Simpan Perubahan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Return TX Modal */}
      {returnTxModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 shadow-2xl">
             <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-100 flex items-center justify-between">
              Retur Transaksi
              <button onClick={() => setReturnTxModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Qty Retur (Max: {returnTxModal.maxQty})</label>
              <Input 
                type="number" 
                min="1"
                max={returnTxModal.maxQty}
                value={returnTxModal.qty} 
                onChange={e => setReturnTxModal({ ...returnTxModal, qty: Number(e.target.value) })} 
              />
            </div>
             <div className="flex justify-end pt-2">
              <Button onClick={handleReturnHistory} className="bg-orange-600 hover:bg-orange-700 text-white">
                Proses Retur
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
