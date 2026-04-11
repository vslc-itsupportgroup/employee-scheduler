import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { scheduleAPI, userAPI, shiftAPI } from '../api/client';

const ManageSchedulesPage: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [shiftType, setShiftType] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Bulk assignment states
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkShift, setBulkShift] = useState('');
  const [bulkDays, setBulkDays] = useState(15);
  const [restDays, setRestDays] = useState<Set<number>>(new Set());
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');

  useEffect(() => {
    if (user?.role === 'manager' || user?.role === 'admin') {
      loadEmployees();
      loadShifts();
    }
  }, [user]);

  const loadEmployees = async () => {
    try {
      const response = await userAPI.getUsers();
      // Filter out current user and admins (only show employees/managers)
      const filteredEmployees = (response.data || []).filter(
        (emp: any) => emp.id !== user?.id && emp.role !== 'admin'
      );
      setEmployees(filteredEmployees);
    } catch (error) {
      console.error('Failed to load employees:', error);
      setError('Failed to load employees');
    }
  };

  const loadShifts = async () => {
    try {
      const response = await shiftAPI.getShifts();
      let shiftsData = response.data;
      if (!Array.isArray(shiftsData)) {
        shiftsData = shiftsData.data || [];
      }
      setShifts(Array.isArray(shiftsData) ? shiftsData : []);
    } catch (error) {
      console.error('Failed to load shifts:', error);
      setShifts([]);
    }
  };

  const handleAssignSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !shiftType || !scheduledDate) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get shift type ID (we'll use the code as ID for now, backend should handle this)
      await scheduleAPI.createSchedule({
        employee_id: selectedEmployee,
        shift_type_id: shiftType,
        scheduled_date: scheduledDate,
      });

      setSuccess('Schedule assigned successfully!');
      setSelectedEmployee('');
      setShiftType('');
      setScheduledDate('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkStartDate || !bulkShift || selectedEmployees.size === 0) {
      setBulkError('Please select a start date, shift, and at least one employee');
      return;
    }

    setBulkLoading(true);
    setBulkError('');
    setBulkSuccess('');

    try {
      let successCount = 0;
      let totalCount = 0;
      const selectedEmpArray = Array.from(selectedEmployees);
      
      // Generate dates for the specified number of days
      const startDate = new Date(bulkStartDate);
      const dates: string[] = [];
      
      for (let i = 0; i < bulkDays; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }

      // Assign to all employees for all dates
      for (const empId of selectedEmpArray) {
        for (let i = 0; i < dates.length; i++) {
          const date = dates[i];
          totalCount++;
          try {
            // Use RD (rest day) for marked rest days, otherwise use selected shift
            const shiftToAssign = restDays.has(i) ? 'RD' : bulkShift;
            
            await scheduleAPI.createSchedule({
              employee_id: empId,
              shift_type_id: shiftToAssign,
              scheduled_date: date,
            });
            successCount++;
          } catch (err) {
            console.error(`Failed to assign for ${empId} on ${date}:`, err);
          }
        }
      }

      setBulkSuccess(
        `✓ Successfully assigned ${successCount}/${totalCount} schedules (${selectedEmpArray.length} employees × ${bulkDays} days with ${restDays.size} rest day${restDays.size !== 1 ? 's' : ''})`
      );
      setBulkStartDate('');
      setBulkShift('');
      setBulkDays(15);
      setRestDays(new Set());
      setSelectedEmployees(new Set());
      
      setTimeout(() => setBulkSuccess(''), 4000);
    } catch (err: any) {
      setBulkError('Error processing bulk assignment');
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleEmployeeSelection = (empId: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(empId)) {
      newSelected.delete(empId);
    } else {
      newSelected.add(empId);
    }
    setSelectedEmployees(newSelected);
  };

  const toggleRestDay = (dayIndex: number) => {
    const newRestDays = new Set(restDays);
    if (newRestDays.has(dayIndex)) {
      newRestDays.delete(dayIndex);
    } else {
      newRestDays.add(dayIndex);
    }
    setRestDays(newRestDays);
  };

  const selectAllEmployees = () => {
    if (selectedEmployees.size === employees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(employees.map((emp) => emp.id)));
    }
  };

  if (user?.role !== 'manager' && user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="bg-white rounded-lg shadow p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manage Schedules</h1>
        <p className="text-gray-600 mt-2">Assign shifts to employees</p>
      </header>

      <main>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Single Assignment Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Assign Single Schedule</h2>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-700">
                💡 <strong>Note:</strong> If an employee already has a schedule on this date, it will be overwritten automatically.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded mb-4">
                {success}
              </div>
            )}

            <form onSubmit={handleAssignSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select an employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift Type
                </label>
                <select
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a shift</option>
                  {shifts.map((shift) => (
                    <option key={shift.code} value={shift.code}>
                      {shift.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Assigning...' : 'Assign Schedule'}
              </button>
            </form>
          </div>

          {/* Bulk Assignment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Bulk Assign Schedules</h2>

            <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
              <p className="text-sm text-green-700">
                📅 <strong>Bulk 15-Day Mode:</strong> Set up a schedule for 15 consecutive days and assign to multiple employees.
              </p>
            </div>

            {bulkError && (
              <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
                {bulkError}
              </div>
            )}

            {bulkSuccess && (
              <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded mb-4">
                {bulkSuccess}
              </div>
            )}

            <form onSubmit={handleBulkAssign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Start Date
                </label>
                <input
                  type="date"
                  value={bulkStartDate}
                  onChange={(e) => setBulkStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
                {bulkStartDate && (
                  <p className="text-xs text-gray-500 mt-2">
                    📅 Range:{' '}
                    {(() => {
                      const [year, month, day] = bulkStartDate.split('-');
                      const startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      const endDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day) + bulkDays - 1);
                      return `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
                    })()}
                    ({bulkDays} days)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Days (1-31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={bulkDays}
                  onChange={(e) => setBulkDays(Math.max(1, Math.min(31, parseInt(e.target.value) || 15)))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              {bulkStartDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Mark Rest Days (Click to toggle)
                  </label>
                  <div className="grid grid-cols-7 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {Array.from({ length: bulkDays }).map((_, i) => {
                      const [year, month, day] = bulkStartDate.split('-');
                      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day) + i);
                      const isRestDay = restDays.has(i);
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                      const dayNum = date.getDate();

                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleRestDay(i)}
                          className={`p-2 rounded text-center text-xs font-semibold transition ${
                            isRestDay
                              ? 'bg-green-500 text-white border-2 border-green-600'
                              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-xs text-gray-500">{dayName}</div>
                          <div className="text-sm">{dayNum}</div>
                          {isRestDay && <div className="text-xs mt-1">RD</div>}
                        </button>
                      );
                    })}
                  </div>
                  {restDays.size > 0 && (
                    <p className="text-xs text-green-600 font-semibold mt-2">
                      ✓ {restDays.size} rest day{restDays.size !== 1 ? 's' : ''} scheduled
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Shift Type
                </label>
                <select
                  value={bulkShift}
                  onChange={(e) => setBulkShift(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Select a shift</option>
                  {shifts.map((shift) => (
                    <option key={shift.code} value={shift.code}>
                      {shift.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Employees
                  </label>
                  <button
                    type="button"
                    onClick={selectAllEmployees}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    {selectedEmployees.size === employees.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>

                <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 max-h-64 overflow-y-auto space-y-2">
                  {employees.length > 0 ? (
                    employees.map((emp) => (
                      <label
                        key={emp.id}
                        className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmployees.has(emp.id)}
                          onChange={() => toggleEmployeeSelection(emp.id)}
                          className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <span className="ml-3 text-sm text-gray-900">
                          {emp.first_name} {emp.last_name}
                          <span className="text-xs text-gray-500 ml-2">({emp.role})</span>
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No employees available</p>
                  )}
                </div>

                {selectedEmployees.size > 0 && (
                  <p className="text-sm text-green-600 font-semibold mt-2">
                    ✓ {selectedEmployees.size} employee{selectedEmployees.size !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={bulkLoading || selectedEmployees.size === 0 || !bulkStartDate || !bulkShift}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400"
              >
                {bulkLoading
                  ? 'Assigning...'
                  : `Assign ${bulkDays}-Day Schedule to ${selectedEmployees.size} Employee${selectedEmployees.size !== 1 ? 's' : ''}`}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManageSchedulesPage;
