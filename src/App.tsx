/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { DataProvider } from './contexts/DataContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import MahasiswaDashboard from './pages/mahasiswa/Dashboard';
import DosenDashboard from './pages/dosen/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import Rooms from './pages/shared/Rooms';
import Bookings from './pages/shared/Bookings';
import Reports from './pages/shared/Reports';
import Profile from './pages/shared/Profile';
import Help from './pages/shared/Help';
import ManageRooms from './pages/admin/ManageRooms';
import ManageUsers from './pages/admin/ManageUsers';
import AuditReports from './pages/admin/AuditReports';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#190622] text-white">Loading...</div>;
  }

  if (!user || !profile) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

const DashboardRouter = () => {
  const { profile } = useAuth();
  
  if (!profile) return <Navigate to="/login" />;

  switch (profile.role) {
    case 'mahasiswa':
      return <MahasiswaDashboard />;
    case 'dosen':
      return <DosenDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <Navigate to="/login" />;
  }
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <Toaster 
            position="top-center" 
            toastOptions={{
              style: {
                background: '#3b134b',
                color: '#f9dcff',
                border: '1px solid rgba(96, 55, 112, 0.5)',
              },
              success: {
                iconTheme: {
                  primary: '#d1a6ff',
                  secondary: '#3a0a67',
                },
              },
            }} 
          />
          <Router>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              
              <Route element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route path="/dashboard" element={<DashboardRouter />} />
                <Route path="/ruangan" element={<Rooms />} />
                <Route path="/pesanan" element={<Bookings />} />
                <Route path="/laporan" element={<Reports />} />
                <Route path="/profil" element={<Profile />} />
                <Route path="/bantuan" element={<Help />} />
                {/* Admin specific routes */}
                <Route path="/admin/ruangan" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ManageRooms />
                  </ProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ManageUsers />
                  </ProtectedRoute>
                } />
                <Route path="/admin/laporan" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AuditReports />
                  </ProtectedRoute>
                } />
              </Route>
            </Routes>
          </Router>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
