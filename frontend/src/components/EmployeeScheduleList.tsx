import React, { useMemo, useState } from 'react';
import { getShiftColor } from '../utils/shiftColors';

interface EmployeeScheduleListProps {
  schedules: any[] | undefined;
  layoutMode?: 'calendar-top' | 'notification-top';
  onLayoutModeChange?: (mode: 'calendar-top' | 'notification-top') => void;
}

const EmployeeScheduleList: React.FC<EmployeeScheduleListProps> = ({ schedules = [], layoutMode = 'calendar-top', onLayoutModeChange }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const schedulesList = Array.isArray(schedules) ? schedules : [];

  // Group schedules by date and sort
  const groupedSchedules = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    
    schedulesList.forEach((schedule) => {
      const date = schedule.scheduled_date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(schedule);
    });

    // Sort by date and group entries
    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, entries]) => ({
        date,
        entries: entries.sort((a, b) => a.first_name.localeCompare(b.first_name)),
      }));
  }, [schedulesList]);

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow mt-0 mb-8">
      <div 
        className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-xl font-bold text-gray-900">🔔 Notification</h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onLayoutModeChange && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLayoutModeChange(layoutMode === 'calendar-top' ? 'notification-top' : 'calendar-top');
              }}
              className="px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              title="Toggle layout order"
            >
              {layoutMode === 'calendar-top' ? 'Notification Top' : 'Calendar Top'}
            </button>
          )}
          <button
            className="text-2xl text-gray-600 hover:text-gray-900 transition"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <>
          {schedulesList.length === 0 ? (
            <div className="text-center py-8 px-6 border-t border-gray-200">
              <p className="text-gray-500">No schedules found</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto border-t border-gray-200">
              {groupedSchedules.map(({ date, entries }) => (
                <div key={date} className="border-b last:border-b-0">
                  <div className="sticky top-0 bg-blue-50 px-4 py-3 border-b border-blue-200">
                    <h3 className="font-semibold text-blue-900">{formatDate(date)}</h3>
                    <p className="text-xs text-blue-700">{entries.length} employee(s)</p>
                  </div>
                  <div>
                    {entries.map((schedule) => {
                      const colors = getShiftColor(schedule.shift_code);
                      return (
                        <div
                          key={schedule.id}
                          className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 transition"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {schedule.first_name} {schedule.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{schedule.employee_id}</p>
                          </div>
                          <div className={`px-3 py-1 rounded text-sm font-semibold ${colors.bg} ${colors.text}`}>
                            {schedule.shift_code}
                          </div>
                          <div className="text-xs text-gray-500 ml-4">
                            {schedule.status && (
                              <span className={`px-2 py-1 rounded-full ${
                                schedule.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {schedule.status}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmployeeScheduleList;
