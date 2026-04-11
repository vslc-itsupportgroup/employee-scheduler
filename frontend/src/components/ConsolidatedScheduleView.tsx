import React, { useState } from 'react';
import EmployeeScheduleDialog from './EmployeeScheduleDialog';

interface ConsolidatedScheduleViewProps {
  schedules: any[] | undefined;
  userRole?: string;
  onScheduleUpdate?: () => void;
}

const ConsolidatedScheduleView: React.FC<ConsolidatedScheduleViewProps> = ({
  schedules = [],
  userRole = 'employee',
  onScheduleUpdate,
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const schedulesList = Array.isArray(schedules) ? schedules : [];

  const currentDate = new Date();
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'short', year: 'numeric' });

  // Create array of all days in month
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  /**
   * Get count of employees scheduled for a specific day
   */
  const getScheduleCountForDay = (day: number): number => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedulesList.filter((s: any) => s.scheduled_date && s.scheduled_date.includes(dateStr)).length;
  };

  /**
   * Check if a day has any scheduled employees
   */
  const hasSchedules = (day: number): boolean => {
    return getScheduleCountForDay(day) > 0;
  };

  const handleDateClick = (day: number | null, e?: React.MouseEvent) => {
    if (day === null) return;
    if (e) {
      e.stopPropagation();
    }

    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    setSelectedDate(null);
    if (onScheduleUpdate) {
      onScheduleUpdate();
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{monthName} - Consolidated Schedule</h2>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-semibold text-gray-700 py-2 text-sm">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const count = day ? getScheduleCountForDay(day) : 0;
            const highlighted = day && hasSchedules(day);
            const isClickable = day !== null && highlighted;

            return (
              <div
                key={index}
                onClick={(e) => handleDateClick(day, e)}
                className={`
                  aspect-square p-2 rounded border flex flex-col items-center justify-center text-sm font-medium
                  transition cursor-pointer
                  ${day === null ? 'bg-gray-100 border-transparent' : ''}
                  ${highlighted 
                    ? 'bg-blue-100 border-blue-400 shadow-md hover:bg-blue-200 hover:shadow-lg' 
                    : day ? 'bg-white border-gray-300 hover:bg-gray-50' : ''
                  }
                `}
              >
                {day && (
                  <div className="text-center">
                    <div className="font-semibold text-gray-800">{day}</div>
                    {highlighted && (
                      <div className="text-xs font-bold text-blue-600 mt-1">
                        {count} emp
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-xs text-blue-700">
            <span className="font-semibold">💡 Tip:</span> Click on highlighted dates to view all employees scheduled for that day
          </p>
        </div>
      </div>

      {selectedDate && (
        <EmployeeScheduleDialog
          date={selectedDate}
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedDate(null);
          }}
          onSuccess={handleSuccess}
          userRole={userRole}
        />
      )}
    </div>
  );
};

export default ConsolidatedScheduleView;
