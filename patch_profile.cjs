const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const oldProfile = `{activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Profil Gudang</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Nama Gudang</p>
                  <Input
                    type="text"
                    value={data.warehouseProfile?.name || ""}
                    onChange={(e) =>
                      updateData({
                        warehouseProfile: {
                          ...data.warehouseProfile,
                          name: e.target.value,
                        } as any,
                      })
                    }
                    placeholder="Ex: PT. Gudang Amanah"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Alamat</p>
                  <Input
                    type="text"
                    value={data.warehouseProfile?.address || ""}
                    onChange={(e) =>
                      updateData({
                        warehouseProfile: {
                          ...data.warehouseProfile,
                          address: e.target.value,
                        } as any,
                      })
                    }
                    placeholder="Jln. Raya No. 12"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Telepon</p>
                  <Input
                    type="text"
                    value={data.warehouseProfile?.phone || ""}
                    onChange={(e) =>
                      updateData({
                        warehouseProfile: {
                          ...data.warehouseProfile,
                          phone: e.target.value,
                        } as any,
                      })
                    }
                    placeholder="021-1234567"
                  />
                </div>
              </CardContent>
            </Card>
          )}`;

const newProfile = `{activeTab === "profile" && <WarehouseProfileTab />}`;

code = code.replace(oldProfile, newProfile);

const newComponent = `
const WarehouseProfileTab = () => {
  const { data, updateData, logActivity } = useAppContext();
  const [profile, setProfile] = useState(data.warehouseProfile || { name: "", address: "", phone: "" });

  const handleSave = () => {
    updateData({ warehouseProfile: profile as any });
    logActivity("Ubah Profil", "Memperbarui profil gudang");
    alert("Profil gudang berhasil disimpan!");
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
        <div className="pt-2">
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Simpan Profil
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
`;

code = code.replace('export const Settings: React.FC = () => {', newComponent + '\nexport const Settings: React.FC = () => {');

fs.writeFileSync('src/pages/Settings.tsx', code);
console.log('Settings.tsx profile patched');
