import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Resumes from './pages/Resumes';
import NewSession from './pages/NewSession';
import InterviewSession from './pages/InterviewSession';
import SessionDetail from './pages/SessionDetail';
import Analytics from './pages/Analytics';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
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
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-400 bg-slate-950/60">
            <div className="max-w-7xl mx-auto px-4">
              <p>AI Interview Preparation Platform • MERN Stack (MongoDB, Express, React, Node.js) + OpenAI gpt-4o-mini & Whisper</p>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}
