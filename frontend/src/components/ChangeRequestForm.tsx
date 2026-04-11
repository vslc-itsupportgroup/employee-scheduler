import React, { useState } from 'react';
import { changeRequestAPI } from '../api/client';

interface ChangeRequestFormProps {
  scheduleId: string;
  currentShift: string;
  onSuccess: () => void;
}

const ChangeRequestForm: React.FC<ChangeRequestFormProps> = ({
  scheduleId,
  currentShift,
  onSuccess,
}) => {
  const [shiftType, setShiftType] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const shifts = ['7-4', 'RD', 'VL', 'SPL', 'HDD'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await changeRequestAPI.createChangeRequest({
        schedule_id: scheduleId,
        requested_shift_type_id: shiftType,
        reason,
      });
      setShiftType('');
      setReason('');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Current Shift: {currentShift}
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Requested Shift
        </label>
        <select
          value={shiftType}
          onChange={(e) => setShiftType(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select a shift</option>
          {shifts.filter((s) => s !== currentShift).map((shift) => (
            <option key={shift} value={shift}>
              {shift}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reason for Change
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Please provide a reason for this change request"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
      >
        {loading ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  );
};

export default ChangeRequestForm;
