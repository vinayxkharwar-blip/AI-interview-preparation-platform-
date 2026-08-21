import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF3] text-[#0F1E1B] flex flex-col items-center justify-center font-medium">
        <Loader2 className="w-10 h-10 animate-spin text-[#C1440E] mb-3" />
        <p className="text-sm font-bold">Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
