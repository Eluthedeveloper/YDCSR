import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { WEEKDAYS, MONTHS, parseDate, toISO, isSameDay } from '../../utils/calendar';
import { usePopupPosition } from './usePopupPosition';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  align?: 'left' | 'right';
  className?: string;
}

const POPUP_WIDTH = 288; // w-72
const DAYS_HEIGHT = 376;
const COMPACT_HEIGHT = 268;

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  required = false,
  align = 'left',
  className = '',
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'days' | 'months' | 'years'>('days');
  const today = new Date();
  const selected = parseDate(value);
  const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : today.getMonth());
  const wrapRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const estimatedHeight = view === 'days' ? DAYS_HEIGHT : COMPACT_HEIGHT;
  const pos = usePopupPosition(open, wrapRef, POPUP_WIDTH, estimatedHeight, align);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openPicker = () => {
    const base = selected || today;
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setView('days');
    setOpen(true);
  };

  const selectDay = (d: Date) => {
    onChange(toISO(d));
    setOpen(false);
  };

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const display = selected
    ? selected.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <button
        type="button"
        onClick={openPicker}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-left transition-colors ${
          required && !value
            ? 'border-red-300 dark:border-red-700'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${display ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}
      >
        <span className="truncate text-sm">{display || placeholder}</span>
        <Calendar size={18} className="text-gray-400 shrink-0" />
      </button>

      {open &&
        createPortal(
          <div
            ref={popRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: POPUP_WIDTH }}
            className="z-[70] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl p-3 animate-pop"
          >
            {view === 'days' ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
                      else setViewMonth(viewMonth - 1);
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('months')}
                    className="text-sm font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    {MONTHS[viewMonth]} {viewYear}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
                      else setViewMonth(viewMonth + 1);
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map((w, i) => (
                    <div key={i} className="h-8 flex items-center justify-center text-[11px] font-medium text-gray-400 uppercase">
                      {w}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-0.5">
                  {cells.map((d, i) => {
                    if (!d) return <div key={i} className="h-9" />;
                    const inMonth = d.getMonth() === viewMonth;
                    const isSelected = !!selected && isSameDay(d, selected);
                    const isToday = isSameDay(d, today);
                    let cls = 'h-9 w-9 flex items-center justify-center rounded-lg text-sm transition-colors mx-auto ';
                    if (isSelected) {
                      cls += 'bg-primary-600 text-white font-semibold shadow-sm';
                    } else if (!inMonth) {
                      cls += 'text-gray-300 dark:text-gray-600';
                    } else if (isToday) {
                      cls += 'text-primary-600 dark:text-primary-400 font-semibold ring-1 ring-primary-300 dark:ring-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20';
                    } else {
                      cls += 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';
                    }
                    return (
                      <button key={i} type="button" onClick={() => selectDay(d)} className={cls}>
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => { onChange(''); setOpen(false); }}
                    className={`text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 ${value ? '' : 'invisible'}`}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); selectDay(today); }}
                    className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Today
                  </button>
                </div>
              </>
            ) : view === 'months' ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setViewYear(viewYear - 1)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('years')}
                    className="text-sm font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    {viewYear}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewYear(viewYear + 1)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {MONTHS.map((m, i) => {
                    const isSelectedMonth = selected && selected.getFullYear() === viewYear && selected.getMonth() === i;
                    const isCurrentMonth = viewYear === today.getFullYear() && i === today.getMonth();
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setViewMonth(i); setView('days'); }}
                        className={`h-9 rounded-lg text-xs transition-colors ${
                          isSelectedMonth
                            ? 'bg-primary-600 text-white font-semibold'
                            : isCurrentMonth
                              ? 'text-primary-600 dark:text-primary-400 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {m.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setViewYear(viewYear - 12)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {viewYear - 5} - {viewYear + 6}
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewYear(viewYear + 12)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {Array.from({ length: 12 }, (_, i) => viewYear - 5 + i).map((y) => {
                    const isSelectedYear = selected && selected.getFullYear() === y;
                    const isCurrentYear = y === today.getFullYear();
                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => { setViewYear(y); setView('months'); }}
                        className={`h-9 rounded-lg text-xs transition-colors ${
                          isSelectedYear
                            ? 'bg-primary-600 text-white font-semibold'
                            : isCurrentYear
                              ? 'text-primary-600 dark:text-primary-400 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
