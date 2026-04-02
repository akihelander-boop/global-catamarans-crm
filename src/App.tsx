// ═══════════════════════════════════════════════════════════════
// App.tsx — Routing with React Router v6 + Auth guard
// ═══════════════════════════════════════════════════════════════

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ClientForm from '@/pages/ClientForm';
import ClientTimeline from '@/pages/ClientTimeline';
import ActivityFeedPage from '@/pages/ActivityFeedPage';
import Team from '@/pages/Team';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — any authenticated user */}
          <Route path="/" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/activity" element={
            <ProtectedRoute><ActivityFeedPage /></ProtectedRoute>
          } />
          <Route path="/clients" element={
            <ProtectedRoute><Navigate to="/" replace /></ProtectedRoute>
          } />
          <Route path="/clients/new" element={
            <ProtectedRoute><ClientForm /></ProtectedRoute>
          } />
          <Route path="/clients/:id/activity" element={
            <ProtectedRoute><ClientTimeline /></ProtectedRoute>
          } />
          <Route path="/clients/:id" element={
            <ProtectedRoute><ClientForm /></ProtectedRoute>
          } />
          <Route path="/team" element={
            <ProtectedRoute><Team /></ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}