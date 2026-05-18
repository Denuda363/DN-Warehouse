import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Database, Lock, User as UserIcon } from 'lucide-react';

export const Login: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { data, setCurrentUser } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = data.users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      onSuccess();
    } else {
      setError('Username atau password salah');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2000')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
      
      <div className="relative z-10 w-full max-w-md p-8 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center rotate-12 mb-4 shadow-lg shadow-indigo-500/20">
            <Database className="w-8 h-8 text-white -rotate-12" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">GudangSync</h1>
          <p className="text-slate-400 mt-2 text-sm">Masuk ke sistem manajemen stok</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Username</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <Input 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                placeholder="admin"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <Input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-base font-medium mt-6">
            Masuk
          </Button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            Demo akun: <b>admin</b> / <b>password</b>
          </p>
        </div>
      </div>
    </div>
  );
};
