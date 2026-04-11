import React, { useState, useEffect } from 'react';
import { scheduleAPI, shiftAPI } from '../api/client';

interface QuickScheduleFormProps {
  employeeId: string;
  onSuccess: () => void;
}

const QuickScheduleForm: React.FC<QuickScheduleFormProps> = ({
  employeeId,
  onSuccess,
}) => {
  const [shiftType, setShiftType] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [shifts, setShifts] = useState<any[]>([]);

  useEffect(() => {
    loadShifts();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftType || !scheduledDate) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await scheduleAPI.createSchedule({
        employee_id: employeeId,
        shift_type_id: shiftType,
        scheduled_date: scheduledDate,
      });

      setShiftType('');
      setScheduledDate('');
      setShowForm(false);
      setSuccess(response.data.message || 'Schedule created successfully');
      setTimeout(() => setSuccess(''), 3000);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-blue-900">Quick Schedule Creation</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
        >
          {showForm ? 'Hide' : 'Show'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
              {success}
            </div>
          )}

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ⏳ <strong>Note:</strong> Your schedule requests will be reviewed and approved by your manager.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shift Type
              </label>
              <select
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded text-sm font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Schedule'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded text-sm font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default QuickScheduleForm;
