import React, { useState, useEffect } from 'react';
import { scheduleAPI, shiftAPI, changeRequestAPI, approvalAPI } from '../api/client';

interface EmployeeScheduleDialogProps {
  date: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userRole?: string;
  userId?: string;
  changeRequests?: any[] | undefined;
}

interface ScheduleEntry {
  id: string;
  employee_id: string;
  shift_type_id: string;
  scheduled_date: string;
  shift_code: string;
  first_name: string;
  last_name: string;
}

const EmployeeScheduleDialog: React.FC<EmployeeScheduleDialogProps> = ({
  date,
  isOpen,
  onClose,
  onSuccess,
  userRole = 'employee',
  userId,
  changeRequests = [],
}) => {
  const isManager = userRole === 'manager' || userRole === 'admin';
  const [employees, setEmployees] = useState<ScheduleEntry[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingShift, setEditingShift] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [scheduleHistory, setScheduleHistory] = useState<{ [key: string]: any }>({});
  const [reviewingCRId, setReviewingCRId] = useState<string | null>(null);
  const [crRemarks, setCRRemarks] = useState('');
  const [crAction, setCRAction] = useState<'approve' | 'decline' | null>(null);
  const [approvingMergedCRId, setApprovingMergedCRId] = useState<string | null>(null);
  const [mergedCRRemarks, setMergedCRRemarks] = useState('');
  const changeRequestsList = Array.isArray(changeRequests) ? changeRequests : [];

  useEffect(() => {
    if (isOpen && date) {
      loadData();
    }
  }, [isOpen, date]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Loading schedules for date:', date);
      
      // Get employees scheduled for this date
      const schedResponse = await scheduleAPI.getSchedulesByDate(date);
      console.log('Schedule response:', schedResponse);
      
      let schedData = [];
      if (schedResponse?.data) {
        if (Array.isArray(schedResponse.data)) {
          schedData = schedResponse.data;
        } else if (Array.isArray(schedResponse.data.data)) {
          schedData = schedResponse.data.data;
        }
      }

      // For employees, only show their own schedule
      if (!isManager && userId) {
        schedData = schedData.filter((s: any) => s.employee_id === userId);
      }

      setEmployees(schedData);

      // Get available shifts
      const shiftsResponse = await shiftAPI.getShifts();
      let shiftsData = shiftsResponse?.data || [];
      if (!Array.isArray(shiftsData) && shiftsData?.data) {
        shiftsData = shiftsData.data;
      }
      setShifts(Array.isArray(shiftsData) ? shiftsData : []);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      const errorMsg = err?.response?.data?.error || err?.message || 'Failed to load schedule data';
      console.error('Error message:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getGroupedAndSortedEmployees = () => {
    // Sort by shift type, then by name
    const sorted = [...employees].sort((a, b) => {
      // First sort by shift code
      const shiftCompare = (a.shift_code || '').localeCompare(b.shift_code || '');
      if (shiftCompare !== 0) return shiftCompare;
      
      // Then sort by name (first name, then last name)
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Group by shift code
    const grouped: { [key: string]: any[] } = {};
    sorted.forEach((emp) => {
      const shiftCode = emp.shift_code || 'Unknown';
      if (!grouped[shiftCode]) {
        grouped[shiftCode] = [];
      }
      grouped[shiftCode].push(emp);
    });

    return grouped;
  };

  const handleUpdateShift = async (scheduleId: string, newShiftCode: string) => {
    try {
      if (isManager) {
        // Manager: direct update
        await scheduleAPI.updateSchedule(scheduleId, {
          shift_type_id: newShiftCode,
        });
        setSuccessMsg('Schedule updated successfully');
      } else {
        // Employee: check for pending change request first
        if (hasPendingChangeRequest(scheduleId)) {
          setError('You already have a pending change request for this schedule. Please wait for manager approval before requesting another change.');
          return;
        }
        // Employee: create change request
        await changeRequestAPI.createChangeRequest({
          schedule_id: scheduleId,
          requested_shift_type_id: newShiftCode,
          reason: `Changed via calendar - new shift: ${newShiftCode}`,
        });
        setSuccessMsg('Change request submitted for approval');
      }
      setEditingId(null);
      setTimeout(() => {
        setSuccessMsg('');
        onSuccess();
        loadData();
      }, 2000);
    } catch (err) {
      setError('Failed to update shift');
    }
  };

  const handleMarkAsLeave = async (scheduleId: string) => {
    try {
      if (isManager) {
        // Manager: direct mark as leave
        await scheduleAPI.updateSchedule(scheduleId, {
          shift_type_id: 'VL',
        });
        setSuccessMsg('Marked as leave');
      } else {
        // Employee: check for pending change request first
        if (hasPendingChangeRequest(scheduleId)) {
          setError('You already have a pending change request for this schedule. Please wait for manager approval before requesting another change.');
          return;
        }
        // Employee: create change request for leave
        await changeRequestAPI.createChangeRequest({
          schedule_id: scheduleId,
          requested_shift_type_id: 'VL',
          reason: 'Requesting leave',
        });
        setSuccessMsg('Leave request submitted for approval');
      }
      setTimeout(() => {
        setSuccessMsg('');
        onSuccess();
        loadData();
      }, 2000);
    } catch (err) {
      setError('Failed to mark as leave');
    }
  };

  const handleApproveSchedule = async (scheduleId: string) => {
    try {
      setApprovingId(scheduleId);
      setError('');
      await scheduleAPI.updateSchedule(scheduleId, { status: 'approved' });
      setSuccessMsg('Schedule approved successfully');
      setTimeout(() => {
        setSuccessMsg('');
        onSuccess();
        loadData();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to approve schedule:', err);
      setError('Failed to approve schedule');
    } finally {
      setApprovingId(null);
    }
  };

  const handleDeclineSchedule = async (scheduleId: string) => {
    try {
      setApprovingId(scheduleId);
      setError('');
      await scheduleAPI.updateSchedule(scheduleId, { status: 'rejected' });
      setSuccessMsg('Schedule declined');
      setTimeout(() => {
        setSuccessMsg('');
        onSuccess();
        loadData();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to decline schedule:', err);
      setError('Failed to decline schedule');
    } finally {
      setApprovingId(null);
    }
  };

  const getShiftColor = (code: string) => {
    const colors: { [key: string]: { bg: string; text: string } } = {
      '7-4': { bg: 'bg-blue-100', text: 'text-blue-800' },
      RD: { bg: 'bg-green-100', text: 'text-green-800' },
      VL: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      SPL: { bg: 'bg-purple-100', text: 'text-purple-800' },
      HDD: { bg: 'bg-red-100', text: 'text-red-800' },
    };
    return colors[code] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  };

  const hasPendingChangeRequest = (scheduleId: string) => {
    return changeRequestsList.some(
      (cr: any) => cr.schedule_id === scheduleId && cr.status === 'pending'
    );
  };

  const getChangeRequestForSchedule = (scheduleId: string) => {
    return changeRequestsList.find(
      (cr: any) => cr.schedule_id === scheduleId && cr.status === 'pending'
    );
  };

  const getChangeRequestsForDate = (dateStr: string) => {
    return changeRequestsList.filter((cr: any) => {
      if (!cr.scheduled_date) return false;
      const crDate = new Date(cr.scheduled_date);
      const localDateStr = `${crDate.getFullYear()}-${String(crDate.getMonth() + 1).padStart(2, '0')}-${String(crDate.getDate()).padStart(2, '0')}`;
      return localDateStr === dateStr && cr.status === 'pending';
    });
  };

  const getUnmergedChangeRequestsForDate = (dateStr: string) => {
    return getChangeRequestsForDate(dateStr).filter((cr: any) => {
      // Only show change requests that don't have a corresponding schedule
      return !employees.some((emp: any) => emp.id === cr.schedule_id);
    });
  };

  const handleApproveChangeRequest = async (crId: string) => {
    try {
      setApprovingId(crId);
      setError('');
      await approvalAPI.approveChangeRequest(crId, {
        status: 'approved',
        remarks: crRemarks,
      });
      setSuccessMsg('Change request approved');
      setReviewingCRId(null);
      setCRRemarks('');
      setCRAction(null);
      setTimeout(() => {
        setSuccessMsg('');
        onSuccess();
        loadData();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to approve change request:', err);
      setError('Failed to approve change request');
    } finally {
      setApprovingId(null);
    }
  };

  const handleDeclineChangeRequest = async (crId: string) => {
    try {
      setApprovingId(crId);
      setError('');
      await approvalAPI.approveChangeRequest(crId, {
        status: 'rejected',
        remarks: crRemarks,
      });
      setSuccessMsg('Change request declined');
      setReviewingCRId(null);
      setCRRemarks('');
      setCRAction(null);
      setTimeout(() => {
        setSuccessMsg('');
        onSuccess();
        loadData();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to decline change request:', err);
      setError('Failed to decline change request');
    } finally {
      setApprovingId(null);
    }
  };

  if (!isOpen) return null;

  // Parse date string (YYYY-MM-DD) without timezone interpretation
  const [year, month, day] = date.split('-');
  const displayDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 transition-opacity duration-300 ${
      isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}>
      <div className={`bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${
        isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        <div className="sticky top-0 bg-blue-600 text-white p-4 sm:p-6 flex justify-between items-start sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-lg sm:text-2xl font-bold">Schedule for {displayDate}</h2>
            <p className="text-blue-100 text-xs sm:text-sm">
              {employees.length} employee(s) assigned
              {!isManager && ' (Changes require approval)'}
              {isManager && ' (Approve pending schedules below)'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white text-xl sm:text-2xl font-bold hover:bg-blue-700 p-2 rounded flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded mb-4">
              {successMsg}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No employees scheduled for this date</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(getGroupedAndSortedEmployees()).map(([shiftCode, empsInShift]) => (
                <div key={shiftCode} className={`border rounded-lg overflow-hidden`}>
                  <div className={`px-4 py-2 font-semibold ${getShiftColor(shiftCode).bg} ${getShiftColor(shiftCode).text} text-base`}>
                    {shiftCode}
                  </div>
                  <div className="space-y-2 p-3">
                    {empsInShift.map((emp) => {
                      const isPending = emp.status === 'pending';
                      const pendingChangeRequest = getChangeRequestForSchedule(emp.id);
                      
                      return (
                        <div
                          key={emp.id}
                          className={`p-4 border rounded-lg hover:shadow transition ${
                            pendingChangeRequest
                              ? 'border-blue-300 bg-blue-50'
                              : isPending
                              ? 'border-orange-300 bg-orange-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">
                                {emp.first_name} {emp.last_name}
                              </p>
                              {pendingChangeRequest && (
                                <p className="text-xs text-blue-600 font-semibold mt-1 uppercase">
                                  📝 Change Request
                                </p>
                              )}
                              {isPending && !pendingChangeRequest && (
                                <p className="text-xs text-orange-600 font-semibold mt-1 uppercase">
                                  ⚠️ Pending Approval
                                </p>
                              )}
                              {pendingChangeRequest ? (
                                <div className="mt-2 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className={`px-3 py-1 rounded text-sm font-semibold ${getShiftColor(emp.shift_code).bg} ${getShiftColor(emp.shift_code).text}`}>
                                      {emp.shift_code}
                                    </div>
                                    <span className="text-gray-500">→</span>
                                    <div className={`px-3 py-1 rounded text-sm font-semibold ${getShiftColor(pendingChangeRequest.requested_shift).bg} ${getShiftColor(pendingChangeRequest.requested_shift).text}`}>
                                      {pendingChangeRequest.requested_shift}
                                    </div>
                                  </div>
                                  {pendingChangeRequest.reason && (
                                    <p className="text-xs text-gray-600">
                                      <span className="font-medium">Reason:</span> {pendingChangeRequest.reason}
                                    </p>
                                  )}
                                </div>
                              ) : null}
                            </div>

                            {pendingChangeRequest && isManager ? (
                              <div className="mt-3 pt-3 border-t border-blue-200 space-y-3">
                                <textarea
                                  value={approvingMergedCRId === pendingChangeRequest.id ? mergedCRRemarks : ''}
                                  onChange={(e) => {
                                    setMergedCRRemarks(e.target.value);
                                    setApprovingMergedCRId(pendingChangeRequest.id);
                                  }}
                                  onFocus={() => setApprovingMergedCRId(pendingChangeRequest.id)}
                                  placeholder="Add comments for decline (required for decline)..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                  rows={2}
                                />
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <button
                                    onClick={async () => {
                                      try {
                                        setApprovingId(pendingChangeRequest.id);
                                        setError('');
                                        await approvalAPI.approveChangeRequest(pendingChangeRequest.id, {
                                          status: 'approved',
                                          remarks: mergedCRRemarks,
                                        });
                                        setSuccessMsg('Change request approved');
                                        setMergedCRRemarks('');
                                        setApprovingMergedCRId(null);
                                        setTimeout(() => {
                                          setSuccessMsg('');
                                          onSuccess();
                                          loadData();
                                        }, 1500);
                                      } catch (err: any) {
                                        console.error('Failed to approve change request:', err);
                                        setError('Failed to approve change request');
                                      } finally {
                                        setApprovingId(null);
                                      }
                                    }}
                                    disabled={approvingId === pendingChangeRequest.id}
                                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700 disabled:bg-gray-400 transition"
                                  >
                                    {approvingId === pendingChangeRequest.id ? '...' : 'Approve'}
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        setApprovingId(pendingChangeRequest.id);
                                        setError('');
                                        await approvalAPI.approveChangeRequest(pendingChangeRequest.id, {
                                          status: 'rejected',
                                          remarks: mergedCRRemarks,
                                        });
                                        setSuccessMsg('Change request declined');
                                        setMergedCRRemarks('');
                                        setApprovingMergedCRId(null);
                                        setTimeout(() => {
                                          setSuccessMsg('');
                                          onSuccess();
                                          loadData();
                                        }, 1500);
                                      } catch (err: any) {
                                        console.error('Failed to decline change request:', err);
                                        setError('Failed to decline change request');
                                      } finally {
                                        setApprovingId(null);
                                      }
                                    }}
                                    disabled={!mergedCRRemarks.trim() || approvingId === pendingChangeRequest.id}
                                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700 disabled:bg-gray-400 transition"
                                  >
                                    {approvingId === pendingChangeRequest.id ? '...' : 'Decline'}
                                  </button>
                                </div>
                              </div>
                            ) : pendingChangeRequest && !isManager ? (
                              <div className="text-xs bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded font-medium">
                                ⏳ Pending Review
                              </div>
                            ) : isPending && isManager ? (
                              <div className="flex flex-col sm:flex-row gap-2 ml-0 sm:ml-4 mt-2 sm:mt-0">
                                <button
                                  onClick={() => handleApproveSchedule(emp.id)}
                                  disabled={approvingId === emp.id}
                                  className="px-3 py-2 bg-green-600 text-white rounded text-xs sm:text-sm font-semibold hover:bg-green-700 disabled:bg-gray-400 transition"
                                >
                                  {approvingId === emp.id ? '...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleDeclineSchedule(emp.id)}
                                  disabled={approvingId === emp.id}
                                  className="px-3 py-2 bg-red-600 text-white rounded text-xs sm:text-sm font-semibold hover:bg-red-700 disabled:bg-gray-400 transition"
                                >
                                  {approvingId === emp.id ? '...' : 'Decline'}
                                </button>
                              </div>
                            ) : !isPending && !pendingChangeRequest ? (
                              <div className="flex flex-col gap-2 ml-0 sm:ml-4 items-start sm:items-end mt-2 sm:mt-0">
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                  <button
                                    onClick={() => {
                                      setEditingId(emp.id);
                                      setEditingShift(emp.shift_code);
                                    }}
                                    className="px-3 py-2 bg-blue-600 text-white rounded text-xs sm:text-sm font-semibold hover:bg-blue-700 transition"
                                  >
                                    {isManager ? 'Change' : 'Request Change'}
                                  </button>
                                  <button
                                    onClick={() => handleMarkAsLeave(emp.id)}
                                    className="px-3 py-2 bg-yellow-600 text-white rounded text-xs sm:text-sm font-semibold hover:bg-yellow-700 transition"
                                  >
                                    {isManager ? 'Mark as Leave' : 'Request Leave'}
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          {editingId === emp.id && !isPending && (
                            <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2 items-center">
                              <select
                                value={editingShift}
                                onChange={(e) => setEditingShift(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                              >
                                {shifts.map((shift) => (
                                  <option key={shift.code} value={shift.code}>
                                    {shift.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleUpdateShift(emp.id, editingShift)}
                                className="px-3 py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-3 py-2 bg-gray-400 text-white rounded text-sm font-semibold hover:bg-gray-500"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isManager && getUnmergedChangeRequestsForDate(date).length > 0 && (
            <div className="mt-8 border-t border-gray-300 pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📝 Additional Pending Change Requests</h3>
              <div className="space-y-4">
                {getUnmergedChangeRequestsForDate(date).map((cr) => (
                  <div
                    key={cr.id}
                    className="border border-blue-300 bg-blue-50 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{cr.employee_name}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Current:</span> {cr.current_shift}
                          </p>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Requested:</span> {cr.requested_shift}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Reason:</span> {cr.reason || 'No reason provided'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {reviewingCRId === cr.id ? (
                      <div className="mt-4 pt-4 border-t border-blue-200 space-y-3">
                        <textarea
                          value={crRemarks}
                          onChange={(e) => setCRRemarks(e.target.value)}
                          placeholder="Add comments or reason for decision (required for decline)..."
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => {
                              setCRAction('approve');
                              handleApproveChangeRequest(cr.id);
                            }}
                            disabled={approvingId === cr.id}
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700 disabled:bg-gray-400 transition"
                          >
                            {approvingId === cr.id ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => {
                              setCRAction('decline');
                              handleDeclineChangeRequest(cr.id);
                            }}
                            disabled={!crRemarks.trim() || approvingId === cr.id}
                            className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700 disabled:bg-gray-400 transition"
                          >
                            {approvingId === cr.id ? '...' : 'Decline'}
                          </button>
                          <button
                            onClick={() => {
                              setReviewingCRId(null);
                              setCRRemarks('');
                              setCRAction(null);
                            }}
                            className="flex-1 px-3 py-2 bg-gray-400 text-white rounded text-sm font-semibold hover:bg-gray-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setReviewingCRId(cr.id);
                            setCRRemarks('');
                            setCRAction(null);
                          }}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition"
                        >
                          Review
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeScheduleDialog;
