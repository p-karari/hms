// components/laboratory/DateRangeFilter.tsx
'use client';

import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import Calendar from '../ui/Calendar';
// import Calendar from '@/components/ui/calendar/Calendar';

interface DateRangeFilterProps {
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
}

export default function DateRangeFilter({ 
  dateRange, 
  onDateRangeChange 
}: DateRangeFilterProps) {
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  const formatDate = (date: Date) => {
    return format(date, 'dd/MM/yyyy');
  };

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.calendar-container')) {
        setShowStartCalendar(false);
        setShowEndCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center space-x-4 calendar-container">
      <div className="text-sm font-medium text-gray-700">Date range:</div>
      
      <div className="relative">
        <input
          type="text"
          readOnly
          value={formatDate(dateRange.start)}
          onClick={() => {
            setShowStartCalendar(true);
            setShowEndCalendar(false);
          }}
          className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {showStartCalendar && (
          <div className="absolute top-full left-0 z-50 mt-1">
            <Calendar
              selected={dateRange.start}
              onSelect={(date) => {
                if (date) {
                  const newEnd = date > dateRange.end ? date : dateRange.end;
                  onDateRangeChange({ start: date, end: newEnd });
                }
                setShowStartCalendar(false);
              }}
            />
          </div>
        )}
      </div>
      
      <div className="text-gray-500">to</div>
      
      <div className="relative">
        <input
          type="text"
          readOnly
          value={formatDate(dateRange.end)}
          onClick={() => {
            setShowEndCalendar(true);
            setShowStartCalendar(false);
          }}
          className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {showEndCalendar && (
          <div className="absolute top-full left-0 z-50 mt-1">
            <Calendar
              selected={dateRange.end}
              onSelect={(date) => {
                if (date) {
                  const newStart = date < dateRange.start ? date : dateRange.start;
                  onDateRangeChange({ start: newStart, end: date });
                }
                setShowEndCalendar(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}