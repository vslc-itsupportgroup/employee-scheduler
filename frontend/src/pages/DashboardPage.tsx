import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { scheduleAPI, changeRequestAPI, approvalAPI } from '../api/client';
import CalendarView from '../components/CalendarView';
import EmployeeScheduleList from '../components/EmployeeScheduleList';
import ShiftLegendDisplay from '../components/ShiftLegendDisplay';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'calendar-top' | 'notification-top'>(() => {
    const saved = localStorage.getItem('scheduleLayoutMode');
    return (saved as 'calendar-top' | 'notification-top') || 'calendar-top';
  });

  useEffect(() => {
    localStorage.setItem('scheduleLayoutMode', layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    if (user) {
      loadSchedules();
    }
  }, [user]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      
      // For managers/admins: load all subordinates' schedules for the current month
      if (user?.role === 'manager' || user?.role === 'admin') {
        const now = new Date();
        const monthNum = now.getMonth() + 1;
        const yearNum = now.getFullYear();
        
        try {
          const response = await scheduleAPI.getAllSchedulesForMonth(monthNum, yearNum);
          const data = response.data;
          const schedulesArray = Array.isArray(data) ? data : (data?.data || []);
          setSchedules(schedulesArray);
        } catch (error) {
          console.error('Failed to load all schedules for month:', error);
          setSchedules([]);
        }
      } else {
        // For employees: load only their own schedule
        const response = await scheduleAPI.getSchedules(user!.id);
        const data = response.data;
        const schedulesArray = Array.isArray(data) ? data : (data?.data || []);
        setSchedules(schedulesArray);
      }

      // Load pending change requests for all users
      try {
        let crResponse;
        if (user?.role === 'manager' || user?.role === 'admin') {
          // Managers/admins see all pending change requests
          crResponse = await approvalAPI.getPendingApprovals();
        } else {
          // Employees see only their own change requests
          crResponse = await changeRequestAPI.getChangeRequests();
        }
        const crData = crResponse.data || [];
        const crArray = Array.isArray(crData) ? crData : (crData?.data || []);
        setChangeRequests(crArray);
      } catch (error) {
        console.error('Failed to load change requests:', error);
        setChangeRequests([]);
      }
    } catch (error) {
      console.error('Failed to load schedules:', error);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <main className="space-y-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading schedule...</p>
          </div>
        ) : (
          <>
            {layoutMode === 'calendar-top' ? (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <CalendarView
                    schedules={schedules}
                    changeRequests={changeRequests}
                    isManager={user?.role === 'manager' || user?.role === 'admin'}
                    userRole={user?.role || 'employee'}
                    userId={user?.id}
                    onScheduleUpdate={loadSchedules}
                  />
                </div>

                {(user?.role === 'manager' || user?.role === 'admin') && (
                  <EmployeeScheduleList
                    schedules={schedules}
                    layoutMode={layoutMode}
                    onLayoutModeChange={setLayoutMode}
                  />
                )}
              </>
            ) : (
              <>
                {(user?.role === 'manager' || user?.role === 'admin') && (
                  <EmployeeScheduleList
                    schedules={schedules}
                    layoutMode={layoutMode}
                    onLayoutModeChange={setLayoutMode}
                  />
                )}

                <div className="bg-white rounded-lg shadow p-6">
                  <CalendarView
                    schedules={schedules}
                    changeRequests={changeRequests}
                    isManager={user?.role === 'manager' || user?.role === 'admin'}
                    userRole={user?.role || 'employee'}
                    userId={user?.id}
                    onScheduleUpdate={loadSchedules}
                  />
                </div>
              </>
            )}
          </>
        )}

        <div className="mt-8">
          <ShiftLegendDisplay />
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
