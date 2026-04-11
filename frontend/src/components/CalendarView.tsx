import React, { useState } from 'react';
import { getShiftColor } from '../utils/shiftColors';
import EmployeeScheduleDialog from './EmployeeScheduleDialog';
import { scheduleAPI } from '../api/client';

interface CalendarViewProps {
  schedules: any[] | undefined;
  changeRequests?: any[] | undefined;
  isManager?: boolean;
  userRole?: string;
  userId?: string;
  onScheduleUpdate?: () => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  schedules = [],
  changeRequests = [],
  isManager = false,
  userRole = 'employee',
  userId,
  onScheduleUpdate,
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clickedDay, setClickedDay] = useState<number | null>(null);
  const [displayDate, setDisplayDate] = useState<Date>(new Date());
  const schedulesList = Array.isArray(schedules) ? schedules : [];
  const changeRequestsList = Array.isArray(changeRequests) ? changeRequests : [];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const currentDate = displayDate;
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1));
  };

  const handleToday = () => {
    setDisplayDate(new Date());
  };

  const handleNextMonth = () => {
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1));
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getSchedulesForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedulesList.filter((s: any) => {
      if (!s.scheduled_date) return false;
      // Parse ISO date string and convert to local date for proper timezone handling
      const scheduleDate = new Date(s.scheduled_date);
      const localDateStr = `${scheduleDate.getFullYear()}-${String(scheduleDate.getMonth() + 1).padStart(2, '0')}-${String(scheduleDate.getDate()).padStart(2, '0')}`;
      return localDateStr === dateStr;
    });
  };

  const getChangeRequestsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return changeRequestsList.filter((cr: any) => {
      if (!cr.scheduled_date) return false;
      // Parse ISO date string and convert to local date for proper timezone handling
      const crDate = new Date(cr.scheduled_date);
      const localDateStr = `${crDate.getFullYear()}-${String(crDate.getMonth() + 1).padStart(2, '0')}-${String(crDate.getDate()).padStart(2, '0')}`;
      return localDateStr === dateStr && cr.status === 'pending';
    });
  };

  const getChangeRequestForSchedule = (scheduleId: string) => {
    return changeRequestsList.find((cr: any) => cr.schedule_id === scheduleId && cr.status === 'pending');
  };

  const getUnmergedChangeRequestsForDay = (day: number, schedules: any[]) => {
    const dayChanges = getChangeRequestsForDay(day);
    // Only return change requests that don't have a corresponding schedule
    return dayChanges.filter((cr: any) => !schedules.some((s: any) => s.id === cr.schedule_id));
  };

  const isLeaveShift = (shiftCode: string) => ['VL', 'SPL'].includes(shiftCode);

  const formatEmployeeLabel = (schedule: any) => {
    const employeeName = `${schedule.first_name || ''} ${schedule.last_name || ''}`.trim();
    return employeeName || schedule.employee_id || 'Unknown employee';
  };

  const handleDateClick = (day: number | null, e?: React.MouseEvent) => {
    if (day === null) return;
    
    // Prevent event bubbling from child elements
    if (e) {
      e.stopPropagation();
    }

    // Trigger animation
    setClickedDay(day);
    setTimeout(() => setClickedDay(null), 300);

    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    console.log('Calendar: Opening dialog for date:', dateStr);
    setSelectedDate(dateStr);
    setDialogOpen(true);
  };;

  const handleSuccess = () => {
    setDialogOpen(false);
    setSelectedDate(null);
    if (onScheduleUpdate) {
      onScheduleUpdate();
    }
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{monthName}</h2>
        <div className="flex gap-2">
          <button onClick={handlePrevMonth} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">← Prev</button>
          <button onClick={handleToday} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Today</button>
          <button onClick={handleNextMonth} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Next →</button>
        </div>
      </div>

      {isManager && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <p className="text-sm text-blue-700">
            💡 Click on any date to manage employees. Pending schedules can be approved/declined directly in the calendar using the ✓/✕ buttons.
          </p>
        </div>
      )}

      {!isManager && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg mb-4">
          <p className="text-sm text-purple-700">
            💡 Click on any date to view your schedule or request changes (requires approval)
          </p>
        </div>
      )}

      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center font-semibold text-gray-700 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const daySchedules = day ? getSchedulesForDay(day) : [];
          const dayChangeRequests = day ? getChangeRequestsForDay(day) : [];
          const unmergedChangeRequests = day ? getUnmergedChangeRequestsForDay(day, daySchedules) : [];
          const isClickable = day !== null;
          const leaveSchedules = daySchedules.filter((schedule) => isLeaveShift(schedule.shift_code));
          const isAnimating = clickedDay === day;

          return (
            <div
              key={index}
              onClick={(e) => handleDateClick(day, e)}
              className={`min-h-24 p-2 border rounded-lg transition-all duration-300 ${
                day === null ? 'bg-gray-100' : 'bg-white border-gray-300'
              } ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-blue-400' : ''} ${
                isAnimating ? 'scale-95 shadow-lg border-blue-500 bg-blue-50' : 'scale-100'
              }`}
            >
              {day && (
                <>
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-semibold text-gray-800">{day}</div>
                    {isClickable && (
                      <div className="text-sm text-blue-600 font-semibold hover:underline">
                        🔧
                      </div>
                    )}
                  </div>
                  {daySchedules.length > 0 || unmergedChangeRequests.length > 0 ? (
                    <div className="mt-1 space-y-1 max-h-28 overflow-y-auto pr-1">
                      {daySchedules.map((schedule) => {
                        const pendingChangeRequest = getChangeRequestForSchedule(schedule.id);
                        const shiftColor = getShiftColor(schedule.shift_code);
                        const isLeave = isLeaveShift(schedule.shift_code);
                        const isPending = schedule.status === 'pending';

                        return (
                          <div
                            key={schedule.id}
                            className={`text-xs rounded border-2 px-2 py-1 ${
                              pendingChangeRequest
                                ? 'bg-blue-50 border-blue-500 text-blue-900'
                                : isLeave
                                ? 'bg-yellow-50 border-yellow-500 text-yellow-900'
                                : isPending
                                ? 'bg-orange-50 border-orange-500 text-orange-900'
                                : `${shiftColor.bg} ${shiftColor.border} ${shiftColor.text}`
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium truncate">{formatEmployeeLabel(schedule)}</span>
                              {pendingChangeRequest ? (
                                <span className="font-semibold whitespace-nowrap">
                                  {schedule.shift_code} <span className="text-blue-600">→</span> {pendingChangeRequest.requested_shift}
                                </span>
                              ) : (
                                <span className="font-semibold whitespace-nowrap">{schedule.shift_code}</span>
                              )}
                            </div>
                            {pendingChangeRequest && (
                              <div className="text-[10px] uppercase tracking-wide text-blue-700 font-semibold mt-0.5">
                                📝 Change Request
                              </div>
                            )}
                            {isLeave && (
                              <div className="text-[10px] uppercase tracking-wide text-yellow-700 font-semibold mt-0.5">
                                On Leave
                              </div>
                            )}
                            {isPending && !pendingChangeRequest && (
                              <div className="text-[10px] uppercase tracking-wide text-orange-700 font-semibold mt-0.5">
                                Pending Approval
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {unmergedChangeRequests.length > 0 && (
                        <div className="border-t border-blue-200 pt-1 mt-1">
                          {unmergedChangeRequests.map((cr) => (
                            <div
                              key={cr.id}
                              className="text-xs rounded border border-blue-300 bg-blue-50 text-blue-900 px-2 py-1 mb-1"
                            >
                              <div className="font-medium truncate">
                                {cr.employee_name || 'Unknown'}
                              </div>
                              <div className="text-[10px] font-medium mt-0.5">
                                <span className="font-semibold">{cr.current_shift || '-'}</span>
                                <span className="text-blue-600"> → </span>
                                <span className="font-semibold text-blue-700">{cr.requested_shift}</span>
                              </div>
                              <div className="text-[10px] uppercase tracking-wide text-blue-700 font-semibold mt-0.5">
                                📝 Change Request
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {leaveSchedules.length > 0 && (
                        <div className="text-[10px] text-yellow-700 font-semibold uppercase tracking-wide pt-1 border-t border-yellow-200">
                          {leaveSchedules.length} leave entr{leaveSchedules.length === 1 ? 'y' : 'ies'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-400 italic text-center">
                      No schedules
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
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
          userId={userId}
          changeRequests={changeRequestsList}
        />
      )}
    </div>
  );
};

export default CalendarView;
