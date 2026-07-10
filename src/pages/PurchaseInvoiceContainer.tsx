import React, { useState } from 'react';
import { PurchaseInvoiceForm } from './PurchaseInvoiceForm';
import { PurchaseInvoiceList } from './PurchaseInvoiceList';
import { PurchaseReturnList } from './PurchaseReturnList';
import { JarvisTransition } from '../components/JarvisTransition';
import { Card } from '../components/ui/Card';

export const PurchaseInvoiceContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'form' | 'history' | 'return'>('form');
  const [editId, setEditId] = useState<string | undefined>();

  const handleEdit = (id: string) => {
    setEditId(id);
    setActiveTab('form');
  };

  const handleComplete = () => {
    setEditId(undefined);
    setActiveTab('history');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Faktur Pembelian</h1>
          <p className="text-slate-500 text-sm">Kelola input faktur, riwayat pembelian, dan riwayat retur barang.</p>
        </div>
      </div>

      <Card className="p-1 flex gap-1 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto custom-scrollbar w-max max-w-full">
        <button
          onClick={() => { setActiveTab('form'); setEditId(undefined); }}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'form' 
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' 
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
          }`}
        >
          {editId ? 'Edit Faktur' : 'Input Faktur Baru'}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'history' 
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' 
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
          }`}
        >
          Riwayat Faktur
        </button>
        <button
          onClick={() => setActiveTab('return')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'return' 
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' 
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
          }`}
        >
          Riwayat Retur
        </button>
      </Card>

      <div className="mt-4">
        <JarvisTransition pageKey={activeTab} mode="tab">
          {activeTab === 'form' && <PurchaseInvoiceForm editInvoiceId={editId} onComplete={handleComplete} />}
          {activeTab === 'history' && <PurchaseInvoiceList onEdit={handleEdit} />}
          {activeTab === 'return' && <PurchaseReturnList />}
        </JarvisTransition>
      </div>
    </div>
  );
};
