import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { approvalAPI } from '../api/client';

const ApprovalsPage: React.FC = () => {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [remarks, setRemarks] = useState('');
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.role === 'manager' || user?.role === 'admin') {
      loadApprovals();
    }
  }, [user]);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const response = await approvalAPI.getPendingApprovals();
      setApprovals(response.data || []);
    } catch (error) {
      console.error('Failed to load approvals:', error);
      setError('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: string) => {
    try {
      await approvalAPI.approveChangeRequest(approvalId, {
        status: 'approved',
        remarks,
      });
      setSelectedApproval(null);
      setRemarks('');
      setSuccess('Approval request approved successfully');
      setTimeout(() => setSuccess(''), 3000);
      loadApprovals();
    } catch (error) {
      console.error('Failed to approve:', error);
      setError('Failed to approve request');
    }
  };

  const handleReject = async (approvalId: string) => {
    try {
      await approvalAPI.approveChangeRequest(approvalId, {
        status: 'rejected',
        remarks,
      });
      setSelectedApproval(null);
      setRemarks('');
      setSuccess('Approval request rejected successfully');
      setTimeout(() => setSuccess(''), 3000);
      loadApprovals();
    } catch (error) {
      console.error('Failed to reject:', error);
      setError('Failed to reject request');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      setBulkAction(null);
      let successCount = 0;
      
      for (const id of selectedIds) {
        try {
          await approvalAPI.approveChangeRequest(id, {
            status: 'approved',
            remarks: '',
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to approve ${id}:`, err);
        }
      }
      
      setSelectedIds(new Set());
      setSuccess(`${successCount} request(s) approved successfully`);
      setTimeout(() => setSuccess(''), 3000);
      loadApprovals();
    } catch (error) {
      console.error('Failed to bulk approve:', error);
      setError('Failed to bulk approve requests');
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      setBulkAction(null);
      let successCount = 0;
      
      for (const id of selectedIds) {
        try {
          await approvalAPI.approveChangeRequest(id, {
            status: 'rejected',
            remarks: '',
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to reject ${id}:`, err);
        }
      }
      
      setSelectedIds(new Set());
      setSuccess(`${successCount} request(s) rejected successfully`);
      setTimeout(() => setSuccess(''), 3000);
      loadApprovals();
    } catch (error) {
      console.error('Failed to bulk reject:', error);
      setError('Failed to bulk reject requests');
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === approvals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(approvals.map(a => a.id)));
    }
  };

  if (user?.role !== 'manager' && user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">
          <p className="text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="bg-white rounded-lg shadow p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="text-gray-600 mt-2">
          {approvals.length} pending request{approvals.length !== 1 ? 's' : ''}
        </p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
          <button
            onClick={() => setError('')}
            className="float-right font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      <main>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading approvals...</p>
          </div>
        ) : approvals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">No pending approvals</p>
          </div>
        ) : (
          <>
            {selectedIds.size > 0 && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <p className="text-blue-900 font-semibold">
                    {selectedIds.size} request{selectedIds.size !== 1 ? 's' : ''} selected
                  </p>
                  <div className="space-x-2">
                    <button
                      onClick={() => setBulkAction(bulkAction === 'approve' ? null : 'approve')}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${
                        bulkAction === 'approve'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {bulkAction === 'approve' ? 'Click to Confirm Approve' : 'Bulk Approve'}
                    </button>
                    <button
                      onClick={() => setBulkAction(bulkAction === 'reject' ? null : 'reject')}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${
                        bulkAction === 'reject'
                          ? 'bg-red-600 text-white'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {bulkAction === 'reject' ? 'Click to Confirm Decline' : 'Bulk Decline'}
                    </button>
                  </div>
                </div>
                {bulkAction && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={bulkAction === 'approve' ? handleBulkApprove : handleBulkReject}
                      className={`px-4 py-2 rounded-lg font-semibold text-white ${
                        bulkAction === 'approve' ? 'bg-green-700 hover:bg-green-800' : 'bg-red-700 hover:bg-red-800'
                      }`}
                    >
                      Confirm {bulkAction === 'approve' ? 'Approve' : 'Decline'} All Selected
                    </button>
                    <button
                      onClick={() => setBulkAction(null)}
                      className="px-4 py-2 rounded-lg font-semibold bg-gray-300 text-gray-800 hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === approvals.length && approvals.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Original → Requested
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {approvals.map((approval) => (
                    <tr
                      key={approval.id}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(approval.id)}
                          onChange={() => toggleSelection(approval.id)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                        onClick={() => setSelectedApproval(approval)}
                      >
                        {approval.employee_name}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"
                        onClick={() => setSelectedApproval(approval)}
                      >
                        {approval.scheduled_date && typeof approval.scheduled_date === 'string' && approval.scheduled_date.match(/^\d{4}-\d{2}-\d{2}$/)
                          ? (() => {
                              const [year, month, day] = approval.scheduled_date.split('-');
                              return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString();
                            })()
                          : new Date(approval.created_at).toLocaleDateString()}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"
                        onClick={() => setSelectedApproval(approval)}
                      >
                        <span className="font-medium">{approval.current_shift || '-'}</span>
                        <span className="text-gray-400"> → </span>
                        <span className="font-medium text-blue-600">{approval.requested_shift}</span>
                      </td>
                      <td
                        className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate"
                        onClick={() => setSelectedApproval(approval)}
                      >
                        {approval.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApproval(approval);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {selectedApproval && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">
                Review Change Request
              </h2>

              <div className="mb-8 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee
                  </label>
                  <p className="text-gray-800 font-medium">{selectedApproval.employee_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <p className="text-gray-800">
                    {selectedApproval.scheduled_date && typeof selectedApproval.scheduled_date === 'string' && selectedApproval.scheduled_date.match(/^\d{4}-\d{2}-\d{2}$/)
                      ? (() => {
                          const [year, month, day] = selectedApproval.scheduled_date.split('-');
                          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          });
                        })()
                      : new Date(selectedApproval.created_at).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Original Shift
                    </label>
                    <p className="text-gray-800 font-medium">{selectedApproval.current_shift || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Requested Shift
                    </label>
                    <p className="text-gray-800 font-medium text-blue-600">{selectedApproval.requested_shift}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <p className="text-gray-800">{selectedApproval.reason}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Remarks (Optional)
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add comments if needed..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setSelectedApproval(null);
                    setRemarks('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedApproval.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleApprove(selectedApproval.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ApprovalsPage;
