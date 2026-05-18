import React, { useState, useRef, useEffect } from 'react';
import { Input } from './Input';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
}

export const SearchableSelect: React.FC<Props> = ({ options, value, onChange, placeholder, className, buttonClassName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);
  
  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={cn("relative w-full", className)} ref={ref}>
      <div 
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 cursor-pointer",
          buttonClassName
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={cn("truncate", !selectedOption && "text-slate-500")}>
          {selectedOption ? selectedOption.label : placeholder || "Cari..."}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-950">
          <div className="sticky top-0 px-2 pb-2 pt-1 bg-white dark:bg-slate-950">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-slate-400" />
              <Input 
                autoFocus
                placeholder="Ketik untuk mencari..." 
                className="h-8 w-full pl-8"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
          {filteredOptions.length === 0 ? (
            <div className="px-2 py-2 text-sm text-slate-500 text-center">Tidak ditemukan.</div>
          ) : (
            filteredOptions.map(option => (
              <div
                key={option.value}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/30",
                  value === option.value && "bg-emerald-100 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100 font-medium"
                )}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setSearch('');
                }}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
