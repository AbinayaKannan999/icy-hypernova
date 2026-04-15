import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AppLayout from './components/layout/AppLayout';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import DonorDashboard from './pages/dashboards/DonorDashboard';
import ReceiverDashboard from './pages/dashboards/ReceiverDashboard';
import DonationsPage from './pages/donations/DonationsPage';
import RequestsPage from './pages/requests/RequestsPage';
import DeliveriesPage from './pages/deliveries/DeliveriesPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import UsersPage from './pages/admin/UsersPage';
import FeedbackPage from './pages/feedback/FeedbackPage';
import ProfilePage from './pages/profile/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-size-sm)' }}>Loading...</span>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  
  return children;
};

const DashboardRouter = () => {
  const { user } = useAuth();
  
  const dashboards = {
    admin: <AdminDashboard />,
    donor: <DonorDashboard />,
    receiver: <ReceiverDashboard />
  };
  
  return dashboards[user?.role] || <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                  padding: '12px 16px'
                },
                success: {
                  iconTheme: { primary: '#10b981', secondary: '#fff' },
                  style: { border: '1px solid #d1fae5' }
                },
                error: {
                  iconTheme: { primary: '#ef4444', secondary: '#fff' },
                  style: { border: '1px solid #fee2e2' }
                }
              }}
            />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Protected routes */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardRouter />} />
                <Route path="/donations" element={<DonationsPage />} />
                <Route path="/requests" element={<RequestsPage />} />
                <Route path="/deliveries" element={
                  <ProtectedRoute roles={['admin', 'receiver']}>
                    <DeliveriesPage />
                  </ProtectedRoute>
                } />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/users" element={
                  <ProtectedRoute roles={['admin']}>
                    <UsersPage />
                  </ProtectedRoute>
                } />
                <Route path="/feedback" element={<FeedbackPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
              
              {/* Redirects */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
