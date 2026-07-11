const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

// Replace handleResetApp with the new handleResetApp logic
const resetRegex = /const handleResetApp = async \(\) => \{[\s\S]*?^\s*};\n/m;
const newReset = `  const [resetOptions, setResetOptions] = useState({
    items: true,
    transactions: true,
    units: true,
    categories: true,
    suppliers: true,
    staffs: true,
    purchaseInvoices: true,
    activityLogs: true,
  });

  const handleResetApp = async () => {
    if (pinInput !== DEFAULT_PIN) {
      alert("PIN salah.");
      return;
    }
    
    if (confirm("Ingin mereset data yang dipilih? Data tidak dapat dikembalikan.")) {
       const initialData = {
         ...data, // keep existing data as base
         users: data.users, // preserve users
         theme: data.theme,
         colorTheme: data.colorTheme,
         navStyle: data.navStyle,
         mobileNavStyle: data.mobileNavStyle,
         warehouseProfile: data.warehouseProfile,
       };
       
       if (resetOptions.categories) initialData.categories = [];
       if (resetOptions.units) initialData.units = [];
       if (resetOptions.suppliers) initialData.suppliers = [];
       if (resetOptions.staffs) initialData.staffs = [];
       if (resetOptions.items) initialData.items = [];
       if (resetOptions.transactions) initialData.transactions = [];
       if (resetOptions.purchaseInvoices) initialData.purchaseInvoices = [];
       if (resetOptions.activityLogs) initialData.activityLogs = [];
       
       await resetData(initialData as any);
       alert("Reset data berhasil!");
       setPinInput("");
    }
  };
`;
code = code.replace(resetRegex, newReset);

// Replace Reset JSX
const resetJsxRegex = /<h4 className="font-bold text-rose-600 mb-2">Reset Data Keseluruhan<\/h4>[\s\S]*?<\/div>/;
const newResetJsx = `<h4 className="font-bold text-rose-600 mb-2">Reset Data Terpilih</h4>
                  <p className="text-sm text-slate-500 mb-4">
                    Pilih data yang ingin direset. Data yang direset akan dihapus permanen. Masukkan PIN keamanan untuk melanjutkan. (PIN Default: <b>123456</b>)
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" checked={resetOptions.items} onChange={(e) => setResetOptions({...resetOptions, items: e.target.checked})} className="rounded text-rose-600 focus:ring-rose-500" />
                      <span>Data Barang & Stok</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" checked={resetOptions.transactions} onChange={(e) => setResetOptions({...resetOptions, transactions: e.target.checked})} className="rounded text-rose-600 focus:ring-rose-500" />
                      <span>Transaksi Keluar/Masuk</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" checked={resetOptions.purchaseInvoices} onChange={(e) => setResetOptions({...resetOptions, purchaseInvoices: e.target.checked})} className="rounded text-rose-600 focus:ring-rose-500" />
                      <span>Faktur Pembelian</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" checked={resetOptions.categories} onChange={(e) => setResetOptions({...resetOptions, categories: e.target.checked})} className="rounded text-rose-600 focus:ring-rose-500" />
                      <span>Kategori Barang</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" checked={resetOptions.units} onChange={(e) => setResetOptions({...resetOptions, units: e.target.checked})} className="rounded text-rose-600 focus:ring-rose-500" />
                      <span>Satuan Barang</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" checked={resetOptions.suppliers} onChange={(e) => setResetOptions({...resetOptions, suppliers: e.target.checked})} className="rounded text-rose-600 focus:ring-rose-500" />
                      <span>Data Supplier</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" checked={resetOptions.staffs} onChange={(e) => setResetOptions({...resetOptions, staffs: e.target.checked})} className="rounded text-rose-600 focus:ring-rose-500" />
                      <span>Data Petugas</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" checked={resetOptions.activityLogs} onChange={(e) => setResetOptions({...resetOptions, activityLogs: e.target.checked})} className="rounded text-rose-600 focus:ring-rose-500" />
                      <span>Log Aktivitas</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Input 
                      type="password" 
                      placeholder="Masukkan PIN" 
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleResetApp}
                      variant="destructive"
                      className="bg-rose-600 text-white"
                      disabled={!pinInput || !Object.values(resetOptions).some(Boolean)}
                    >
                      Reset Data Terpilih
                    </Button>
                  </div>`;
code = code.replace(resetJsxRegex, newResetJsx);

fs.writeFileSync('src/pages/Settings.tsx', code);
console.log('Settings patched');
