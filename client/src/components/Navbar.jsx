import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  Sparkles, 
  BarChart3, 
  FileText, 
  PlayCircle, 
  LogOut, 
  User, 
  LayoutDashboard,
  Home
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-[#FDFBF3]/95 backdrop-blur-md border-b-2 border-[#0F1E1B] text-[#0F1E1B] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#0F1E1B] text-[#FDFBF3] flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform shadow-md">
              <Sparkles className="w-4 h-4 text-[#F5D90A]" />
            </div>
            <div>
              <span className="font-serif-headline text-2xl font-black tracking-tight text-[#0F1E1B]">
                PrepPulse<span className="text-[#C1440E]">.ai</span>
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          {user && (
            <div className="hidden md:flex items-center space-x-2">
              <Link
                to="/dashboard"
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border-2 ${
                  isActive('/dashboard')
                    ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B] editorial-shadow-sm'
                    : 'border-transparent text-[#0F1E1B]/80 hover:border-[#0F1E1B]/30 hover:bg-[#F5F2E6]'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>

              <Link
                to="/new-session"
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border-2 ${
                  isActive('/new-session')
                    ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B] editorial-shadow-sm'
                    : 'border-transparent text-[#0F1E1B]/80 hover:border-[#0F1E1B]/30 hover:bg-[#F5F2E6]'
                }`}
              >
                <PlayCircle className="w-3.5 h-3.5 text-[#F5D90A]" />
                <span>Start Practice</span>
              </Link>

              <Link
                to="/resumes"
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border-2 ${
                  isActive('/resumes')
                    ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B] editorial-shadow-sm'
                    : 'border-transparent text-[#0F1E1B]/80 hover:border-[#0F1E1B]/30 hover:bg-[#F5F2E6]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>My Resumes</span>
              </Link>

              <Link
                to="/analytics"
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border-2 ${
                  isActive('/analytics')
                    ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B] editorial-shadow-sm'
                    : 'border-transparent text-[#0F1E1B]/80 hover:border-[#0F1E1B]/30 hover:bg-[#F5F2E6]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </Link>
            </div>
          )}

          {/* User Profile & Actions */}
          {user ? (
            <div className="flex items-center space-x-3">
              <Link
                to="/"
                className="hidden lg:flex items-center space-x-1 text-xs font-bold text-[#0F1E1B]/70 hover:text-[#0F1E1B] px-2.5 py-1 rounded-lg hover:bg-[#F5F2E6]"
                title="View Public Landing Page"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Landing Page</span>
              </Link>
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#F5F2E6] border-2 border-[#0F1E1B] text-xs font-bold shadow-xs">
                <User className="w-3.5 h-3.5 text-[#C1440E]" />
                <span className="text-[#0F1E1B]">{user.name}</span>
                <span className="bg-[#F5D90A] text-[#0F1E1B] px-1.5 py-0.2 rounded text-[10px] uppercase font-black">
                  {user.targetRole ? user.targetRole.split(' ')[0] : 'Pro'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-[#0F1E1B]/70 hover:text-[#C1440E] hover:bg-[#F5F2E6] rounded-xl border-2 border-transparent hover:border-[#0F1E1B]/20 transition-all"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="px-4 py-1.5 text-xs font-bold text-[#0F1E1B] border-2 border-[#0F1E1B] rounded-xl hover:bg-[#0F1E1B] hover:text-[#FDFBF3] transition-all"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="px-4 py-1.5 text-xs font-bold text-[#FDFBF3] bg-[#0F1E1B] hover:bg-[#1A332E] rounded-xl editorial-shadow-sm transition-all"
              >
                Try Free
              </Link>
            </div>
          )}

        </div>
      </div>
    </nav>
  );
}
