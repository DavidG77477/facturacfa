import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';
import { DAYS_FR_SHORT, MONTHS_FR, formatDateFR, toISODate } from '../../utils/date';
import { FrenchDateInput } from '../ui/FrenchDateInput';

export interface DateRange {
  startDate: string; // YYYY-MM-DD or ''
  endDate: string;   // YYYY-MM-DD or ''
}

interface DateRangePickerProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
  preset: string;
  onPresetChange: (preset: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateRange,
  onChange,
  preset,
  onPresetChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calendar navigation state (Year & Month)
  const [viewDate, setViewDate] = useState(() => {
    if (dateRange.startDate) {
      const d = new Date(dateRange.startDate);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  // Temporary date range selection when popover is open
  const [tempStartDate, setTempStartDate] = useState(dateRange.startDate);
  const [tempEndDate, setTempEndDate] = useState(dateRange.endDate);

  // Sync temp dates when props change
  useEffect(() => {
    setTempStartDate(dateRange.startDate);
    setTempEndDate(dateRange.endDate);
  }, [dateRange]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick preset helper
  const applyPreset = (p: string) => {
    onPresetChange(p);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (p === 'all') {
      onChange({ startDate: '', endDate: '' });
      setTempStartDate('');
      setTempEndDate('');
    } else if (p === 'this_month') {
      const firstDay = toISODate(new Date(year, month, 1));
      const lastDay = toISODate(new Date(year, month + 1, 0));
      onChange({ startDate: firstDay, endDate: lastDay });
      setTempStartDate(firstDay);
      setTempEndDate(lastDay);
    } else if (p === 'last_month') {
      const firstDay = toISODate(new Date(year, month - 1, 1));
      const lastDay = toISODate(new Date(year, month, 0));
      onChange({ startDate: firstDay, endDate: lastDay });
      setTempStartDate(firstDay);
      setTempEndDate(lastDay);
    } else if (p === 'this_year') {
      const firstDay = toISODate(new Date(year, 0, 1));
      const lastDay = toISODate(new Date(year, 11, 31));
      onChange({ startDate: firstDay, endDate: lastDay });
      setTempStartDate(firstDay);
      setTempEndDate(lastDay);
    }
    setIsOpen(false);
  };

  // Month navigation
  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // Generate calendar days for current viewDate
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  // Adjust starting day (Monday = 0 instead of Sunday = 0)
  const adjustedFirstDay = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const handleDateClick = (dayStr: string) => {
    onPresetChange('custom');
    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      setTempStartDate(dayStr);
      setTempEndDate('');
    } else if (tempStartDate && !tempEndDate) {
      if (dayStr < tempStartDate) {
        setTempEndDate(tempStartDate);
        setTempStartDate(dayStr);
      } else {
        setTempEndDate(dayStr);
      }
    }
  };

  const handleApplyCustom = () => {
    onPresetChange('custom');
    onChange({ startDate: tempStartDate, endDate: tempEndDate });
    setIsOpen(false);
  };

  const handleReset = () => {
    applyPreset('all');
  };

  // Display label on the trigger button
  const getButtonLabel = () => {
    if (preset === 'all' && !dateRange.startDate && !dateRange.endDate) {
      return 'Toutes les dates';
    }
    if (preset === 'this_month') return 'Ce mois-ci';
    if (preset === 'last_month') return 'Le mois dernier';
    if (preset === 'this_year') return 'Cette année';

    if (dateRange.startDate && dateRange.endDate) {
      return `${formatDateFR(dateRange.startDate)} - ${formatDateFR(dateRange.endDate)}`;
    }
    if (dateRange.startDate) {
      return `Depuis le ${formatDateFR(dateRange.startDate)}`;
    }
    return 'Calendrier & Période';
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-brand-ink hover:bg-slate-950 text-slate-100 text-xs font-bold rounded-xl px-3.5 py-2 border border-white/10 hover:border-slate-600 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
      >
        <CalendarIcon className="w-3.5 h-3.5 text-brand-glow" />
        <span>{getButtonLabel()}</span>
      </button>

      {/* Popover Calendar Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-brand-ink text-white rounded-3xl shadow-2xl border border-white/10 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-brand-deep">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-brand-glow" />
              <span className="font-extrabold text-sm text-white">Filtrer par Période</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-brand-deep transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Presets Pills */}
          <div className="flex flex-wrap gap-1.5 my-3">
            {[
              { id: 'all', label: 'Toutes' },
              { id: 'this_month', label: 'Ce mois' },
              { id: 'last_month', label: 'Mois dernier' },
              { id: 'this_year', label: 'Cette année' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  preset === p.id && !tempStartDate
                    ? 'bg-brand-ink text-white shadow-xs'
                    : 'bg-brand-deep text-slate-300 hover:bg-brand-mid/40 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date range manual inputs */}
          <div className="grid grid-cols-2 gap-2 my-3 bg-brand-deep/70 p-2.5 rounded-2xl border border-white/10 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Du :</label>
              <FrenchDateInput
                value={tempStartDate}
                onChange={(v) => {
                  setTempStartDate(v);
                  onPresetChange('custom');
                }}
                variant="dark"
                className="w-full bg-brand-ink border border-white/10 rounded-xl px-2 py-1.5 pr-8 text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-mid"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Au :</label>
              <FrenchDateInput
                value={tempEndDate}
                onChange={(v) => {
                  setTempEndDate(v);
                  onPresetChange('custom');
                }}
                variant="dark"
                className="w-full bg-brand-ink border border-white/10 rounded-xl px-2 py-1.5 pr-8 text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-mid"
              />
            </div>
          </div>

          {/* Mini Calendar Header */}
          <div className="flex items-center justify-between my-2 px-1">
            <button
              onClick={prevMonth}
              type="button"
              className="p-1 rounded-lg bg-brand-deep hover:bg-brand-mid/40 text-slate-300 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-extrabold text-xs text-slate-200">
              {MONTHS_FR[viewMonth]} {viewYear}
            </span>

            <button
              onClick={nextMonth}
              type="button"
              className="p-1 rounded-lg bg-brand-deep hover:bg-brand-mid/40 text-slate-300 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar Day Labels */}
          <div className="grid grid-cols-7 text-center text-[10px] font-extrabold text-slate-500 mb-1">
            {DAYS_FR_SHORT.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Blank leading cells */}
            {Array.from({ length: adjustedFirstDay }).map((_, i) => (
              <div key={`blank-${i}`} className="h-7"></div>
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

              const isStart = dayStr === tempStartDate;
              const isEnd = dayStr === tempEndDate;
              const isInRange =
                tempStartDate &&
                tempEndDate &&
                dayStr > tempStartDate &&
                dayStr < tempEndDate;

              let cellStyle = 'bg-brand-deep/50 text-slate-300 hover:bg-brand-mid/40 hover:text-white';
              if (isStart || isEnd) {
                cellStyle = 'bg-brand-ink text-white font-black shadow-xs';
              } else if (isInRange) {
                cellStyle = 'bg-blue-900/50 text-blue-200 font-semibold';
              }

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleDateClick(dayStr)}
                  className={`h-7 rounded-lg text-xs transition-all flex items-center justify-center cursor-pointer ${cellStyle}`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-brand-deep">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </button>

            <button
              type="button"
              onClick={handleApplyCustom}
              className="px-3.5 py-1.5 bg-brand-ink hover:bg-brand-deep text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Appliquer</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
