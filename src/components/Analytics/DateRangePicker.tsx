import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';

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
      const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
      onChange({ startDate: firstDay, endDate: lastDay });
      setTempStartDate(firstDay);
      setTempEndDate(lastDay);
    } else if (p === 'last_month') {
      const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month, 0).toISOString().split('T')[0];
      onChange({ startDate: firstDay, endDate: lastDay });
      setTempStartDate(firstDay);
      setTempEndDate(lastDay);
    } else if (p === 'this_year') {
      const firstDay = new Date(year, 0, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, 11, 31).toISOString().split('T')[0];
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

  const monthNamesFR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

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
      const formatDateFR = (str: string) => {
        const parts = str.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return str;
      };
      return `${formatDateFR(dateRange.startDate)} - ${formatDateFR(dateRange.endDate)}`;
    }
    if (dateRange.startDate) {
      const parts = dateRange.startDate.split('-');
      return `Depuis le ${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return 'Calendrier & Période';
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-900 hover:bg-slate-950 text-slate-100 text-xs font-bold rounded-xl px-3.5 py-2 border border-slate-700/80 hover:border-slate-600 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
      >
        <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
        <span>{getButtonLabel()}</span>
      </button>

      {/* Popover Calendar Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-700 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-400" />
              <span className="font-extrabold text-sm text-white">Filtrer par Période</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
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
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date range manual inputs */}
          <div className="grid grid-cols-2 gap-2 my-3 bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700/60 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Du :</label>
              <input
                type="date"
                value={tempStartDate}
                onChange={(e) => {
                  setTempStartDate(e.target.value);
                  onPresetChange('custom');
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Au :</label>
              <input
                type="date"
                value={tempEndDate}
                onChange={(e) => {
                  setTempEndDate(e.target.value);
                  onPresetChange('custom');
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Mini Calendar Header */}
          <div className="flex items-center justify-between my-2 px-1">
            <button
              onClick={prevMonth}
              type="button"
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-extrabold text-xs text-slate-200">
              {monthNamesFR[viewMonth]} {viewYear}
            </span>

            <button
              onClick={nextMonth}
              type="button"
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar Day Labels */}
          <div className="grid grid-cols-7 text-center text-[10px] font-extrabold text-slate-500 mb-1">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mer</span>
            <span>Jeu</span>
            <span>Ven</span>
            <span>Sam</span>
            <span>Dim</span>
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

              let cellStyle = 'bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white';
              if (isStart || isEnd) {
                cellStyle = 'bg-blue-600 text-white font-black shadow-xs';
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
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800">
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
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
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
