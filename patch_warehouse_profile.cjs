const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const regex = /const WarehouseProfileTab = \(\) => \{[\s\S]*?^\};\n/m;

const newComponent = `const WarehouseProfileTab = () => {
  const { data, updateData, logActivity } = useAppContext();
  const [profile, setProfile] = useState(data.warehouseProfile || { name: "", address: "", phone: "", logo: "" });

  const handleSave = () => {
    updateData({ warehouseProfile: profile as any });
    logActivity("Ubah Profil", "Memperbarui profil gudang");
    alert("Profil gudang berhasil disimpan!");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setProfile({ ...profile, logo: base64 });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil Gudang</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">Nama Gudang</p>
          <Input
            type="text"
            value={profile.name || ""}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            placeholder="Ex: PT. Gudang Amanah"
          />
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Alamat</p>
          <Input
            type="text"
            value={profile.address || ""}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            placeholder="Jln. Raya No. 12"
          />
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Telepon</p>
          <Input
            type="text"
            value={profile.phone || ""}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            placeholder="021-1234567"
          />
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Logo Gudang (Struk/Faktur)</p>
          <div className="flex flex-col gap-2">
            {profile.logo && (
              <img
                src={profile.logo}
                alt="Logo Gudang"
                className="h-16 w-auto object-contain border rounded"
              />
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="cursor-pointer"
            />
            {profile.logo && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setProfile({ ...profile, logo: undefined as any })}
              >
                Hapus Logo
              </Button>
            )}
          </div>
        </div>
        <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800">
          <Button onClick={handleSave} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white">
            Simpan Profil
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
`;

code = code.replace(regex, newComponent);
fs.writeFileSync('src/pages/Settings.tsx', code);
console.log('WarehouseProfileTab updated');
