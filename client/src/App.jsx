import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Resumes from './pages/Resumes';
import NewSession from './pages/NewSession';
import InterviewSession from './pages/InterviewSession';
import LiveInterviewSession from './pages/LiveInterviewSession';
import SessionDetail from './pages/SessionDetail';
import Analytics from './pages/Analytics';

function MainLayout() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-[#E6E4DC] text-[#0F1E1B] selection:bg-[#F5D90A] selection:text-[#0F1E1B] flex flex-col font-sans-body">
      {!isLandingPage && <Navbar />}
      
      <main className="flex-1">
        <Routes>
          {/* Public Landing & Auth Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Application Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resumes"
            element={
              <ProtectedRoute>
                <Resumes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/new-session"
            element={
              <ProtectedRoute>
                <NewSession />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview/:id"
            element={
              <ProtectedRoute>
                <InterviewSession />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview/:id/live"
            element={
              <ProtectedRoute>
                <LiveInterviewSession />
              </ProtectedRoute>
            }
          />
          <Route
            path="/session/:id"
            element={
              <ProtectedRoute>
                <SessionDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isLandingPage && (
        <footer className="py-8 text-center text-xs text-[#0F1E1B]/70 bg-[#E6E4DC] border-t border-[#0F1E1B]/10">
          <div className="max-w-7xl mx-auto px-4 font-semibold">
            <p>PrepPulse.ai • AI-Powered Interview Preparation Platform • MERN Stack + Gemini & Whisper Voice AI</p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <MainLayout />
      </Router>
    </AuthProvider>
  );
}
