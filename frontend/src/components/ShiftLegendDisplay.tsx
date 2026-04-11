import React, { useState, useEffect } from 'react';
import { shiftAPI } from '../api/client';
import { getShiftColor } from '../utils/shiftColors';

interface Shift {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  created_at: string;
}

const ShiftLegendDisplay: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShifts = async () => {
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
      } finally {
        setLoading(false);
      }
    };

    fetchShifts();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Shift Legend</h3>
        <p className="text-gray-500">Loading shifts...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Shift Legend</h3>
      {shifts.length === 0 ? (
        <p className="text-gray-500">No shifts available</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift) => {
            const colors = getShiftColor(shift.code);
            return (
              <div
                key={shift.id}
                className={`p-3 border rounded-lg transition ${colors.bg} ${colors.border} ${colors.text}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`inline-block px-3 py-1 ${colors.badge} text-white rounded-full font-bold text-sm whitespace-nowrap`}>
                    {shift.code}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{shift.name}</p>
                    {shift.description && (
                      <p className="text-xs opacity-75 mt-1">{shift.description}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ShiftLegendDisplay;
