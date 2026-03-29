// ═══════════════════════════════════════════════════════════════
// App.tsx — Routing with React Router v6 + Auth guard
// ═══════════════════════════════════════════════════════════════

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ClientForm from '@/pages/ClientForm';

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
          <Route path="/clients" element={
            <ProtectedRoute><Navigate to="/" replace /></ProtectedRoute>
          } />
          <Route path="/clients/new" element={
            <ProtectedRoute><ClientForm /></ProtectedRoute>
          } />
          <Route path="/clients/:id" element={
            <ProtectedRoute><ClientForm /></ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}