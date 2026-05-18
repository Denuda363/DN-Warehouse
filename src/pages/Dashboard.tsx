import React, { useMemo } from 'react';
import { useAppContext } from '../store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Package, AlertTriangle, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Dashboard: React.FC = () => {
  const { data } = useAppContext();

  const totalItems = data.items.length;
  const totalStock = data.items.reduce((acc, item) => acc + item.stock, 0);
  const lowStock = data.items.filter(item => item.stock <= item.minStock).length;
  
  const thisMonthTransactions = useMemo(() => {
    const now = new Date();
    return data.transactions.filter(t => new Date(t.date).getMonth() === now.getMonth());
  }, [data.transactions]);

  const itemsIn = thisMonthTransactions.filter(t => t.type === 'IN').length;
  const itemsOut = thisMonthTransactions.filter(t => t.type === 'OUT').length;

  const chartData = useMemo(() => {
    // Generate simple last 7 days data
    const res = [];
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const inCount = data.transactions.filter(t => t.type === 'IN' && t.date.startsWith(dateStr)).reduce((sum, t) => sum + t.qty, 0);
      const outCount = data.transactions.filter(t => t.type === 'OUT' && t.date.startsWith(dateStr)).reduce((sum, t) => sum + t.qty, 0);
      
      res.push({
        name: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        masuk: inCount,
        keluar: outCount
      });
    }
    return res;
  }, [data.transactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-slate-500 text-sm">Ringkasan aktivitas dan status stok gudang.</p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Jenis Barang</p>
              <h2 className="text-3xl font-bold">{totalItems}</h2>
            </div>
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center dark:bg-blue-900/40 dark:text-blue-400">
              <Layers className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Stok Fisik</p>
              <h2 className="text-3xl font-bold">{totalStock}</h2>
            </div>
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center dark:bg-indigo-900/40 dark:text-indigo-400">
              <Package className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Limit Stok (Menipis)</p>
              <h2 className="text-3xl font-bold text-red-600 dark:text-red-400">{lowStock}</h2>
            </div>
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center dark:bg-red-900/40 dark:text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Transaksi Bulan Ini</p>
              <div className="flex gap-4">
                <span className="flex items-center text-sm font-bold text-green-600 dark:text-green-400">
                  <ArrowDownRight className="w-4 h-4 mr-1" /> {itemsIn}
                </span>
                <span className="flex items-center text-sm font-bold text-orange-600 dark:text-orange-400">
                  <ArrowUpRight className="w-4 h-4 mr-1" /> {itemsOut}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center dark:bg-emerald-900/40 dark:text-emerald-400">
              <Package className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Aktivitas 7 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="masuk" stroke="#10b981" fillOpacity={1} fill="url(#colorMasuk)" strokeWidth={2} />
                  <Area type="monotone" dataKey="keluar" stroke="#f97316" fillOpacity={1} fill="url(#colorKeluar)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Action Required / Low Stock */}
        <Card>
          <CardHeader>
            <CardTitle>Stok Menipis ({lowStock})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-auto pr-2">
              {data.items.filter(i => i.stock <= i.minStock).length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">Semua stok aman.</div>
              ) : (
                data.items.filter(i => i.stock <= i.minStock).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-600 font-bold dark:text-red-400">{item.stock}</p>
                      <p className="text-[10px] text-red-500">Min: {item.minStock}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
