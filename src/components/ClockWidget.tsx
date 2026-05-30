import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');

  // get current date string like Senin, 29 Mei 2026
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const dateString = time.toLocaleDateString('id-ID', dateOptions);

  return (
    <div className="flex flex-col items-end mr-2 sm:mr-4">
      <div className="flex items-center gap-2 sm:gap-2.5 bg-slate-100 dark:bg-slate-800/50 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 shadow-sm relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-teal-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 dark:text-indigo-400 group-hover:animate-spin-slow transition-all duration-700 z-10" />
        <div className="font-mono font-bold tracking-tight text-slate-700 dark:text-slate-200 text-sm sm:text-base z-10 flex items-center drop-shadow-sm">
          <span>{hours}</span>
          <span className="text-slate-400 dark:text-slate-500 mx-px animate-[pulse_1s_ease-in-out_infinite]">:</span>
          <span>{minutes}</span>
          <span className="text-slate-400 dark:text-slate-500 mx-px animate-[pulse_1s_ease-in-out_infinite]">:</span>
          <span className="text-teal-600 dark:text-teal-400">{seconds}</span>
        </div>
      </div>
      <div className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 sm:mt-1.5 tracking-wide pr-1">
        {dateString}
      </div>
    </div>
  );
}
