const fs = require('fs');
let code = fs.readFileSync('src/pages/Report.tsx', 'utf8');

// Insert new states
code = code.replace(
  'const [endDate, setEndDate] = useState("");',
  `const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState<"arus" | "stok-menipis">("arus");
  const [lowStockDate, setLowStockDate] = useState(() => {
    const today = new Date();
    // Use local date string YYYY-MM-DD
    const offset = today.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(today.getTime() - offset)).toISOString().split('T')[0];
    return localISOTime;
  });`
);

// We need to insert the tab headers right after "Riwayat seluruh transaksi keluar dan masuk."
code = code.replace(
  /<p className="text-slate-500 text-sm">[\s\S]*?<\/p>/,
  `$&
          </div>
        </div>
        <div className="flex gap-2 border-b dark:border-slate-800 overflow-x-auto custom-scrollbar mt-4">
          <button
            onClick={() => setActiveTab("arus")}
            className={\`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap \${
              activeTab === "arus"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }\`}
          >
            Arus Stok
          </button>
          <button
            onClick={() => setActiveTab("stok-menipis")}
            className={\`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap \${
              activeTab === "stok-menipis"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }\`}
          >
            Stok Menipis Harian
          </button>
        </div>
        <div className="flex gap-2 hidden">`
); // Note: I used 'hidden' to hide the original div containing Export CSV if we want to move it or just leave it.
// Actually, let's look at the original code structure.
