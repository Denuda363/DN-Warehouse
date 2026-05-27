import React, { useState } from "react";
import { motion } from "motion/react";
import { useAppContext } from "../store/AppContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Database, Lock, User as UserIcon } from "lucide-react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";

export const Login: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { data, setCurrentUser, updateData } = useAppContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const user = data.users.find(
      (u) => u.username === username && u.password === password,
    );
    if (user) {
      setCurrentUser(user);
      onSuccess();
    } else {
      setError("Username atau password salah");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError("");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;
      const name = result.user.displayName || email?.split("@")[0] || "User";

      if (!email) throw new Error("No email returned from Google");

      let existingUser = data.users.find((u) => u.username === email);
      
      if (!existingUser) {
        // If it's the very first user logging in, make them ADMIN, else STAFF
        const isFirstUser = data.users.length === 0 || (data.users.length === 1 && data.users[0].username === "admin");
        
        const newUser = {
          id: result.user.uid,
          username: email,
          role: isFirstUser ? "ADMIN" : "STAFF",
          permissions: isFirstUser 
            ? ["MANAGE_USERS", "MANAGE_MASTER", "VIEW_REPORTS", "MANAGE_TRANSACTIONS"]
            : ["MANAGE_TRANSACTIONS"],
        };
        
        // Remove dummy admin if we're replacing it
        const newUsers = isFirstUser ? [newUser] : [...data.users, newUser];
        
        await updateData({ users: newUsers as any });
        existingUser = newUser as any;
      }

      setCurrentUser(existingUser as any);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal masuk dengan Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2000')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md p-8 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center rotate-12 mb-4 shadow-lg shadow-indigo-500/20">
            <Database className="w-8 h-8 text-white -rotate-12" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            DN_Gudang
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Sistem manajemen stok terintegrasi
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Username / Email
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                placeholder="admin"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-base font-medium mt-6"
          >
            Masuk
          </Button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <hr className="w-full border-white/10" />
          <span className="absolute px-3 bg-slate-950 text-xs text-slate-500 uppercase tracking-widest">
            Atau
          </span>
        </div>

        <Button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white hover:bg-slate-100 text-slate-900 h-12 text-base font-medium flex items-center justify-center gap-2"
        >
          {loading ? "Memproses..." : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.8 15.71 17.58V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                <path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.71 17.58C14.73 18.24 13.48 18.64 12 18.64C9.13 18.64 6.7 16.7 5.82 14.1H2.15V16.94C3.96 20.54 7.68 23 12 23Z" fill="#34A853"/>
                <path d="M5.82 14.1C5.6 13.43 5.46 12.72 5.46 12C5.46 11.28 5.6 10.57 5.82 9.9V7.06H2.15C1.41 8.53 1 10.21 1 12C1 13.79 1.41 15.47 2.15 16.94L5.82 14.1Z" fill="#FBBC05"/>
                <path d="M12 5.36C13.62 5.36 15.06 5.92 16.2 70.01L19.36 3.86C17.46 2.08 14.97 1 12 1C7.68 1 3.96 3.46 2.15 7.06L5.82 9.9C6.7 7.3 9.13 5.36 12 5.36Z" fill="#EA4335"/>
              </svg>
              Masuk dengan Google
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
};

