import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { Item } from '../types';

type InvoiceItemForm = {
  item: Item | null;
  qty: number;
  selectedUnitId: string;
  price: number;
  discountType: 'Rp' | '%';
  discountValue: number;
  batchNo: string;
  expDate: string;
};

type InvoiceItem = {
  id: string; // temp id for the list
  item: Item;
  qty: number;
  selectedUnitId: string;
  price: number;
  discountType: 'Rp' | '%';
  discountValue: number;
  batchNo: string;
  expDate: string;
  subtotal: number;
};

export const PurchaseInvoiceForm: React.FC<{ editInvoiceId?: string, onComplete?: () => void }> = ({ editInvoiceId, onComplete }) => {
  const { data, updateData, currentUser } = useAppContext();

  const currentUserCategories = currentUser?.allowedCategoryIds || [];
  const hasCategoryRestriction = currentUser?.role !== 'ADMIN' && currentUserCategories.length > 0;
  const filteredItems = hasCategoryRestriction 
    ? data.items.filter(item => currentUserCategories.includes(item.categoryId))
    : data.items;
  
  const [success, setSuccess] = useState(false);
  
  // Header state
  const [invoiceNo, setInvoiceNo] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouse, setWarehouse] = useState('Toko Depan');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Tunai (Lunas)');
  const [dueDays, setDueDays] = useState(0);

  // Form input state
  const [currentItem, setCurrentItem] = useState<InvoiceItemForm>({
    item: null,
    qty: 1,
    selectedUnitId: '',
    price: 0,
    discountType: 'Rp',
    discountValue: 0,
    batchNo: '',
    expDate: ''
  });

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  
  // Footer state
  const [invoiceDiscType, setInvoiceDiscType] = useState<'Rp' | '%'>('Rp');
  const [invoiceDiscValue, setInvoiceDiscValue] = useState(0);
  const [useTax, setUseTax] = useState(false);
  const [taxPercent, setTaxPercent] = useState(11);
  const [paidAmount, setPaidAmount] = useState(0);

  React.useEffect(() => {
    if (editInvoiceId) {
      const inv = data.purchaseInvoices.find(i => i.id === editInvoiceId);
      if (inv) {
        setInvoiceNo(inv.invoiceNo);
        setSupplierId(inv.supplierId);
        setWarehouse(inv.warehouse);
        setInvoiceDate(inv.invoiceDate);
        setPaymentMethod(inv.paymentMethod);
        setDueDays(inv.dueDays);
        setInvoiceDiscType(inv.invoiceDiscType);
        setInvoiceDiscValue(inv.invoiceDiscValue);
        setUseTax(inv.useTax);
        setTaxPercent(inv.taxPercent);
        setPaidAmount(inv.paidAmount);
        
        const loadedItems: InvoiceItem[] = inv.items.map(i => {
           const product = data.items.find(pi => pi.id === i.itemId);
           return {
             id: i.id,
             item: product!,
             qty: i.qty,
             selectedUnitId: i.selectedUnitId || product!.unitId,
             price: i.price,
             discountType: i.discountType,
             discountValue: i.discountValue,
             batchNo: i.batchNo,
             expDate: i.expDate,
             subtotal: i.subtotal,
           };
        }).filter(i => i.item !== undefined);
        setInvoiceItems(loadedItems);
      }
    }
  }, [editInvoiceId, data.purchaseInvoices, data.items]);

  const calculateDueDate = () => {
    const d = new Date(invoiceDate);
    d.setDate(d.getDate() + (dueDays || 0));
    return d.toISOString().split('T')[0];
  };

  const handleAddItem = () => {
    if (!currentItem.item) return;
    
    let discount = currentItem.discountValue || 0;
    if (currentItem.discountType === '%') {
      discount = (currentItem.price * discount) / 100;
    }
    const unitPriceAfterDisc = currentItem.price - discount;
    const itemSubtotal = unitPriceAfterDisc * currentItem.qty;

    setInvoiceItems([...invoiceItems, {
      id: Math.random().toString(36).substr(2, 9),
      item: currentItem.item,
      qty: currentItem.qty,
      selectedUnitId: currentItem.selectedUnitId || currentItem.item.unitId,
      price: currentItem.price,
      discountType: currentItem.discountType,
      discountValue: currentItem.discountValue,
      batchNo: currentItem.batchNo,
      expDate: currentItem.expDate,
      subtotal: itemSubtotal
    }]);

    // Reset Form
    setCurrentItem({
      item: null,
      qty: 1,
      selectedUnitId: '',
      price: 0,
      discountType: 'Rp',
      discountValue: 0,
      batchNo: '',
      expDate: ''
    });
  };

  const handleRemoveItem = (id: string) => {
    setInvoiceItems(invoiceItems.filter(i => i.id !== id));
  };

  // Calculations
  const rawSubtotal = invoiceItems.reduce((acc, curr) => acc + curr.subtotal, 0);
  let globalDiscount = invoiceDiscValue || 0;
  if (invoiceDiscType === '%') {
    globalDiscount = (rawSubtotal * invoiceDiscValue) / 100;
  }
  const taxableAmount = rawSubtotal - globalDiscount;
  const taxAmount = useTax ? (taxableAmount * taxPercent) / 100 : 0;
  const finalTotal = taxableAmount + taxAmount;

  const handleSave = () => {
    if (invoiceItems.length === 0) return;

    // If edit mode, first revert old stock and remove old transactions related to it
    let currentItemsState = [...data.items];
    let currentTransactionsState = [...data.transactions];
    let currentInvoicesState = [...data.purchaseInvoices];

    if (editInvoiceId) {
      const oldInvoice = data.purchaseInvoices.find(i => i.id === editInvoiceId);
      if (oldInvoice) {
        // Revert old stock
        oldInvoice.items.forEach(oldItem => {
          currentItemsState = currentItemsState.map(p => {
             // We only revert the stock that was originally added, excluding returns
             if (p.id === oldItem.itemId) {
               const bQty = oldItem.baseQty || oldItem.qty;
               const returned = oldItem.returnedQty || 0; // assuming this is already base unit or needs checking? Let's assume returnedQty is base.
               return { ...p, stock: p.stock - (bQty - returned) };
             }
             return p;
          });
        });
        // Remove old transactions generated by this invoice (if necessary, though appending is closer to accounting. We will append a new transaction).
        // Let's just create new transactions for the difference, but it's simpler to just add a "Correction" transaction, or just update the old dataset. We'll update dataset.
        currentInvoicesState = currentInvoicesState.filter(i => i.id !== editInvoiceId);
        currentTransactionsState = currentTransactionsState.filter(t => t.invoiceId !== editInvoiceId);
      }
    }

    const invoiceId = editInvoiceId || `inv-${Date.now()}`;

    const getBaseQty = (itemId: string, selectedUnitId: string | undefined, qty: number) => {
      const item = data.items.find(i => i.id === itemId);
      if (!item || !selectedUnitId || item.unitId === selectedUnitId) return qty;
      const alt = item.alternateUnits?.find(u => u.unitId === selectedUnitId);
      return alt ? qty * alt.conversionRate : qty;
    };

    const newInvoice: import('../types').PurchaseInvoice = {
      id: invoiceId,
      invoiceNo: invoiceNo || `INV/${Date.now()}`,
      supplierId,
      warehouse,
      invoiceDate,
      paymentMethod,
      dueDays,
      invoiceDiscType,
      invoiceDiscValue,
      useTax,
      taxPercent,
      paidAmount,
      items: invoiceItems.map(i => {
        // If editing, preserve returnedQty if the item existed
        const oldInvItem = editInvoiceId ? data.purchaseInvoices.find(inv => inv.id === editInvoiceId)?.items.find(oi => oi.itemId === i.item.id) : null;
        const bQty = getBaseQty(i.item.id, i.selectedUnitId, i.qty);
        return {
          id: i.id,
          itemId: i.item.id,
          qty: i.qty,
          baseQty: bQty,
          selectedUnitId: i.selectedUnitId,
          conversionRate: bQty / i.qty,
          returnedQty: oldInvItem ? oldInvItem.returnedQty : 0,
          price: i.price,
          discountType: i.discountType,
          discountValue: i.discountValue,
          batchNo: i.batchNo,
          expDate: i.expDate,
          subtotal: i.subtotal,
        };
      }),
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      total: finalTotal,
    };

    // Create transactions for each item
    const newTransactions = newInvoice.items.map(invItem => ({
      id: `tx-in-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: invoiceDate,
      type: 'IN' as const,
      itemId: invItem.itemId,
      qty: invItem.baseQty || invItem.qty,
      displayUnitId: invItem.selectedUnitId,
      displayQty: invItem.qty,
      conversionRate: invItem.conversionRate,
      supplierId: supplierId || undefined,
      notes: `Invoice ${editInvoiceId ? 'Edit' : 'Baru'}: ${newInvoice.invoiceNo} (Batch: ${invItem.batchNo || '-'})`,
      userId: currentUser?.id || 'unknown',
      invoiceId,
    }));

    // Update stock with new items
    newInvoice.items.forEach(invItem => {
      const bQty = invItem.baseQty || invItem.qty;
      const returnedQty = invItem.returnedQty || 0;
      
      currentItemsState = currentItemsState.map(item => {
        if (item.id === invItem.itemId) {
          return { ...item, stock: item.stock + (bQty - returnedQty) };
        }
        return item;
      });
    });

    updateData({
      purchaseInvoices: [newInvoice, ...currentInvoicesState],
      transactions: [...newTransactions, ...currentTransactionsState],
      items: currentItemsState
    });

    setSuccess(true);
    if (!editInvoiceId) {
      setInvoiceItems([]);
      setInvoiceNo('');
    }
    
    setTimeout(() => {
       setSuccess(false);
       if (onComplete) onComplete();
    }, 1500);
  };

  const formatRp = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
          Simpan Transaksi
        </Button>
      </div>

      {success && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400">
          <CheckCircle2 className="w-5 h-5 mr-2" />
          Faktur Pembelian berhasil dicatat dan stok telah diupdate.
        </div>
      )}

      <Card className="rounded-xl shadow-lg border-slate-200 dark:border-slate-800">
        <CardContent className="p-6">
          
          {/* Header Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">NO. FAKTUR SUPPLIER</label>
                <Input 
                  value={invoiceNo}
                  onChange={e => setInvoiceNo(e.target.value)}
                  placeholder="INV/2024/..." 
                  className="bg-slate-50 dark:bg-slate-900 focus-visible:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">TANGGAL FAKTUR</label>
                <Input 
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">SUPPLIER</label>
                <SearchableSelect 
                  options={data.suppliers.map(sup => ({ value: sup.id, label: sup.name }))}
                  value={supplierId}
                  onChange={setSupplierId}
                  placeholder="Cari supplier..."
                  buttonClassName="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-within:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">CARA BAYAR</label>
                <select 
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                >
                  <option>Tunai (Lunas)</option>
                  <option>Tempo / Kredit</option>
                  <option>Transfer Bank</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">GUDANG PENERIMA</label>
                <select 
                  value={warehouse}
                  onChange={e => setWarehouse(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                >
                  <option>Toko Depan</option>
                  <option>Gudang Utama</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">JATUH TEMPO</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input 
                      type="number"
                      min="0"
                      value={dueDays}
                      onChange={e => setDueDays(Number(e.target.value))}
                      className="bg-slate-50 dark:bg-slate-900 text-center pr-10 focus-visible:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium uppercase">Hari</span>
                  </div>
                  <Input 
                    type="date"
                    readOnly
                    value={calculateDueDate()}
                    className="flex-[2] bg-slate-100 dark:bg-slate-800 text-slate-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Add Item Section */}
          <div className="border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl p-4 mb-8">
            <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-4">TAMBAH BARANG KE FAKTUR</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:flex xl:flex-nowrap gap-3 items-end">
              <div className="sm:col-span-2 lg:col-span-2 xl:flex-[3] xl:min-w-[200px]">
                <SearchableSelect
                  options={filteredItems.map(item => ({ value: item.id, label: `[${item.sku}] ${item.name}` }))}
                  value={currentItem.item?.id || ''}
                  onChange={val => {
                    const item = data.items.find(i => i.id === val);
                    setCurrentItem({ ...currentItem, item: item || null });
                  }}
                  placeholder="Cari barang..."
                  buttonClassName="border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:ring-emerald-500"
                />
              </div>
              <div className="xl:w-20">
                <Input 
                  type="number" 
                  min="1" 
                  value={currentItem.qty}
                  onChange={e => setCurrentItem({...currentItem, qty: Number(e.target.value)})}
                  placeholder="Qty" 
                  className="text-center focus-visible:ring-emerald-500 border-emerald-200 dark:border-slate-700" 
                />
              </div>
              {currentItem.item && (
                 <div className="xl:w-28">
                   <select 
                     value={currentItem.selectedUnitId || currentItem.item.unitId}
                     onChange={e => setCurrentItem({...currentItem, selectedUnitId: e.target.value})}
                     className="flex h-10 w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
                   >
                     <option value={currentItem.item.unitId}>{data.units.find(u => u.id === currentItem.item?.unitId)?.name || 'Unit'}</option>
                     {currentItem.item.alternateUnits?.map(au => (
                       <option key={au.unitId} value={au.unitId}>{data.units.find(u => u.id === au.unitId)?.name || au.unitId}</option>
                     ))}
                   </select>
                 </div>
              )}
              <div className="xl:flex-[2] xl:min-w-[120px]">
                <Input 
                  type="number" 
                  min="0" 
                  value={currentItem.price || ''}
                  onChange={e => setCurrentItem({...currentItem, price: Number(e.target.value)})}
                  placeholder="Harga Beli" 
                  className="focus-visible:ring-emerald-500 border-emerald-200 dark:border-slate-700"
                />
              </div>
              <div className="flex gap-1 xl:flex-[2] xl:min-w-[150px]">
                <select 
                  value={currentItem.discountType}
                  onChange={e => setCurrentItem({...currentItem, discountType: e.target.value as 'Rp' | '%'})}
                  className="w-16 h-10 rounded-md border border-emerald-200 bg-slate-50 px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="Rp">Rp</option>
                  <option value="%">%</option>
                </select>
                <Input 
                  type="number" 
                  min="0" 
                  value={currentItem.discountValue || ''}
                  onChange={e => setCurrentItem({...currentItem, discountValue: Number(e.target.value)})}
                  placeholder="Disc" 
                  className="flex-1 focus-visible:ring-emerald-500 border-emerald-200 dark:border-slate-700"
                />
              </div>
              <div className="xl:flex-[2] xl:min-w-[120px]">
                <Input 
                  placeholder="No. Batch" 
                  value={currentItem.batchNo}
                  onChange={e => setCurrentItem({...currentItem, batchNo: e.target.value})}
                  className="focus-visible:ring-emerald-500 border-emerald-200 dark:border-slate-700" 
                />
              </div>
              <div className="xl:flex-[2] xl:min-w-[130px]">
                <Input 
                  type="date" 
                  value={currentItem.expDate}
                  onChange={e => setCurrentItem({...currentItem, expDate: e.target.value})}
                  className="text-sm focus-visible:ring-emerald-500 border-emerald-200 dark:border-slate-700 text-slate-500 min-w-0" 
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4 xl:col-span-1">
                <Button 
                  onClick={handleAddItem}
                  disabled={!currentItem.item}
                  className="w-full xl:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-6 rounded-md shadow-sm"
                >
                  Tambah
                </Button>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto mb-8">
            <table className="w-full text-sm text-left min-w-[800px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">NAMA BARANG</th>
                  <th className="px-4 py-3 text-center">QTY</th>
                  <th className="px-4 py-3 text-right">HARGA SATUAN</th>
                  <th className="px-4 py-3 text-right">DISKON</th>
                  <th className="px-4 py-3 text-right">SUBTOTAL</th>
                  <th className="px-4 py-3 text-center w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-300">
                {invoiceItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/20 italic">
                      Belum ada barang ditambahkan.
                    </td>
                  </tr>
                ) : (
                  invoiceItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-medium">
                        {item.item.name}
                        {item.batchNo && <div className="text-xs text-slate-500 font-normal">Batch: {item.batchNo}</div>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.qty} {data.units.find(u => u.id === item.selectedUnitId)?.name || ''}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">Rp {formatRp(item.price)}</td>
                      <td className="px-4 py-3 text-right text-red-500 font-mono text-xs">
                        {item.discountValue > 0 ? (item.discountType === 'Rp' ? `Rp ${formatRp(item.discountValue)}` : `${item.discountValue}%`) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                        Rp {formatRp(item.subtotal)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleRemoveItem(item.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Totals Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Left Options */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 w-32">Diskon Faktur</label>
                <div className="flex gap-2 flex-1">
                  <select 
                    value={invoiceDiscType}
                    onChange={e => setInvoiceDiscType(e.target.value as 'Rp' | '%')}
                    className="w-20 h-10 rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="Rp">Rp</option>
                    <option value="%">%</option>
                  </select>
                  <Input 
                    type="number" 
                    min="0"
                    value={invoiceDiscValue || ''}
                    onChange={e => setInvoiceDiscValue(Number(e.target.value))}
                    className="flex-1 focus-visible:ring-emerald-500" 
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 w-32">Pajak (PPN)</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="checkbox" 
                    checked={useTax}
                    onChange={e => setUseTax(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                  />
                  <Input 
                    type="number" 
                    min="0" 
                    disabled={!useTax}
                    value={taxPercent}
                    onChange={e => setTaxPercent(Number(e.target.value))}
                    className="w-20 focus-visible:ring-emerald-500 text-center" 
                  />
                  <span className="font-bold text-slate-500">%</span>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <label className="text-sm font-bold text-emerald-700 dark:text-emerald-400 w-32">Sudah Dibayar</label>
                <div className="flex gap-2 flex-1 relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">Rp</span>
                  <Input 
                    type="number" 
                    min="0"
                    value={paidAmount || ''}
                    onChange={e => setPaidAmount(Number(e.target.value))}
                    className="flex-1 pl-10 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/50 focus-visible:ring-emerald-500 font-bold" 
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Right Totals Box */}
            <div className="bg-[#0b1328] rounded-xl p-6 text-white shadow-xl rotate-1 hover:rotate-0 transition-transform">
              <div className="space-y-3 font-mono">
                <div className="flex justify-between items-center text-sm text-slate-400">
                  <span className="font-bold tracking-wider">SUBTOTAL</span>
                  <span>RP {formatRp(rawSubtotal)}</span>
                </div>
                {globalDiscount > 0 && (
                  <div className="flex justify-between items-center text-sm text-red-400">
                    <span className="font-bold tracking-wider">DISKON</span>
                    <span>- RP {formatRp(globalDiscount)}</span>
                  </div>
                )}
                {useTax && (
                  <div className="flex justify-between items-center text-sm text-slate-300">
                    <span className="font-bold tracking-wider">PAJAK</span>
                    <span>RP {formatRp(taxAmount)}</span>
                  </div>
                )}
                <div className="border-t border-slate-700/50 my-4 pt-4"></div>
                <div className="flex justify-between items-center text-xl sm:text-2xl font-bold text-emerald-400">
                  <span className="tracking-wider">TOTAL</span>
                  <span>Rp {formatRp(finalTotal)}</span>
                </div>
              </div>
            </div>

          </div>

        </CardContent>
      </Card>
    </div>
  );
};
