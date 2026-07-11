const fs = require('fs');
let code = fs.readFileSync('src/pages/UsersManagement.tsx', 'utf8');

const oldDelete = `  const handleDelete = (id: string) => {
    if (id === currentUser?.id) {
      alert("Anda tidak bisa menghapus akun Anda sendiri.");
      return;
    }
    if (confirm("Hapus pengguna ini?")) {
      const userToDelete = data.users.find(u => u.id === id);
      logActivity("Hapus Pengguna", \`Menghapus pengguna: \${userToDelete?.username}\`);
      updateData({ users: data.users.filter((u) => u.id !== id) });
    }
  };`;

const newDelete = `  const handleDelete = (id: string) => {
    if (id === currentUser?.id) {
      alert("Anda tidak bisa menghapus akun Anda sendiri.");
      return;
    }
    if (confirm("Hapus pengguna ini?")) {
      const userToDelete = (data.users || []).find(u => u.id === id);
      logActivity("Hapus Pengguna", \`Menghapus pengguna: \${userToDelete?.username}\`);
      updateData({ users: (data.users || []).filter((u) => u.id !== id) });
    }
  };`;

code = code.replace(oldDelete, newDelete);
fs.writeFileSync('src/pages/UsersManagement.tsx', code);
console.log('UsersManagement.tsx delete patched');
