import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { Loader2 } from 'lucide-react';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';

// Route-level code splitting for heavy application pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Resumes = lazy(() => import('./pages/Resumes'));
const NewSession = lazy(() => import('./pages/NewSession'));
const InterviewSession = lazy(() => import('./pages/InterviewSession'));
const LiveInterviewSession = lazy(() => import('./pages/LiveInterviewSession'));
const SessionDetail = lazy(() => import('./pages/SessionDetail'));
const Analytics = lazy(() => import('./pages/Analytics'));
const CareerHub = lazy(() => import('./pages/CareerHub'));
const CoverLetterGenerator = lazy(() => import('./pages/CoverLetterGenerator'));

function RouteFallback() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-[#0F1E1B]">
      <Loader2 className="w-8 h-8 animate-spin text-[#C1440E] mb-2" />
      <span className="text-xs font-bold text-[#0F1E1B]/70">Loading view...</span>
    </div>
  );
}

function MainLayout() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-[#E6E4DC] text-[#0F1E1B] selection:bg-[#F5D90A] selection:text-[#0F1E1B] flex flex-col font-sans-body">
      {!isLandingPage && <Navbar />}
      
      <main className="flex-1">
        <Suspense fallback={<RouteFallback />}>
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
          <Route
            path="/career-hub"
            element={
              <ProtectedRoute>
                <CareerHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cover-letter"
            element={
              <ProtectedRoute>
                <CoverLetterGenerator />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>

      {!isLandingPage && (
        <footer className="py-8 text-center text-xs text-[#0F1E1B]/70 bg-[#E6E4DC] border-t border-[#0F1E1B]/10">
          <div className="max-w-7xl mx-auto px-4 font-semibold">
            <p>PrepPulse.ai • AI-Powered Interview Preparation Platform • MERN Stack + OpenAI GPT-4o & Whisper STT</p>
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
