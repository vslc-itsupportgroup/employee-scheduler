import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI, scheduleAPI, shiftAPI, securityAPI } from '../api/client';
import { getEmployeeColor } from '../utils/employeeColors';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'employee' | 'manager' | 'admin';
  color_code?: string | null;
  manager_id?: string | null;
  department?: string;
  is_active: boolean;
  two_fa_enabled?: boolean;
  password_expires_at?: string | null;
}

interface PasswordPolicy {
  id: string;
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  password_expiry_days: number;
  password_history_count: number;
  description: string;
  updated_at: string;
}

const ManageUsersPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterManagerId, setFilterManagerId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showPasswordPolicyModal, setShowPasswordPolicyModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [bulkAction, setBulkAction] = useState<'enable-2fa' | 'disable-2fa' | 'force-password-change' | 'reset-expiry' | null>(null);
  const [showBulkManagerModal, setShowBulkManagerModal] = useState(false);
  const [showBulkRoleModal, setShowBulkRoleModal] = useState(false);
  const [showBulkScheduleModal, setShowBulkScheduleModal] = useState(false);
  const [bulkNewManagerId, setBulkNewManagerId] = useState<string | null>(null);
  const [bulkNewRole, setBulkNewRole] = useState('');
  const [bulkScheduleData, setBulkScheduleData] = useState({ shift: '', date: '' });
  const [newRole, setNewRole] = useState('');
  const [newManagerId, setNewManagerId] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState({ shift: '', date: '' });
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null);
  const [policyForm, setPolicyForm] = useState({
    min_length: 8,
    require_uppercase: true,
    require_lowercase: true,
    require_numbers: true,
    require_special_chars: true,
    password_expiry_days: 90,
    password_history_count: 3,
    description: ''
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers();
      loadShifts();
      loadPasswordPolicy();
    }
  }, [user]);

  const loadPasswordPolicy = async () => {
    try {
      const response = await fetch('/api/password-policy/policy', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPasswordPolicy(data.policy);
        setPolicyForm({
          min_length: data.policy.min_length,
          require_uppercase: data.policy.require_uppercase,
          require_lowercase: data.policy.require_lowercase,
          require_numbers: data.policy.require_numbers,
          require_special_chars: data.policy.require_special_chars,
          password_expiry_days: data.policy.password_expiry_days,
          password_history_count: data.policy.password_history_count,
          description: data.policy.description
        });
      }
    } catch (err) {
      console.error('Failed to load password policy:', err);
    }
  };

  const handleUpdatePasswordPolicy = async () => {
    try {
      const response = await fetch('/api/password-policy/policy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(policyForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update policy');
      }

      const data = await response.json();
      setPasswordPolicy(data.policy);
      setSuccess('Password policy updated successfully!');
      setShowPasswordPolicyModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password policy');
    }
  };

  const loadShifts = async () => {
    try {
      const response = await shiftAPI.getShifts();
      let shiftsData = response.data;
      if (!Array.isArray(shiftsData)) {
        shiftsData = shiftsData.data || [];
      }
      const loadedShifts = Array.isArray(shiftsData) ? shiftsData : [];
      setShifts(loadedShifts);
      // Set first shift as default
      if (loadedShifts.length > 0) {
        setScheduleData({ shift: loadedShifts[0].code, date: '' });
      }
    } catch (error) {
      console.error('Failed to load shifts:', error);
      setShifts([]);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUsers();
      setUsers(response.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on all criteria
  const filteredUsers = users.filter((u) => {
    const searchTerm = searchQuery.toLowerCase();
    
    // Text search filter
    const matchesSearch = 
      u.first_name.toLowerCase().includes(searchTerm) ||
      u.last_name.toLowerCase().includes(searchTerm) ||
      u.email.toLowerCase().includes(searchTerm) ||
      (u.department && u.department.toLowerCase().includes(searchTerm));

    // Role filter
    const matchesRole = filterRole === 'all' || u.role === filterRole;

    // Manager filter
    const matchesManager = 
      filterManagerId === 'all' || 
      (filterManagerId === 'none' && !u.manager_id) ||
      (filterManagerId !== 'none' && u.manager_id === filterManagerId);

    // Status filter
    let matchesStatus = true;
    if (filterStatus === 'active') {
      matchesStatus = u.is_active;
    } else if (filterStatus === 'inactive') {
      matchesStatus = !u.is_active;
    } else if (filterStatus === '2fa_enabled') {
      matchesStatus = u.two_fa_enabled === true;
    } else if (filterStatus === '2fa_disabled') {
      matchesStatus = u.two_fa_enabled !== true;
    }

    return matchesSearch && matchesRole && matchesManager && matchesStatus;
  });

  // Get managers for filter dropdown
  const managers = users.filter((u) => u.role === 'manager' || u.role === 'admin');

  // Check if any filters are active
  const activeFilterCount = 
    (filterRole !== 'all' ? 1 : 0) +
    (filterManagerId !== 'all' ? 1 : 0) +
    (filterStatus !== 'all' ? 1 : 0) +
    (searchQuery ? 1 : 0);

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterRole('all');
    setFilterManagerId('all');
    setFilterStatus('all');
    setSelectedUserIds(new Set());
  };

  // Handle checkbox toggle for individual user
  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  // Handle select all checkbox
  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      // Deselect all
      setSelectedUserIds(new Set());
    } else {
      // Select all visible (filtered) users
      setSelectedUserIds(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: 'enable-2fa' | 'disable-2fa' | 'force-password-change' | 'reset-expiry') => {
    if (selectedUserIds.size === 0) {
      setError('Please select at least one user');
      return;
    }

    try {
      const selectedUsers = Array.from(selectedUserIds);

      if (action === 'enable-2fa') {
        for (const userId of selectedUsers) {
          await securityAPI.enableUserTwoFA(userId);
        }
        setUsers(
          users.map((u) =>
            selectedUserIds.has(u.id) ? { ...u, two_fa_enabled: true } : u
          )
        );
        setSuccess(`Enabled 2FA for ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`);
      } else if (action === 'disable-2fa') {
        for (const userId of selectedUsers) {
          await securityAPI.disableUserTwoFA(userId);
        }
        setUsers(
          users.map((u) =>
            selectedUserIds.has(u.id) ? { ...u, two_fa_enabled: false } : u
          )
        );
        setSuccess(`Disabled 2FA for ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`);
      } else if (action === 'force-password-change') {
        // Call backend to force password change
        const response = await fetch('/api/users/bulk/force-password-change', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ user_ids: selectedUsers }),
        });

        if (!response.ok) {
          let errorMessage = 'Failed to force password change';
          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } else {
              errorMessage = `Server error (${response.status}): Endpoint may not exist`;
            }
          } catch (e) {
            errorMessage = `Server error (${response.status}): ${errorMessage}`;
          }
          throw new Error(errorMessage);
        }

        setSuccess(`Forced password change for ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`);
      } else if (action === 'reset-expiry') {
        // Call backend to reset password expiry
        const response = await fetch('/api/users/bulk/reset-password-expiry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ user_ids: selectedUsers }),
        });

        if (!response.ok) {
          let errorMessage = 'Failed to reset password expiry';
          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } else {
              errorMessage = `Server error (${response.status}): Endpoint may not exist`;
            }
          } catch (e) {
            errorMessage = `Server error (${response.status}): ${errorMessage}`;
          }
          throw new Error(errorMessage);
        }

        setSuccess(`Reset password expiry for ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`);
      }

      setSelectedUserIds(new Set());
      setBulkAction(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || `Failed to ${action}`);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !newRole) return;

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) throw new Error('Failed to update role');

      setUsers(
        users.map((u) => (u.id === selectedUser.id ? { ...u, role: newRole as any } : u))
      );
      setShowRoleModal(false);
      setNewRole('');
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    }
  };

  const handleCreateSchedule = async () => {
    if (!selectedUser || !scheduleData.shift || !scheduleData.date) {
      setError('All fields are required');
      return;
    }

    try {
      await scheduleAPI.createSchedule({
        employee_id: selectedUser.id,
        shift_type_id: scheduleData.shift,
        scheduled_date: scheduleData.date,
      });

      setError('');
      setShowScheduleModal(false);
      setScheduleData({ shift: '7-4', date: '' });
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create schedule');
    }
  };

  const handleAssignManager = async () => {
    if (!selectedUser) return;

    try {
      await userAPI.assignManager(selectedUser.id, newManagerId);

      setUsers(
        users.map((u) =>
          u.id === selectedUser.id ? { ...u, manager_id: newManagerId } : u
        )
      );

      setShowManagerModal(false);
      setNewManagerId(null);
      setSelectedUser(null);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign manager');
    }
  };

  const handle2FAToggle = async (enable: boolean) => {
    if (!selectedUser) return;

    try {
      if (enable) {
        await securityAPI.enableUserTwoFA(selectedUser.id);
      } else {
        await securityAPI.disableUserTwoFA(selectedUser.id);
      }

      setUsers(
        users.map((u) =>
          u.id === selectedUser.id ? { ...u, two_fa_enabled: enable } : u
        )
      );

      setShow2FAModal(false);
      setSelectedUser(null);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${enable ? 'enable' : 'disable'} 2FA`);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedUser || !newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change password');
      }

      setSuccess(`Password changed successfully for ${selectedUser.first_name} ${selectedUser.last_name}`);
      setShowChangePasswordModal(false);
      setNewPassword('');
      setSelectedUser(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      // Remove user from list or mark as inactive
      setUsers(users.filter((u) => u.id !== selectedUser.id));
      setSuccess(`${selectedUser.first_name} ${selectedUser.last_name} has been removed`);
      setShowDeleteUserModal(false);
      setSelectedUser(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  // Bulk manager assignment
  const handleBulkAssignManager = async () => {
    if (selectedUserIds.size === 0) {
      setError('Please select at least one user');
      return;
    }

    try {
      const selectedUserArray = Array.from(selectedUserIds);
      
      for (const userId of selectedUserArray) {
        const response = await userAPI.assignManager(userId, bulkNewManagerId);
        if (!response) {
          throw new Error('Failed to assign manager');
        }
      }

      setUsers(
        users.map((u) =>
          selectedUserIds.has(u.id) ? { ...u, manager_id: bulkNewManagerId } : u
        )
      );

      setShowBulkManagerModal(false);
      setBulkNewManagerId(null);
      setSelectedUserIds(new Set());
      setSuccess(`Manager assigned to ${selectedUserArray.length} user${selectedUserArray.length !== 1 ? 's' : ''}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to assign manager';
      setError(errorMsg);
    }
  };

  // Bulk role change
  const handleBulkChangeRole = async () => {
    if (selectedUserIds.size === 0) {
      setError('Please select at least one user');
      return;
    }

    if (!bulkNewRole) {
      setError('Please select a role');
      return;
    }

    try {
      const selectedUserArray = Array.from(selectedUserIds);

      for (const userId of selectedUserArray) {
        const response = await fetch(`/api/users/${userId}/role`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ role: bulkNewRole }),
        });

        if (!response.ok) {
          let errorMessage = 'Failed to change role';
          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            }
          } catch (e) {
            // Continue with generic error message
          }
          throw new Error(errorMessage);
        }
      }

      setUsers(
        users.map((u) =>
          selectedUserIds.has(u.id) ? { ...u, role: bulkNewRole as any } : u
        )
      );

      setShowBulkRoleModal(false);
      setBulkNewRole('');
      setSelectedUserIds(new Set());
      setSuccess(`Role changed to ${bulkNewRole} for ${selectedUserArray.length} user${selectedUserArray.length !== 1 ? 's' : ''}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to change role');
    }
  };

  // Bulk schedule creation
  const handleBulkCreateSchedule = async () => {
    if (selectedUserIds.size === 0) {
      setError('Please select at least one user');
      return;
    }

    if (!bulkScheduleData.shift || !bulkScheduleData.date) {
      setError('Please select both shift and date');
      return;
    }

    try {
      const selectedUserArray = Array.from(selectedUserIds);

      for (const userId of selectedUserArray) {
        const response = await scheduleAPI.createSchedule({
          employee_id: userId,
          shift_type_id: bulkScheduleData.shift,
          scheduled_date: bulkScheduleData.date,
        });

        if (!response?.status || response.status >= 400) {
          throw new Error('Failed to create schedule');
        }
      }

      setShowBulkScheduleModal(false);
      setBulkScheduleData({ shift: '', date: '' });
      setSelectedUserIds(new Set());
      setSuccess(`Schedule created for ${selectedUserArray.length} user${selectedUserArray.length !== 1 ? 's' : ''}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create schedule');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'employee':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleCapabilities = (role: string) => {
    const capabilities: Record<string, string[]> = {
      admin: [
        '✅ View all users',
        '✅ Manage user roles',
        '✅ Create schedules for anyone',
        '✅ Auto-approve own schedules',
        '✅ Approve/reject employee requests',
      ],
      manager: [
        '✅ View own team',
        '✅ Create schedules for team',
        '✅ Auto-approve own schedules',
        '✅ Approve/reject employee requests',
      ],
      employee: [
        '✅ View own schedule',
        '✅ Request schedule changes',
        '⏳ Await manager approval',
      ],
    };
    return capabilities[role] || [];
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold">
            Only admins can access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="bg-white rounded-lg shadow p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
        <p className="text-gray-600 mt-2">
          {users.length} registered user{users.length !== 1 ? 's' : ''}
        </p>
      </header>

      <main>
        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-6">
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
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded mb-6">
            {success}
            <button
              onClick={() => setSuccess('')}
              className="float-right font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading users...</p>
          </div>
        ) : (
          <>
            {/* Advanced Filters Toolbar */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Search & Filter Users</h3>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      Clear All Filters ({activeFilterCount})
                    </button>
                  )}
                </div>

                {/* Search Bar */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search by name, email, or department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Role Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Roles</option>
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {/* Manager Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Manager
                    </label>
                    <select
                      value={filterManagerId}
                      onChange={(e) => setFilterManagerId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Managers</option>
                      <option value="none">No Manager</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.first_name} {manager.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="2fa_enabled">2FA Enabled</option>
                      <option value="2fa_disabled">2FA Disabled</option>
                    </select>
                  </div>
                </div>
              </div>

              {selectedUserIds.size > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-blue-800">
                      <strong>{selectedUserIds.size}</strong> user{selectedUserIds.size !== 1 ? 's' : ''} selected
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleBulkAction('enable-2fa')}
                        className="px-3 py-1 bg-orange-600 text-white rounded text-sm font-semibold hover:bg-orange-700 transition"
                      >
                        Enable 2FA
                      </button>
                      <button
                        onClick={() => handleBulkAction('disable-2fa')}
                        className="px-3 py-1 bg-orange-500 text-white rounded text-sm font-semibold hover:bg-orange-600 transition"
                      >
                        Disable 2FA
                      </button>
                      <button
                        onClick={() => handleBulkAction('force-password-change')}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700 transition"
                      >
                        Force Password Change
                      </button>
                      <button
                        onClick={() => handleBulkAction('reset-expiry')}
                        className="px-3 py-1 bg-purple-600 text-white rounded text-sm font-semibold hover:bg-purple-700 transition"
                      >
                        Reset Expiry
                      </button>
                      <button
                        onClick={() => setShowBulkManagerModal(true)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition"
                      >
                        Assign Approver
                      </button>
                      <button
                        onClick={() => setShowBulkRoleModal(true)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded text-sm font-semibold hover:bg-indigo-700 transition"
                      >
                        Change Role
                      </button>
                      <button
                        onClick={() => setShowBulkScheduleModal(true)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700 transition"
                      >
                        Create Schedule
                      </button>
                      <button
                        onClick={() => setSelectedUserIds(new Set())}
                        className="px-3 py-1 bg-gray-300 text-gray-800 rounded text-sm font-semibold hover:bg-gray-400 transition"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <input
                      type="checkbox"
                      checked={filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded"
                      title={selectedUserIds.size === filteredUsers.length ? 'Deselect all' : 'Select all visible users'}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Color
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Assigned Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Password Expiry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className={`hover:bg-gray-50 ${selectedUserIds.has(u.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(u.id)}
                          onChange={() => toggleUserSelection(u.id)}
                          className="w-4 h-4 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {u.first_name} {u.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(() => {
                          const color = getEmployeeColor(u.id, u.color_code);
                          return (
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded border-2 ${color.bg} ${color.border}`}
                                title={u.color_code}
                              ></div>
                              <span className="text-xs text-gray-600 capitalize">{u.color_code || 'unassigned'}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getRoleColor(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {u.department || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {u.manager_id
                          ? users.find((m) => m.id === u.manager_id)
                            ? `${users.find((m) => m.id === u.manager_id)?.first_name} ${users.find((m) => m.id === u.manager_id)?.last_name}`
                            : 'Unknown'
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {u.password_expires_at ? (
                          <span className={new Date(u.password_expires_at) < new Date() ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                            {new Date(u.password_expires_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                            {new Date(u.password_expires_at) < new Date() && (
                              <span className="ml-2 text-red-600 font-bold">EXPIRED</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          u.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {u.is_active ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setShowChangePasswordModal(true);
                            }}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition"
                            title="Change Password"
                          >
                            Password
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setShowDeleteUserModal(true);
                            }}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition"
                            title="Delete/Deactivate User"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-4 text-center text-sm text-gray-600">
                      {searchQuery || filterRole !== 'all' || filterManagerId !== 'all' || filterStatus !== 'all'
                        ? 'No users match your filters. Try adjusting your search criteria.'
                        : 'No users found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

            {/* Password Policy Section */}
            <div className="bg-white rounded-lg shadow p-6 mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Password Security Policy</h2>
                <button
                  onClick={() => setShowPasswordPolicyModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Edit Policy
                </button>
              </div>

              {passwordPolicy && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Password Requirements</h3>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p>
                        <span className="font-medium">Minimum Length:</span> {policyForm.min_length} characters
                      </p>
                      <p className={`${policyForm.require_uppercase ? 'text-green-700' : 'text-gray-500'}`}>
                        {policyForm.require_uppercase ? '✓' : '○'} Uppercase letters (A-Z) required
                      </p>
                      <p className={`${policyForm.require_lowercase ? 'text-green-700' : 'text-gray-500'}`}>
                        {policyForm.require_lowercase ? '✓' : '○'} Lowercase letters (a-z) required
                      </p>
                      <p className={`${policyForm.require_numbers ? 'text-green-700' : 'text-gray-500'}`}>
                        {policyForm.require_numbers ? '✓' : '○'} Numbers (0-9) required
                      </p>
                      <p className={`${policyForm.require_special_chars ? 'text-green-700' : 'text-gray-500'}`}>
                        {policyForm.require_special_chars ? '✓' : '○'} Special characters (!@#$%^&*) required
                      </p>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Expiry & History</h3>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p>
                        <span className="font-medium">Password Expiry:</span> {policyForm.password_expiry_days === 0 ? 'Disabled' : `${policyForm.password_expiry_days} days`}
                      </p>
                      <p>
                        <span className="font-medium">Password History:</span> Cannot reuse {policyForm.password_history_count} previous password{policyForm.password_history_count !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-gray-600 mt-3 pt-2 border-t border-gray-200">
                        Last updated: {new Date(passwordPolicy.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Change Role: {selectedUser.first_name} {selectedUser.last_name}
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager (Approver)</option>
                <option value="admin">Admin</option>
              </select>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  {newRole.charAt(0).toUpperCase() + newRole.slice(1)} Capabilities:
                </p>
                <ul className="space-y-1 text-xs text-blue-800">
                  {getRoleCapabilities(newRole).map((cap, idx) => (
                    <li key={idx}>{cap}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleChangeRole}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Update Role
              </button>
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Create Schedule for {selectedUser.first_name} {selectedUser.last_name}
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift Type
                </label>
                <select
                  value={scheduleData.shift}
                  onChange={(e) =>
                    setScheduleData({ ...scheduleData, shift: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {shifts.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
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
                  value={scheduleData.date}
                  onChange={(e) =>
                    setScheduleData({ ...scheduleData, date: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              {selectedUser.role === 'admin' || selectedUser.role === 'manager' ? (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800">
                    ✅ This schedule will be auto-approved for {selectedUser.role}s
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    ⏳ This schedule requires manager approval
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreateSchedule}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedUser(null);
                  setScheduleData({ shift: '7-4', date: '' });
                }}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manager Assignment Modal */}
      {showManagerModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Assign Manager to {selectedUser.first_name} {selectedUser.last_name}
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Manager
              </label>
              <select
                value={newManagerId || ''}
                onChange={(e) => setNewManagerId(e.target.value || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">No Manager</option>
                {users
                  .filter((u) => (u.role === 'manager' || u.role === 'admin') && u.id !== selectedUser.id)
                  .map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.first_name} {manager.last_name} ({manager.role})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAssignManager}
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                Assign
              </button>
              <button
                onClick={() => {
                  setShowManagerModal(false);
                  setSelectedUser(null);
                  setNewManagerId(null);
                }}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Management Modal */}
      {show2FAModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Manage 2FA for {selectedUser.first_name} {selectedUser.last_name}
            </h2>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 mb-2">
                <strong>Current Status:</strong>
              </p>
              <p className="text-sm text-blue-800">
                2FA is currently <strong>{selectedUser.two_fa_enabled ? 'ENABLED' : 'DISABLED'}</strong>
              </p>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                {selectedUser.two_fa_enabled
                  ? 'Click below to disable authenticator-based 2FA for this user.'
                  : 'Click below to enable authenticator-based 2FA for this user. They will be required to use an authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.).'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handle2FAToggle(!selectedUser.two_fa_enabled)}
                className={`flex-1 ${selectedUser.two_fa_enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'} text-white py-2 rounded-lg font-semibold transition`}
              >
                {selectedUser.two_fa_enabled ? 'Disable 2FA' : 'Enable 2FA'}
              </button>
              <button
                onClick={() => {
                  setShow2FAModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Change Password for {selectedUser.first_name} {selectedUser.last_name}
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleChangePassword}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Change Password
              </button>
              <button
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setNewPassword('');
                  setSelectedUser(null);
                }}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Delete User Account
            </h2>

            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900 font-semibold mb-2">
                ⚠️ Are you sure you want to delete {selectedUser.first_name} {selectedUser.last_name}?
              </p>
              <p className="text-sm text-red-800">
                {user?.role === 'admin'
                  ? 'This will permanently delete the user account and all associated data.'
                  : 'This will deactivate the user account. They will no longer be able to log in.'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDeleteUser}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                {user?.role === 'admin' ? 'Delete User' : 'Deactivate User'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteUserModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Policy Management Modal */}
      {showPasswordPolicyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Password Security Policy Settings</h2>

            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Password Length
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="128"
                    value={policyForm.min_length}
                    onChange={(e) => setPolicyForm({ ...policyForm, min_length: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6, Maximum 128 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password Expiry (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={policyForm.password_expiry_days}
                    onChange={(e) => setPolicyForm({ ...policyForm, password_expiry_days: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = disabled, 90 = recommended</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password History (Cannot Reuse)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={policyForm.password_history_count}
                    onChange={(e) => setPolicyForm({ ...policyForm, password_history_count: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Keep 1-10 previous passwords</p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-800 mb-2">Required Character Types</p>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyForm.require_uppercase}
                    onChange={(e) => setPolicyForm({ ...policyForm, require_uppercase: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-700">Uppercase letters (A-Z)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyForm.require_lowercase}
                    onChange={(e) => setPolicyForm({ ...policyForm, require_lowercase: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-700">Lowercase letters (a-z)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyForm.require_numbers}
                    onChange={(e) => setPolicyForm({ ...policyForm, require_numbers: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-700">Numbers (0-9)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyForm.require_special_chars}
                    onChange={(e) => setPolicyForm({ ...policyForm, require_special_chars: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-700">Special characters (!@#$%^&*)</span>
                </label>

                <p className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                  At least one character type must be required
                </p>
              </div>
            </div>

            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> These settings apply to all users. They will be enforced on password changes and new registrations.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleUpdatePasswordPolicy}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Save Policy
              </button>
              <button
                onClick={() => setShowPasswordPolicyModal(false)}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Approver Assignment Modal */}
      {showBulkManagerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Assign Approver to {selectedUserIds.size} User{selectedUserIds.size !== 1 ? 's' : ''}
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Approver
              </label>
              <select
                value={bulkNewManagerId || ''}
                onChange={(e) => setBulkNewManagerId(e.target.value || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Approver</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.first_name} {manager.last_name} ({manager.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleBulkAssignManager}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Assign
              </button>
              <button
                onClick={() => {
                  setShowBulkManagerModal(false);
                  setBulkNewManagerId(null);
                }}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Role Change Modal */}
      {showBulkRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Change Role for {selectedUserIds.size} User{selectedUserIds.size !== 1 ? 's' : ''}
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New Role
              </label>
              <select
                value={bulkNewRole}
                onChange={(e) => setBulkNewRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a role...</option>
                <option value="employee">Employee</option>
                <option value="manager">Manager (Approver)</option>
                <option value="admin">Admin</option>
              </select>

              {bulkNewRole && (
                <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm font-semibold text-indigo-900 mb-2">
                    {bulkNewRole.charAt(0).toUpperCase() + bulkNewRole.slice(1)} Capabilities:
                  </p>
                  <ul className="space-y-1 text-xs text-indigo-800">
                    {getRoleCapabilities(bulkNewRole).map((cap, idx) => (
                      <li key={idx}>{cap}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleBulkChangeRole}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Change Role
              </button>
              <button
                onClick={() => {
                  setShowBulkRoleModal(false);
                  setBulkNewRole('');
                }}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Schedule Creation Modal */}
      {showBulkScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Create Schedule for {selectedUserIds.size} User{selectedUserIds.size !== 1 ? 's' : ''}
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift Type
                </label>
                <select
                  value={bulkScheduleData.shift}
                  onChange={(e) =>
                    setBulkScheduleData({ ...bulkScheduleData, shift: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select a shift...</option>
                  {shifts.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
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
                  value={bulkScheduleData.date}
                  onChange={(e) =>
                    setBulkScheduleData({ ...bulkScheduleData, date: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  ℹ️ {selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''} will receive this schedule on the selected date.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleBulkCreateSchedule}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowBulkScheduleModal(false);
                  setBulkScheduleData({ shift: '', date: '' });
                }}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsersPage;
