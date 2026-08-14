import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatInvoiceDate } from '../lib/billingLogic';
import { hapticFeedback } from '../lib/haptics';

interface DatePickerProps {
  value?: string;
  onChange: (dateIso: string) => void;
  className?: string;
  id?: string;
}

export function DatePicker({ value, onChange, className = '', id }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date
  const parseDate = (val?: string): Date => {
    if (!val) return new Date();
    const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const selectedDate = parseDate(value);
  const [viewDate, setViewDate] = useState<Date>(selectedDate);

  const [direction, setDirection] = useState<number>(0);

  // When value changes from outside, sync viewDate
  useEffect(() => {
    setViewDate(parseDate(value));
  }, [value]);

  // Handle outside click to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const pad = (n: number) => n.toString().padStart(2, '0');

  const handleSelectDate = (year: number, month: number, day: number) => {
    hapticFeedback('light');
    const isoString = `${year}-${pad(month + 1)}-${pad(day)}`;
    onChange(isoString);
    setIsOpen(false); // Instant auto-close on selection without needing OK button
  };

  const handleQuickSelect = (offsetDays: number) => {
    hapticFeedback('light');
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    const isoString = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
    onChange(isoString);
    setIsOpen(false); // Instant auto-close
  };

  const changeMonth = (delta: number) => {
    setDirection(delta);
    setViewDate(new Date(viewYear, viewMonth + delta, 1));
  };

  const prevMonth = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    changeMonth(-1);
  };

  const nextMonth = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    changeMonth(1);
  };

  // Touch handlers for swipe detection on calendar
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleCalendarTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    }
  };

  const handleCalendarTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    
    const touchEnd = e.changedTouches[0];
    const diffX = touchEnd.clientX - touchStartRef.current.x;
    const diffY = touchEnd.clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;

    // Reset touch start
    touchStartRef.current = null;

    // Validate horizontal swipe: moved at least 35px horizontally and more horizontal than vertical, within 500ms
    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY) * 1.2 && elapsed < 600) {
      if (diffX < 0) {
        // Swiped Left -> Next Month
        nextMonth();
      } else {
        // Swiped Right -> Previous Month
        prevMonth();
      }
    }
  };

  // Calendar calculations
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Current today for highlight
  const today = new Date();
  const isToday = (y: number, m: number, d: number) =>
    today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
  const isSelected = (y: number, m: number, d: number) =>
    selectedDate.getFullYear() === y && selectedDate.getMonth() === m && selectedDate.getDate() === d;

  const formattedDisplay = formatInvoiceDate(value || new Date()).numerical_slash;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 55 : dir < 0 ? -55 : 0,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -55 : dir < 0 ? 55 : 0,
      opacity: 0,
    }),
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Date display trigger button */}
      <button
        id={id}
        type="button"
        onClick={() => {
          setViewDate(parseDate(value));
          setIsOpen(!isOpen);
        }}
        className={`w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 flex items-center justify-between text-left transition-all ${className}`}
      >
        <span className="font-mono text-sm text-gray-900 font-medium">
          {formattedDisplay}
        </span>
        <Calendar size={16} className="text-gray-500 shrink-0" />
      </button>

      {/* Calendar Popover */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <div 
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] sm:hidden"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              onTouchStart={handleCalendarTouchStart}
              onTouchEnd={handleCalendarTouchEnd}
              className="fixed sm:absolute z-50 left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 top-1/2 -translate-y-1/2 sm:top-full sm:translate-y-0 sm:mt-1.5 w-[290px] max-w-[calc(100vw-32px)] bg-white rounded-2xl sm:rounded-xl shadow-2xl border border-gray-200 p-3 select-none touch-pan-y"
            >
              {/* Quick shortcuts row */}
              <div className="flex items-center justify-between gap-1 mb-2.5 pb-2 border-b border-gray-100">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickSelect(0)}
                    className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95 transition-all"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect(-1)}
                    className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95 transition-all"
                  >
                    Yesterday
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 active:bg-gray-100"
                  title="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Month / Year Header */}
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={(e) => prevMonth(e)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 active:scale-95 text-gray-600 transition-all"
                  title="Previous month (or swipe right)"
                >
                  <ChevronLeft size={17} />
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-gray-900">
                    {monthNames[viewMonth]} {viewYear}
                  </span>
                  <span className="text-[9px] text-gray-400 font-medium sm:hidden">
                    Swipe left/right to change
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => nextMonth(e)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 active:scale-95 text-gray-600 transition-all"
                  title="Next month (or swipe left)"
                >
                  <ChevronRight size={17} />
                </button>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {dayLabels.map((lbl, i) => (
                  <span key={i} className="text-[10px] font-semibold text-gray-400">
                    {lbl}
                  </span>
                ))}
              </div>

              {/* Day cells with slide transition */}
              <div className="overflow-hidden min-h-[178px] relative">
                <AnimatePresence custom={direction} mode="wait" initial={false}>
                  <motion.div
                    key={`${viewYear}-${viewMonth}`}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
                    className="grid grid-cols-7 gap-1 text-center"
                  >
                    {/* Empty cells before start of month */}
                    {Array.from({ length: startDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-7" />
                    ))}

                    {/* Days of current month */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const active = isSelected(viewYear, viewMonth, day);
                      const currentDay = isToday(viewYear, viewMonth, day);

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleSelectDate(viewYear, viewMonth, day)}
                          className={`h-7 w-7 mx-auto rounded-lg text-xs font-medium flex items-center justify-center transition-all active:scale-95 ${
                            active
                              ? 'bg-blue-600 text-white font-bold shadow-sm'
                              : currentDay
                              ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                              : 'text-gray-800 hover:bg-gray-100'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
