import React, { useState, useEffect } from 'react';
import { shiftAPI } from '../api/client';

interface Shift {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  created_at: string;
}

const ShiftLegendPage: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', description: '' });
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await shiftAPI.getShifts();
      console.log('Shifts response:', response);
      
      let shiftsData = response.data;
      if (!Array.isArray(shiftsData)) {
        shiftsData = shiftsData.data || [];
      }
      
      setShifts(Array.isArray(shiftsData) ? shiftsData : []);
    } catch (err: any) {
      console.error('Failed to fetch shifts:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load shifts');
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.name.trim()) {
      setError('Code and name are required');
      return;
    }

    try {
      if (editingShift) {
        await shiftAPI.updateShift(editingShift.id, formData);
      } else {
        await shiftAPI.createShift(formData);
      }
      
      setFormData({ code: '', name: '', description: '' });
      setEditingShift(null);
      setShowForm(false);
      setError('');
      await fetchShifts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save shift');
    }
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      code: shift.code,
      name: shift.name,
      description: shift.description || ''
    });
    setShowForm(true);
  };;

  const handleCancel = () => {
    setShowForm(false);
    setEditingShift(null);
    setFormData({ code: '', name: '', description: '' });
    setError('');
  };

  const handleDelete = async (shift: Shift) => {
    if (!window.confirm(`Delete shift "${shift.code}"? This cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(shift.id);
      await shiftAPI.deleteShift(shift.id);
      setError('');
      await fetchShifts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete shift');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading shifts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">⏰ Shift Management</h1>
        <p className="text-gray-600">Create and manage shift types for your scheduling system</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          + New Shift Type
        </button>
      )}

      {showForm && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            {editingShift ? `Edit Shift: ${editingShift.code}` : 'Create New Shift Type'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shift Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., 7-4, RD, VL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                  disabled={editingShift !== null}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shift Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Regular Shift"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., 7:00 AM - 4:00 PM"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                {editingShift ? 'Update Shift' : 'Create Shift'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {shifts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No shifts found
                </td>
              </tr>
            ) : (
              shifts.map((shift) => (
                <tr key={shift.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold text-sm">
                      {shift.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {shift.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {shift.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(shift)}
                      disabled={deleting === shift.id}
                      className="text-blue-600 hover:text-blue-900 font-medium disabled:text-gray-400"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(shift)}
                      disabled={deleting === shift.id}
                      className="text-red-600 hover:text-red-900 font-medium disabled:text-gray-400"
                    >
                      {deleting === shift.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ShiftLegendPage;
