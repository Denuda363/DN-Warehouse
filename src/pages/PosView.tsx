import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, History, UserSquare, Users, CreditCard, ScanLine, Save, ArrowLeft, Edit, Trash2, RotateCcw, X, FileText } from 'lucide-react';
import { Item, Transaction } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type CartItem = Item & {
  cartQty: number; // total base units
  inputQty: number; // qty in selected unit
  selectedUnitId: string;
};

export const PosView: React.FC = () => {
  const { data, updateData, currentUser } = useAppContext();
  const [activeCategory, setActiveCategory] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const [viewMode, setViewMode] = useState<'pos' | 'history'>('pos');
  const [penyedia, setPenyedia] = useState<string>('');
  const [historySearch, setHistorySearch] = useState('');
  const [editTxModal, setEditTxModal] = useState<{ id: string, qty: number } | null>(null);
  const [returnTxModal, setReturnTxModal] = useState<{ id: string, qty: number, maxQty: number } | null>(null);

  const [txDate, setTxDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [historyDateFilter, setHistoryDateFilter] = useState<'today' | '7days' | 'all'>('today');

  const colors = [
    'bg-amber-400', 'bg-lime-400', 'bg-purple-600', 'bg-stone-400',
    'bg-emerald-700', 'bg-cyan-500', 'bg-rose-200', 'bg-red-500', 'bg-sky-200'
  ];

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

  const getConversionRate = (item: Item, unitId: string) => {
     if (unitId === item.unitId) return 1;
     const alt = item.alternateUnits?.find(u => u.unitId === unitId);
     return alt ? alt.conversionRate : 1;
  };

  const addToCart = (item: Item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        if (existing.cartQty >= item.stock) return prev; // Cannot add more than stock
        const newCartQty = existing.cartQty + 1 * getConversionRate(item, existing.selectedUnitId);
        if (newCartQty > item.stock) return prev;
        return prev.map(i => i.id === item.id ? { ...i, inputQty: i.inputQty + 1, cartQty: newCartQty } : i);
      }
      if (item.stock < 1) return prev;
      return [...prev, { ...item, inputQty: 1, cartQty: 1, selectedUnitId: item.unitId }];
    });
  };

  const updateCartQty = (id: string, qty: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const conversion = getConversionRate(i, i.selectedUnitId);
        const maxInputQty = Math.floor(i.stock / conversion);
        const validQty = Math.max(1, Math.min(qty, maxInputQty));
        return { ...i, inputQty: validQty, cartQty: validQty * conversion };
      }
      return i;
    }));
  };

  const updateCartUnit = (id: string, unitId: string) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const conversion = getConversionRate(i, unitId);
        const maxInputQty = Math.floor(i.stock / conversion);
        const validQty = Math.min(i.inputQty, maxInputQty);
        return { ...i, selectedUnitId: unitId, inputQty: validQty, cartQty: validQty * conversion };
      }
      return i;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    const groupId = `POS-${Date.now()}`;
    const now = new Date();
    const timeString = now.toISOString().substring(11); // e.g. "12:00:00.000Z"
    const date = `${txDate}T${timeString}`;

    // Create transactions for each out
    const newTxs: Transaction[] = cart.map(item => ({
      id: `tx-out-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      groupId,
      date,
      type: 'OUT',
      itemId: item.id,
      qty: item.cartQty,
      displayUnitId: item.selectedUnitId,
      displayQty: item.inputQty,
      conversionRate: getConversionRate(item, item.selectedUnitId),
      notes: penyedia ? `Penyedia: ${penyedia}` : 'POS Transaction',
      userId: currentUser?.id || 'unknown'
    }));

    // Deduct stock
    const newItems = data.items.map(item => {
      const inCart = cart.find(c => c.id === item.id);
      if (inCart) {
        return { ...item, stock: item.stock - inCart.cartQty };
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
    if (historyDateFilter === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      if (!group.date.startsWith(today)) return false;
    } else if (historyDateFilter === '7days') {
      const groupDate = new Date(group.date);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (groupDate < sevenDaysAgo) return false;
    }

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
    doc.text(profile?.name || 'GudangSync', 14, 20);
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
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4 -mx-4 -mt-4 lg:m-0 p-4 bg-slate-100 dark:bg-slate-900 lg:rounded-xl overflow-hidden shadow-sm">
      <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden min-h-0">
        {/* Left Pane - Products */}
        <div className="flex-[2] flex flex-col gap-4 min-w-0 pb-4 lg:pb-0 overflow-y-auto lg:overflow-hidden">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
            <div className="relative flex-1">
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
            <div className="relative w-40">
              <Input 
                type="date"
                value={txDate}
                onChange={e => setTxDate(e.target.value)}
                className="h-10 bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
              />
            </div>
            {viewMode === 'pos' && (
               <Button variant="outline" className="h-10 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setViewMode('history')}>
                 <History className="w-4 h-4 mr-2" /> Riwayat List
               </Button>
            )}
            {viewMode === 'history' && (
               <>
                 <Button variant="outline" className="h-10 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950" onClick={exportPosHistoryPdf}>
                   <FileText className="w-4 h-4 mr-2" /> Export PDF
                 </Button>
                 <Button variant="outline" className="h-10 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setViewMode('pos')}>
                   <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke POS
                 </Button>
               </>
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

              {/* Categories */}
              <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 hide-scrollbar pt-1">
                <button
                  onClick={() => setActiveCategory('Semua')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors shadow-sm ${
                    activeCategory === 'Semua' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800'
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
                    className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors shadow-sm ${
                      activeCategory === cat.name ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Product Grid */}
              <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-inner">
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {filteredItems.map((item, idx) => {
                    const colorClass = colors[idx % colors.length];
                    const price = item.sellingPrice || 15000; // Mock default
                    
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => addToCart(item)}
                        className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex flex-col group"
                      >
                        <div className={`h-24 ${colorClass} m-2 rounded-lg flex items-center justify-center relative overflow-hidden group-hover:opacity-90 transition-opacity`}>
                          <span className="text-3xl font-bold text-white/90 drop-shadow-sm">{getInitials(item.name)}</span>
                          {/* Optional: label pill */}
                          {idx % 5 === 0 && (
                             <div className="absolute top-1 right-1 bg-green-500 text-white text-[9px] font-bold px-1.5 rounded-sm">Okt 27</div>
                          )}
                        </div>
                        <div className="p-2 pt-1 flex flex-col flex-1 text-sm">
                          <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight flex-1">
                            {item.name}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="font-bold text-indigo-600 dark:text-indigo-400">
                              Rp <br className="hidden lg:block"/>
                              {new Intl.NumberFormat('id-ID').format(price)}
                            </div>
                            <div className="bg-slate-100 text-slate-500 dark:bg-slate-800 text-[10px] font-bold px-2 py-1 rounded">
                              {item.stock}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
               <div className="p-4 border-b dark:border-slate-800 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Cari riwayat berdasar no transaksi atau nama produk..." 
                      className="pl-9 h-11"
                      value={historySearch}
                      onChange={e => setHistorySearch(e.target.value)}
                    />
                  </div>
                  <select 
                    value={historyDateFilter} 
                    onChange={e => setHistoryDateFilter(e.target.value as any)}
                    className="flex h-11 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 font-medium"
                  >
                    <option value="today">Hari Ini</option>
                    <option value="7days">7 Hari Terakhir</option>
                    <option value="all">Semua Transaksi</option>
                  </select>
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
        <div className="flex-1 w-full lg:max-w-[400px] lg:min-w-[320px] bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col shrink-0 lg:shrink">
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
                     <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm mt-1">
                       Rp {new Intl.NumberFormat('id-ID').format(item.sellingPrice || 15000)}
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
                   <div className="flex flex-col items-center gap-1">
                     <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                       <button onClick={() => updateCartQty(item.id, item.inputQty - 1)} className="w-7 h-7 flex items-center justify-center font-bold text-slate-600 hover:bg-white rounded hover:shadow-sm">-</button>
                       <Input 
                         type="number"
                         className="w-14 h-7 text-center font-bold px-1 py-0 appearance-none bg-transparent border-none focus:ring-0 focus:outline-none" 
                         value={item.inputQty || ''}
                         onChange={e => {
                           const val = parseInt(e.target.value);
                           if (!isNaN(val)) updateCartQty(item.id, val);
                         }}
                         min={1}
                       />
                       <button onClick={() => updateCartQty(item.id, item.inputQty + 1)} className="w-7 h-7 flex items-center justify-center font-bold text-slate-600 hover:bg-white rounded hover:shadow-sm">+</button>
                     </div>
                     {item.cartQty !== item.inputQty && (
                       <div className="text-[10px] text-slate-500 mt-1 font-mono">
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
              disabled={cart.length === 0}
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
