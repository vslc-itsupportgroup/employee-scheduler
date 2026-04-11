import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ApprovalsPage from './pages/ApprovalsPage';
import ManageSchedulesPage from './pages/ManageSchedulesPage';
import ManageUsersPage from './pages/ManageUsersPage';
import ShiftLegendPage from './pages/ShiftLegendPage';
import EmailConfigPage from './pages/EmailConfigPage';
import './styles/index.css';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {isAuthenticated ? (
        <div className="flex flex-col h-screen">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/approvals"
                  element={
                    <ProtectedRoute allowedRoles={['manager', 'admin']}>
                      <ApprovalsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/manage-schedules"
                  element={
                    <ProtectedRoute allowedRoles={['manager', 'admin']}>
                      <ManageSchedulesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/manage-users"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <ManageUsersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/shift-legend"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <ShiftLegendPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/email-config"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <EmailConfigPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
