import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Search, RotateCcw, FileText } from 'lucide-react';

export const PurchaseReturnList: React.FC = () => {
  const { data } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  // Get all return transactions
  const returnTransactions = data.transactions.filter(t => t.type === 'OUT' && t.notes.startsWith('Return Faktur'));

  const filteredReturns = returnTransactions.filter(t => {
    const item = data.items.find(i => i.id === t.itemId);
    const supplier = data.suppliers.find(s => s.id === t.supplierId);
    const searchLower = searchTerm.toLowerCase();
    
    return t.notes.toLowerCase().includes(searchLower) || 
           (t.returnNote && t.returnNote.toLowerCase().includes(searchLower)) ||
           item?.name.toLowerCase().includes(searchLower) ||
           supplier?.name.toLowerCase().includes(searchLower);
  });

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-180px)]">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <div className="relative w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari No. Faktur, Barang, Supplier, Keterangan..." 
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
                <th className="px-4 py-3 font-medium">Tanggal Retur</th>
                <th className="px-4 py-3 font-medium">No. Faktur (Referensi)</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Nama Barang</th>
                <th className="px-4 py-3 font-medium">Keterangan</th>
                <th className="px-4 py-3 font-medium text-right">Qty Retur</th>
                <th className="px-4 py-3 font-medium text-center">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {filteredReturns.map(ret => {
                const item = data.items.find(i => i.id === ret.itemId);
                const supplier = data.suppliers.find(s => s.id === ret.supplierId);
                const user = data.users.find(u => u.id === ret.userId);
                
                const dateStr = ret.returnDate || ret.date;
                const isOnlyDate = !!ret.returnDate;
                const date = new Date(dateStr);
                
                // Extract invoice number from notes "Return Faktur: INV/..."
                const invoiceNo = ret.notes.replace('Return Faktur: ', '');
                
                return (
                  <tr key={ret.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {isOnlyDate 
                        ? date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
                        : date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      }
                    </td>
                    <td className="px-4 py-3 font-medium duration-150">
                      <div className="flex items-center text-orange-600 dark:text-orange-400">
                        <FileText className="w-4 h-4 mr-2" />
                        {invoiceNo}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {supplier?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {item ? `[${item.sku}] ${item.name}` : 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={ret.returnNote || ''}>
                      {ret.returnNote || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-orange-600 dark:text-orange-400">
                        {ret.qty} {data.units.find(u => u.id === item?.unitId)?.name || ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 capitalize">
                      {user?.username || ret.userId}
                    </td>
                  </tr>
                )
              })}
              {filteredReturns.length === 0 && (
                 <tr>
                   <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                     Belum ada histori retur barang.
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
