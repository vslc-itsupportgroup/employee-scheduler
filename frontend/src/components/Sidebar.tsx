import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { approvalAPI } from '../api/client';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    // Load pending approvals count for managers and admins
    if (user?.role === 'manager' || user?.role === 'admin') {
      loadPendingCount();
      // Refresh count every 30 seconds
      const interval = setInterval(loadPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Refresh count when navigating away from approvals page
  useEffect(() => {
    if (location.pathname !== '/approvals' && (user?.role === 'manager' || user?.role === 'admin')) {
      loadPendingCount();
    }
  }, [location.pathname, user]);

  const loadPendingCount = async () => {
    try {
      const response = await approvalAPI.getPendingApprovals();
      setPendingCount(response.data?.length || 0);
    } catch (error) {
      console.error('Failed to load pending approvals count:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const menuItems = {
    employee: [
      { path: '/dashboard', label: 'My Schedule', icon: '📅' },
    ],
    manager: [
      { path: '/dashboard', label: 'My Schedule', icon: '📅' },
      { path: '/manage-schedules', label: 'Manage Schedules', icon: '📋' },
      { path: '/approvals', label: 'Approvals', icon: '✅' },
    ],
    admin: [
      { path: '/dashboard', label: 'My Schedule', icon: '📅' },
      { path: '/manage-schedules', label: 'Manage Schedules', icon: '📋' },
      { path: '/approvals', label: 'Approvals', icon: '✅' },
      { path: '/manage-users', label: 'Manage', icon: '👥' },
      { path: '/shift-legend', label: 'Shift Legend', icon: '⏰' },
      { path: '/email-config', label: 'Email Config', icon: '⚙️' },
    ],
  };

  const getRoleItems = () => {
    if (!user?.role) return [];
    return menuItems[user.role as keyof typeof menuItems] || [];
  };

  const items = getRoleItems();

  return (
    <div className="flex">
      {/* Sidebar */}
      <div
        className={`${
          isOpen ? 'w-64' : 'w-20'
        } bg-gradient-to-b from-blue-700 to-blue-900 text-white transition-all duration-300 ease-in-out min-h-screen shadow-lg`}
      >
        {/* Toggle Button */}
        <div className="flex items-center justify-between p-4 border-b border-blue-600">
          <h1 className={`font-bold transition-opacity duration-300 ${!isOpen && 'hidden'}`}>
            Menu
          </h1>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-blue-600 rounded transition"
            title={isOpen ? 'Collapse' : 'Expand'}
          >
            {isOpen ? '←' : '→'}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2">
          {items.map((item) => (
            <div key={item.path} className="relative">
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive(item.path)
                    ? 'bg-blue-500 font-semibold'
                    : 'hover:bg-blue-600'
                }`}
                title={!isOpen ? item.label : ''}
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <span className={`transition-opacity duration-300 ${!isOpen && 'hidden'}`}>
                  {item.label}
                </span>
                {/* Badge for pending approvals */}
                {item.path === '/approvals' && pendingCount > 0 && (
                  <span className={`ml-auto inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full transition-opacity duration-300 ${!isOpen && 'hidden'}`}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </Link>
              {/* Badge for collapsed state */}
              {item.path === '/approvals' && pendingCount > 0 && !isOpen && (
                <div className="absolute top-0 right-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
