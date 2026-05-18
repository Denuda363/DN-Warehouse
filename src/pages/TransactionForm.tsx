import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PackagePlus, PackageMinus, CheckCircle2 } from 'lucide-react';

export const TransactionForm: React.FC<{ type: 'IN' | 'OUT' }> = ({ type }) => {
  const { data, updateData, currentUser } = useAppContext();
  
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId || !qty || Number(qty) <= 0) return;
    if (type === 'OUT') {
      const item = data.items.find(i => i.id === itemId);
      if (item && item.stock < Number(qty)) {
        alert("Stok tidak mencukupi!");
        return;
      }
    }

    const newTx = {
      id: `tx-${Date.now()}`,
      date: new Date().toISOString(),
      type,
      itemId,
      qty: Number(qty),
      supplierId: type === 'IN' ? supplierId : undefined,
      notes,
      userId: currentUser?.id || 'unknown',
    };

    const newItems = data.items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          stock: type === 'IN' ? item.stock + Number(qty) : item.stock - Number(qty)
        };
      }
      return item;
    });

    updateData({
      transactions: [newTx, ...data.transactions],
      items: newItems
    });

    setSuccess(true);
    setItemId('');
    setQty('');
    setSupplierId('');
    setNotes('');
    
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-xl ${type === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
          {type === 'IN' ? <PackagePlus className="w-6 h-6" /> : <PackageMinus className="w-6 h-6" />}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {type === 'IN' ? 'Barang Datang (Inbound)' : 'Pengeluaran Barang (Outbound)'}
          </h1>
          <p className="text-slate-500 text-sm">Catat aktivitas {type === 'IN' ? 'pemasukan' : 'pengeluaran'} barang gudang.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {success && (
            <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Transaksi berhasil dicatat dan stok telah diupdate.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pilih Barang</label>
              <select 
                title="Pilih Barang"
                required
                value={itemId}
                onChange={e => setItemId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="">-- Pilih Barang --</option>
                {data.items.map(item => (
                  <option key={item.id} value={item.id}>
                    [{item.sku}] {item.name} - Stok Saat Ini: {item.stock}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Jumlah (Qty)</label>
              <Input 
                title="Qty"
                type="number" 
                min="1" 
                required 
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="0"
              />
            </div>

            {type === 'IN' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Supplier (Opsional)</label>
                <select 
                  title="Supplier"
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                >
                  <option value="">-- Pilih Supplier --</option>
                  {data.suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Catatan / Keterangan</label>
              <textarea 
                title="Notes"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                placeholder="Tambahkan keterangan jika perlu..."
              />
            </div>

            <Button type="submit" className={`w-full h-12 text-base ${type === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'} text-white mt-4`}>
              Simpan Transaksi
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
