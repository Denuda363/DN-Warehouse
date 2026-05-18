import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { Card } from '../components/ui/Card';
import { Search, ArrowDownRight, ArrowUpRight, Download } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const Report: React.FC = () => {
  const { data } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  
  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-120px)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Arus Stok</h1>
          <p className="text-slate-500 text-sm">Riwayat seluruh transaksi keluar dan masuk.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-slate-700 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-300">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari transaksi..." 
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 sticky top-0 border-b dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium w-48">Tanggal</th>
                <th className="px-6 py-4 font-medium w-32">Jenis</th>
                <th className="px-6 py-4 font-medium">Barang</th>
                <th className="px-6 py-4 font-medium text-right w-32">Qty</th>
                <th className="px-6 py-4 font-medium">Keterangan</th>
                <th className="px-6 py-4 font-medium w-32">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {data.transactions
                .filter(t => {
                  const item = data.items.find(i => i.id === t.itemId);
                  const searchStr = `${item?.name || ''} ${t.notes} ${t.type}`.toLowerCase();
                  return searchStr.includes(searchTerm.toLowerCase());
                })
                .map(tx => {
                const item = data.items.find(i => i.id === tx.itemId);
                const user = data.users.find(u => u.id === tx.userId);
                const date = new Date(tx.date);
                
                return (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      {tx.type === 'IN' ? (
                        <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                          <ArrowDownRight className="w-4 h-4 mr-1" /> Masuk
                        </span>
                      ) : (
                        <span className="flex items-center text-orange-600 dark:text-orange-400 font-medium">
                          <ArrowUpRight className="w-4 h-4 mr-1" /> Keluar
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {item ? `${item.name} (${item.sku})` : 'Item dihapus'}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${tx.type === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {tx.type === 'IN' ? '+' : '-'}{tx.qty}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {tx.notes || '-'}
                    </td>
                    <td className="px-6 py-4 capitalize text-sm">
                      {user?.username || tx.userId}
                    </td>
                  </tr>
                )
              })}
              {data.transactions.length === 0 && (
                 <tr>
                   <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                     Belum ada 1ransaksi.
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
