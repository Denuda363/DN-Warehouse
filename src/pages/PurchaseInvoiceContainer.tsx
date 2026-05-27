import React, { useState } from 'react';
import { PurchaseInvoiceForm } from './PurchaseInvoiceForm';
import { PurchaseInvoiceList } from './PurchaseInvoiceList';
import { PurchaseReturnList } from './PurchaseReturnList';
import { JarvisTransition } from '../components/JarvisTransition';

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

      <div className="flex gap-2 border-b dark:border-slate-800">
        <button
          onClick={() => { setActiveTab('form'); setEditId(undefined); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'form' 
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400' 
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          {editId ? 'Edit Faktur' : 'Input Faktur Baru'}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history' 
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400' 
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Riwayat Faktur
        </button>
        <button
          onClick={() => setActiveTab('return')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'return' 
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400' 
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Riwayat Retur
        </button>
      </div>

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
