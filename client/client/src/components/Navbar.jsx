import React, { useContext, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';
import { 
  Sparkles, 
  BarChart3, 
  FileText, 
  PlayCircle, 
  LogOut, 
  User, 
  LayoutDashboard,
  Briefcase,
  Send,
  Home,
  Menu,
  X,
  ArrowRight
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-[#FDFBF3]/95 backdrop-blur-md border-b-2 border-[#0F1E1B] text-[#0F1E1B] shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          
          {/* Logo */}
          <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2 sm:space-x-3 group shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0F1E1B] text-[#FDFBF3] flex items-center justify-center font-bold text-base sm:text-lg group-hover:scale-105 transition-transform shadow-md shrink-0">
              <Sparkles className="w-4 h-4 text-[#F5D90A]" />
            </div>
            <div>
              <span className="font-serif-headline text-lg sm:text-2xl font-black tracking-tight text-[#0F1E1B] whitespace-nowrap">
                PrepPulse<span className="text-[#C1440E]">.ai</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          {user && (
            <div className="hidden md:flex items-center space-x-1.5">
              <Link
                to="/dashboard"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 border-2 ${
                  isActive('/dashboard')
                    ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B] editorial-shadow-sm'
                    : 'border-transparent text-[#0F1E1B]/80 hover:border-[#0F1E1B]/30 hover:bg-[#F5F2E6]'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>

              <Link
                to="/resumes"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 border-2 ${
                  isActive('/resumes')
                    ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B] editorial-shadow-sm'
                    : 'border-transparent text-[#0F1E1B]/80 hover:border-[#0F1E1B]/30 hover:bg-[#F5F2E6]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#C1440E]" />
                <span>Resume Studio</span>
              </Link>

              <Link
                to="/career-hub"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 border-2 ${
                  isActive('/career-hub')
                    ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B] editorial-shadow-sm'
                    : 'border-transparent text-[#0F1E1B]/80 hover:border-[#0F1E1B]/30 hover:bg-[#F5F2E6]'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-[#F5D90A]" />
                <span>Career Hub</span>
              </Link>

              <Link
                to="/career-hub?tab=applications"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 border-2 ${
                  location.search.includes('applications')
                    ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B] editorial-shadow-sm'
                    : 'border-transparent text-[#0F1E1B]/80 hover:border-[#0F1E1B]/30 hover:bg-[#F5F2E6]'
                }`}
              >
                <Send className="w-3.5 h-3.5 text-blue-500" />
                <span>Applications</span>
              </Link>

              <Link
                to="/analytics"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 border-2 ${
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

          {/* User Profile, Notifications & Actions */}
          {user ? (
            <div className="flex items-center space-x-2 shrink-0">
              <NotificationCenter />
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
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-[#0F1E1B] rounded-xl border-2 border-[#0F1E1B] bg-[#F5F2E6]"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
              <Link
                to="/login"
                className="px-3 sm:px-4 py-1.5 text-xs font-bold text-[#0F1E1B] border-2 border-[#0F1E1B] rounded-xl hover:bg-[#0F1E1B] hover:text-[#FDFBF3] transition-all whitespace-nowrap"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="px-3.5 sm:px-4 py-1.5 text-xs font-bold text-[#FDFBF3] bg-[#0F1E1B] hover:bg-[#1A332E] rounded-xl editorial-shadow-sm transition-all whitespace-nowrap flex items-center space-x-1 sm:space-x-1.5"
              >
                <span>Try Free</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#F5D90A]" />
              </Link>
            </div>
          )}

        </div>

        {/* Mobile Dropdown for Logged-In User */}
        {user && mobileMenuOpen && (
          <div className="md:hidden py-3 border-t-2 border-[#0F1E1B]/10 space-y-2">
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border-2 ${
                isActive('/dashboard')
                  ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B]'
                  : 'border-transparent text-[#0F1E1B]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/career-hub"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border-2 ${
                isActive('/career-hub')
                  ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B]'
                  : 'border-transparent text-[#0F1E1B]'
              }`}
            >
              <Briefcase className="w-4 h-4 text-[#F5D90A]" />
              <span>Career Hub</span>
            </Link>

            <Link
              to="/new-session"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border-2 ${
                isActive('/new-session')
                  ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B]'
                  : 'border-transparent text-[#0F1E1B]'
              }`}
            >
              <PlayCircle className="w-4 h-4 text-[#F5D90A]" />
              <span>Start Practice</span>
            </Link>

            <Link
              to="/resumes"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border-2 ${
                isActive('/resumes')
                  ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B]'
                  : 'border-transparent text-[#0F1E1B]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>My Resumes</span>
            </Link>

            <Link
              to="/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border-2 ${
                isActive('/analytics')
                  ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B]'
                  : 'border-transparent text-[#0F1E1B]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </Link>

            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 border-2 border-transparent text-[#0F1E1B]"
            >
              <Home className="w-4 h-4" />
              <span>Public Landing Page</span>
            </Link>
          </div>
        )}

      </div>
    </nav>
  );
}
