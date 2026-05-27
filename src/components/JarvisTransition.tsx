import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface JarvisTransitionProps {
  children: React.ReactNode;
  pageKey: string;
  mode?: "page" | "tab";
}

const getScifiLabel = (key: string): string => {
  switch (key) {
    case "dashboard":
      return "DASHBOARD.STOCKS_MONITOR";
    case "inbound":
      return "INBOUND.INVOICE_FLOWS";
    case "outbound":
      return "POS.REALTIME_ENGINE";
    case "report":
      return "FLOW_ANALYTICAL_RENDER";
    case "master":
      return "BARANG_INDEX_ACTIVE";
    case "settings":
      return "CONFIGURATION_MANAGER";
    default:
      if (key.startsWith("/")) {
        const path = key.substring(1).toUpperCase();
        return `ROUTE.${path || "INDEX"}_CONNECTED`;
      }
      return `TAB.${key.toUpperCase()}_INITIALIZED`;
  }
};

export const JarvisTransition: React.FC<JarvisTransitionProps> = ({ 
  children, 
  pageKey, 
  mode = "page" 
}) => {
  const [isDone, setIsDone] = useState(true);
  const [activeKey, setActiveKey] = useState(pageKey);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (pageKey !== activeKey) {
      setIsDone(false);
      setProgress(0);
      
      // Simulate high-speed progress count for futuristic aesthetic
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + Math.floor(Math.random() * 25 + 15);
        });
      }, 50);

      const delay = mode === "page" ? 420 : 280; // Ultra snappy speeds
      const timer = setTimeout(() => {
        setActiveKey(pageKey);
        setIsDone(true);
        clearInterval(progressInterval);
      }, delay);
      
      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    }
  }, [pageKey, activeKey, mode]);

  // Tab Transition Layout
  if (mode === "tab") {
    return (
      <div className="relative w-full overflow-hidden rounded-xl border border-slate-205 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/30 backdrop-blur-md shadow-sm">
        <AnimatePresence>
          {!isDone && (
            <motion.div
              key="tab-scanner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="absolute inset-0 z-40 pointer-events-none overflow-hidden bg-cyan-500/[0.01] dark:bg-cyan-400/[0.03]"
            >
              {/* Laser sweep line - fast & sleek glow */}
              <motion.div 
                initial={{ left: "-10%" }}
                animate={{ left: "110%" }}
                transition={{ duration: 0.28, ease: "linear" }}
                className="absolute top-0 bottom-0 w-[4px] bg-gradient-to-b from-cyan-400 via-indigo-500 to-indigo-600 shadow-[0_0_20px_rgba(6,182,212,0.8)] z-50"
              />
              
              {/* Sleek horizontal overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.45, 0] }}
                transition={{ duration: 0.28 }}
                className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-indigo-500/5 to-transparent blur-xs pointer-events-none"
              />

              {/* Minimal floating scifi indicator */}
              <div className="absolute right-4 top-3 font-mono text-[9px] text-cyan-500 dark:text-cyan-400 font-extrabold tracking-widest flex items-center gap-2 select-none uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>SYNCING_TAB: {getScifiLabel(pageKey)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content with high-end sci-fi transition effects */}
        <div className={`w-full transition-all duration-300 ${!isDone ? "blur-[1px] scale-[0.99] opacity-30 select-none pointer-events-none" : "blur-0 scale-100 opacity-100"}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeKey}
              initial={{ opacity: 0, scale: 0.985, y: 4, filter: "brightness(0.85)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "brightness(1)" }}
              exit={{ opacity: 0, scale: 0.985, y: -4, filter: "brightness(0.85)" }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Page Transition Layout
  return (
    <div className="relative w-full h-full min-h-[400px]">
      {/* Sleek background technology grid */}
      <div className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-60 overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 30%, rgba(6, 182, 212, 0.08) 0%, transparent 60%),
              linear-gradient(rgba(6, 182, 212, 0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.02) 1px, transparent 1px)
            `,
            backgroundSize: "100% 100%, 40px 40px, 40px 40px"
          }}
        />
        {/* Animated tech vector grid lines */}
        <div className="absolute top-10 left-10 w-32 h-32 border-l border-t border-cyan-400/10 dark:border-cyan-400/20" />
        <div className="absolute bottom-10 right-10 w-32 h-32 border-r border-b border-indigo-400/10 dark:border-indigo-400/20" />
      </div>

      <AnimatePresence mode="popLayout">
        {!isDone && (
          <motion.div
            key="scifi-shimmer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center bg-slate-950/20 dark:bg-slate-950/60 backdrop-blur-xs"
          >
            {/* The Cyber Holographic Core HUD */}
            <div className="absolute inset-4 sm:inset-6 rounded-2xl overflow-hidden flex flex-col justify-between p-6 sm:p-8 font-mono select-none">
              
              {/* Subtle Tech Corner Frames */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t border-l border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.3)] opacity-80" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t border-r border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.3)] opacity-80" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b border-l border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.3)] opacity-80" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b border-r border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.3)] opacity-80" />

              {/* Diagonal Scanning Laser Lines */}
              <motion.div 
                initial={{ top: "-10%" }}
                animate={{ top: "110%" }}
                transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.9)] z-10"
              />
              
              {/* Background Digital Shift Effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/[0.03] via-indigo-950/[0.04] to-transparent pointer-events-none" />

              {/* Header Status Bar */}
              <div className="w-full flex justify-between text-[10px] text-cyan-400 font-extrabold tracking-[0.2em] uppercase">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>SECURE_DATA_LINK // OK</span>
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  <span>LATENCY: 0.05ms</span>
                  <span className="opacity-40">|</span>
                  <span>SYSTEM_ESTABLISHED</span>
                </div>
              </div>

              {/* Central Holographic Visual Gate */}
              <div className="flex flex-col items-center justify-center gap-6 py-6">
                
                {/* Ultra-modern geometric rotating core (instead of circular circles) */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <motion.div 
                    animate={{ rotate: 45 + 360, scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 border border-cyan-500/40 rounded-xl bg-cyan-500/[0.02]"
                  />
                  <motion.div 
                    animate={{ rotate: -45 - 360 }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-3 border border-indigo-400/30 rounded-lg"
                  />
                  <motion.div 
                    animate={{ rotate: 90 }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                    className="absolute inset-6 border border-cyan-300/50 rounded flex items-center justify-center"
                  />
                  <div className="w-6 h-6 bg-cyan-400/20 rounded shadow-[0_0_12px_rgba(34,211,238,0.8)] border border-cyan-400/50 flex items-center justify-center">
                    <span className="text-[8px] text-cyan-300 font-extrabold font-mono animate-pulse">{Math.min(100, Math.max(0, progress))}%</span>
                  </div>
                </div>

                {/* Smooth aesthetic tech text */}
                <div className="text-center">
                  <motion.div 
                    initial={{ scale: 0.97, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-cyan-400 font-black text-xs tracking-[0.3em] flex items-center justify-center gap-2"
                  >
                    <span>[</span>
                    <span className="text-shadow-[0_0_8px_rgba(34,211,238,0.4)]">{getScifiLabel(pageKey)}</span>
                    <span>]</span>
                  </motion.div>
                  <p className="text-[9px] text-slate-400/80 tracking-widest mt-2 font-bold uppercase">
                    LINKING MODULE CHANNELS & TRANSITIONING BUFFER
                  </p>
                </div>
              </div>

              {/* Footer Coordinates & Diagnostics */}
              <div className="w-full flex justify-between text-[10px] text-cyan-400/70 font-bold tracking-wider">
                <div>
                  <span>SYS_COORD: X_{(Math.random() * 90 + 10).toFixed(0)} // Y_{(Math.random() * 90 + 10).toFixed(0)}</span>
                </div>
                <div>
                  <span className="text-indigo-400 tracking-widest font-extrabold">SECURE_RENDER_INIT</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Content Holder with dynamic holographic styling */}
      <div className={`w-full h-full transition-all duration-350 ${!isDone ? "blur-[1.5px] scale-[0.995] opacity-25 select-none pointer-events-none" : "blur-0 scale-100 opacity-100"}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeKey}
            initial={{ opacity: 0, y: 10, filter: "brightness(0.9) contrast(1.05)" }}
            animate={{ opacity: 1, y: 0, filter: "brightness(1) contrast(1)" }}
            exit={{ opacity: 0, y: -10, filter: "brightness(0.9) contrast(1.05)" }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
