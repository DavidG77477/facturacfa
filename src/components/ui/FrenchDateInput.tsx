import React, { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DAYS_FR_SHORT,
  MONTHS_FR,
  formatDateFR,
  parseFrenchDateInput,
  parseISODate,
  toISODate,
} from '../../utils/date';

interface FrenchDateInputProps {
  value: string; // YYYY-MM-DD
  onChange: (isoDate: string) => void;
  className?: string;
  title?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  /** Apparence du popup calendrier */
  variant?: 'light' | 'dark';
}

export const FrenchDateInput: React.FC<FrenchDateInputProps> = ({
  value,
  onChange,
  className = '',
  title,
  id,
  required,
  disabled,
  variant = 'light',
}) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => (value ? formatDateFR(value, '') : ''));
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewDate, setViewDate] = useState(() => parseISODate(value) || new Date());

  useEffect(() => {
    setText(value ? formatDateFR(value, '') : '');
    const parsed = parseISODate(value);
    if (parsed) setViewDate(parsed);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const adjustedFirstDay = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const commitText = () => {
    if (!text.trim()) {
      if (!required) onChange('');
      setText(value ? formatDateFR(value, '') : '');
      return;
    }
    const iso = parseFrenchDateInput(text);
    if (iso) {
      onChange(iso);
      setText(formatDateFR(iso, ''));
    } else {
      setText(value ? formatDateFR(value, '') : '');
    }
  };

  const pickDay = (dayNum: number) => {
    const iso = toISODate(new Date(viewYear, viewMonth, dayNum, 12, 0, 0));
    onChange(iso);
    setText(formatDateFR(iso, ''));
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="JJ/MM/AAAA"
          title={title || 'Date (JJ/MM/AAAA)'}
          required={required}
          disabled={disabled}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitText();
              setOpen(false);
            }
          }}
          className={className}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-lg cursor-pointer disabled:opacity-40 ${
            variant === 'dark'
              ? 'text-slate-400 hover:text-blue-300 hover:bg-slate-800'
              : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
          }`}
          title="Ouvrir le calendrier"
          tabIndex={-1}
        >
          <CalendarIcon className="w-4 h-4" />
        </button>
      </div>

      {open && !disabled && (
        <div
          className={`absolute left-0 mt-1.5 w-72 rounded-2xl shadow-2xl p-3 z-50 ${
            variant === 'dark'
              ? 'bg-slate-900 text-white border border-slate-700'
              : 'bg-white text-slate-900 border border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2 px-0.5">
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewYear, viewMonth - 1, 1))}
              className={`p-1.5 rounded-lg cursor-pointer ${
                variant === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span
              className={`font-extrabold text-xs ${
                variant === 'dark' ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              {MONTHS_FR[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewYear, viewMonth + 1, 1))}
              className={`p-1.5 rounded-lg cursor-pointer ${
                variant === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div
            className={`grid grid-cols-7 text-center text-[10px] font-extrabold mb-1 ${
              variant === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {DAYS_FR_SHORT.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: adjustedFirstDay }).map((_, i) => (
              <div key={`blank-${i}`} className="h-8" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const iso = toISODate(new Date(viewYear, viewMonth, dayNum, 12, 0, 0));
              const selected = iso === value;
              const isToday = iso === toISODate(new Date());
              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => pickDay(dayNum)}
                  className={`h-8 rounded-lg transition-all flex items-center justify-center cursor-pointer font-semibold ${
                    selected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isToday
                        ? variant === 'dark'
                          ? 'bg-blue-900/40 text-blue-200 ring-1 ring-blue-500/40'
                          : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                        : variant === 'dark'
                          ? 'bg-slate-800/50 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          <div
            className={`flex justify-between mt-2 pt-2 border-t ${
              variant === 'dark' ? 'border-slate-800' : 'border-slate-100'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                const today = toISODate(new Date());
                onChange(today);
                setText(formatDateFR(today, ''));
                setViewDate(new Date());
                setOpen(false);
              }}
              className="text-[11px] font-bold text-blue-500 hover:text-blue-400 cursor-pointer"
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`text-[11px] font-bold cursor-pointer ${
                variant === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
