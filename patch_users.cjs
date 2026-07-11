const fs = require('fs');
let code = fs.readFileSync('src/pages/UsersManagement.tsx', 'utf8');

code = code.replace(/handeAddNew/g, "handleAddNew");

const oldSave = `  const handleSave = () => {
    if (!formData.username || !formData.role) return;

    const existing = data.users.find((u) => u.id === formData.id);
    let newUsers;
    if (existing) {
      newUsers = data.users.map((u) =>
        u.id === formData.id ? ({ ...u, ...formData } as User) : u,
      );
      logActivity("Edit Pengguna", \`Memperbarui hak akses/data pengguna: \${formData.username}\`);
    } else {
      newUsers = [...data.users, formData as User];
      logActivity("Tambah Pengguna", \`Menambahkan pengguna baru: \${formData.username}\`);
    }

    updateData({ users: newUsers });
    setIsEditing(false);
  };`;

const newSave = `  const handleSave = () => {
    if (!formData.username || !formData.role) {
      alert("Username dan Role wajib diisi!");
      return;
    }

    const existing = (data.users || []).find((u) => u.id === formData.id);
    let newUsers;
    if (existing) {
      const finalPassword = formData.password ? formData.password : existing.password;
      newUsers = (data.users || []).map((u) =>
        u.id === formData.id ? ({ ...u, ...formData, password: finalPassword } as User) : u,
      );
      logActivity("Edit Pengguna", \`Memperbarui hak akses/data pengguna: \${formData.username}\`);
    } else {
      if (!formData.password) {
        alert("Password wajib diisi untuk pengguna baru!");
        return;
      }
      newUsers = [...(data.users || []), formData as User];
      logActivity("Tambah Pengguna", \`Menambahkan pengguna baru: \${formData.username}\`);
    }

    updateData({ users: newUsers });
    setIsEditing(false);
  };`;

code = code.replace(oldSave, newSave);

const oldEdit = `  const handleEdit = (user: User) => {
    setFormData(user);
    setIsEditing(true);
  };`;

const newEdit = `  const handleEdit = (user: User) => {
    setFormData({ ...user, password: "" });
    setIsEditing(true);
  };`;

code = code.replace(oldEdit, newEdit);

const oldMap = `data.users.map((u) => (`;
const newMap = `(data.users || []).map((u) => (`;
code = code.replace(oldMap, newMap);

fs.writeFileSync('src/pages/UsersManagement.tsx', code);
console.log('UsersManagement.tsx patched');
