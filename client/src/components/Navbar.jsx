import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  Sparkles, 
  BarChart3, 
  FileText, 
  LogOut, 
  LayoutDashboard,
  Briefcase,
  Send,
  Home,
  Menu,
  X,
  ArrowRight,
  Trophy,
  User,
  Compass,
  Settings,
  ChevronDown
} from 'lucide-react';
import PrepPilotLogo from './brand/PrepPilotLogo';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Close drawer and dropdown on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname, location.search]);

  // Handle Escape and outside click to close menus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (mobileMenuOpen) setMobileMenuOpen(false);
        if (profileDropdownOpen) setProfileDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, profileDropdownOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  // Active route helpers
  const isDashboardActive = location.pathname === '/dashboard';
  const isPlacementActive = location.pathname === '/placement-drive';
  const isResumesActive = location.pathname === '/resumes';
  const isCareerHubActive = location.pathname === '/career-hub';
  const isAnalyticsActive = location.pathname === '/analytics';
  const isLandingActive = location.pathname === '/';

  // Navigation items config - Exactly 5 primary items
  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      isActive: isDashboardActive,
    },
    {
      name: 'Placement Arena',
      path: '/placement-drive',
      icon: Trophy,
      isActive: isPlacementActive,
    },
    {
      name: 'Resume Studio',
      path: '/resumes',
      icon: FileText,
      isActive: isResumesActive,
    },
    {
      name: 'Career Hub',
      path: '/career-hub',
      icon: Briefcase,
      isActive: isCareerHubActive,
    },
    {
      name: 'Analytics',
      path: '/analytics',
      icon: BarChart3,
      isActive: isAnalyticsActive,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FDFBF3]/95 backdrop-blur-md border-b-2 border-[#0F1E1B] text-[#0F1E1B] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            
            {/* Brand Logo (Left) */}
            <Link
              to={user ? "/dashboard" : "/"}
              className="flex items-center group shrink-0 rounded-xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#10221D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF8F0]"
              aria-label="PrepPilot AI Home"
            >
              <PrepPilotLogo variant="light" size="sm" />
            </Link>

            {/* Desktop Navigation Row (Arranged horizontally, visible on xl: 1280px+) */}
            {user && (
              <nav
                role="navigation"
                aria-label="Primary Application Navigation"
                className="hidden xl:flex items-center gap-1.5"
              >
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      aria-current={item.isActive ? 'page' : undefined}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 whitespace-nowrap shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0F1E1B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFBF3] ${
                        item.isActive
                          ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B] editorial-shadow-sm'
                          : 'border-transparent text-[#0F1E1B]/80 hover:text-[#0F1E1B] hover:border-[#0F1E1B]/30 hover:bg-[#F5F2E6]'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          item.isActive ? 'text-[#F5D90A]' : 'text-[#0F1E1B]/70'
                        }`}
                        aria-hidden="true"
                      />
                      <span>{item.name}</span>
                      {item.isActive && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#F5D90A] ml-0.5 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Right Section: User Badge & Logout */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {user ? (
                <>
                  {/* Logged-In User Badge with Interactive Dropdown (Desktop & Tablet) */}
                  <div className="relative hidden sm:block">
                    <button
                      type="button"
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                      className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl bg-[#F5F2E6] hover:bg-[#FAF8F0] border-2 border-[#0F1E1B] editorial-shadow-sm text-xs font-bold shrink-0 transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0F1E1B]"
                      aria-expanded={profileDropdownOpen}
                      aria-label="User profile and account options"
                    >
                      <div className="w-6 h-6 rounded-lg bg-[#0F1E1B] text-[#FDFBF3] flex items-center justify-center text-[11px] font-black shrink-0 overflow-hidden">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          user.name ? user.name.charAt(0).toUpperCase() : 'U'
                        )}
                      </div>
                      <span className="text-[#0F1E1B] max-w-[120px] truncate" title={user.name}>
                        {user.name}
                      </span>
                      <span className="bg-[#F5D90A] text-[#0F1E1B] border border-[#0F1E1B]/25 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0">
                        {user.targetRole ? user.targetRole.split(' ')[0] : 'Pro'}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-[#0F1E1B]/60 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {profileDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#FDFBF3] border-2 border-[#0F1E1B] editorial-shadow-md py-1.5 z-50 animate-fadeIn">
                        <div className="px-3.5 py-2 border-b border-[#0F1E1B]/10">
                          <p className="text-xs font-black text-[#10221D] truncate">{user.name}</p>
                          <p className="text-[10px] text-[#10221D]/60 truncate">{user.email}</p>
                        </div>

                        <div className="py-1">
                          <Link
                            to="/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-[#10221D] hover:bg-[#F5F2E6] transition-colors"
                          >
                            <User className="w-4 h-4 text-[#F47721]" />
                            <span>My Profile</span>
                          </Link>
                          <Link
                            to="/profile?tab=settings"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-[#10221D] hover:bg-[#F5F2E6] transition-colors"
                          >
                            <Settings className="w-4 h-4 text-[#10221D]/70" />
                            <span>Account Settings</span>
                          </Link>
                        </div>

                        <div className="border-t border-[#0F1E1B]/10 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              handleLogout();
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                          >
                            <LogOut className="w-4 h-4 text-rose-600" />
                            <span>Logout</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Desktop / Tablet Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="hidden sm:inline-flex p-2 text-[#0F1E1B]/70 hover:text-[#C1440E] hover:bg-rose-50 hover:border-[#C1440E]/40 border-2 border-transparent rounded-xl transition-all shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#C1440E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFBF3]"
                    title="Log out of PrepPilot AI"
                    aria-label="Log out"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                  </button>

                  {/* Mobile / Tablet Hamburger Toggle (Visible on screens < 1280px) */}
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="xl:hidden flex items-center gap-1.5 p-2 text-[#0F1E1B] rounded-xl border-2 border-[#0F1E1B] bg-[#F5F2E6] hover:bg-[#E6E4DC] editorial-shadow-sm transition-all shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0F1E1B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFBF3]"
                    aria-expanded={mobileMenuOpen}
                    aria-controls="mobile-navigation-drawer"
                    aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  >
                    <div className="w-5 h-5 rounded-md bg-[#0F1E1B] text-[#FDFBF3] flex sm:hidden items-center justify-center text-[10px] font-black shrink-0 overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user.name ? user.name.charAt(0).toUpperCase() : 'U'
                      )}
                    </div>
                    {mobileMenuOpen ? (
                      <X className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Menu className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </>
              ) : (
                /* Public / Logged Out View */
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <Link
                    to="/"
                    className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#0F1E1B]/70 hover:text-[#0F1E1B] px-3 py-1.5 rounded-xl hover:bg-[#F5F2E6]"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Landing Page</span>
                  </Link>
                  <Link
                    to="/login"
                    className="px-2.5 sm:px-4 py-1.5 text-xs font-bold text-[#0F1E1B] border-2 border-[#0F1E1B] rounded-xl hover:bg-[#F5F2E6] transition-all whitespace-nowrap focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0F1E1B]"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    className="px-3 sm:px-4 py-1.5 text-xs font-bold text-[#FDFBF3] bg-[#0F1E1B] hover:bg-[#1A332E] rounded-xl border-2 border-[#0F1E1B] editorial-shadow-sm transition-all whitespace-nowrap flex items-center gap-1.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0F1E1B]"
                  >
                    <span>Try Free</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#F5D90A]" aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Responsive Slide-Out Navigation Drawer for Tablet & Mobile (xl:hidden) */}
      {/* Placed outside <header> so backdrop-filter does NOT trap fixed positioning */}
      {mobileMenuOpen && (
        <div className="xl:hidden fixed inset-0 z-50">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <aside
            id="mobile-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Drawer"
            className="fixed inset-y-0 right-0 w-full max-w-xs sm:max-w-sm bg-[#FDFBF3] border-l-2 border-[#0F1E1B] p-6 flex flex-col justify-between shadow-2xl overflow-y-auto z-50 animate-fadeIn"
          >
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b-2 border-[#0F1E1B]/15">
                <PrepPilotLogo variant="light" size="sm" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl border-2 border-[#0F1E1B] bg-[#F5F2E6] hover:bg-[#FAF8F0] text-[#0F1E1B] transition-all cursor-pointer"
                  aria-label="Close navigation drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User Profile Card (if logged in) */}
              {user && (
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3.5 rounded-2xl bg-[#F5F2E6] hover:bg-[#FAF8F0] border-2 border-[#0F1E1B] editorial-shadow-sm flex items-center space-x-3 transition-colors group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0F1E1B] text-[#FDFBF3] flex items-center justify-center text-sm font-black shrink-0 overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name ? user.name.charAt(0).toUpperCase() : 'U'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-[#0F1E1B] truncate group-hover:text-[#F47721]">{user.name}</span>
                      <span className="bg-[#F5D90A] text-[#0F1E1B] border border-[#0F1E1B]/20 px-1.5 py-0.2 rounded text-[10px] font-black uppercase">
                        {user.targetRole ? user.targetRole.split(' ')[0] : 'Pro'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#0F1E1B]/60 truncate mt-0.5">{user.email}</p>
                    <span className="text-[10px] font-black text-[#F47721] flex items-center gap-1 mt-1">
                      <span>View & Edit Profile</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              )}

              {/* Primary Navigation Links */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#0F1E1B]/50 px-2 pb-1">
                  Platform Modules
                </div>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={item.isActive ? 'page' : undefined}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${
                        item.isActive
                          ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B] editorial-shadow-sm'
                          : 'border-transparent text-[#0F1E1B] hover:bg-[#F5F2E6] hover:border-[#0F1E1B]/20'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            item.isActive ? 'text-[#F5D90A]' : 'text-[#0F1E1B]/70'
                          }`}
                        />
                        <span className="whitespace-nowrap">{item.name}</span>
                      </div>
                      {item.isActive && (
                        <span className="w-2 h-2 rounded-full bg-[#F5D90A] shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Secondary Navigation Section (Logged out only) */}
              {!user && (
                <div className="pt-2 border-t-2 border-[#0F1E1B]/10 space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-[#0F1E1B]/50 px-2 pb-1">
                    General
                  </div>
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${
                      isLandingActive
                        ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B]'
                        : 'border-transparent text-[#0F1E1B] hover:bg-[#F5F2E6]'
                    }`}
                  >
                    <Home className="w-4 h-4 text-[#0F1E1B]/70" />
                    <span>Public Landing Page</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-6 border-t-2 border-[#0F1E1B]/15 space-y-3">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 bg-rose-50 hover:bg-rose-100 text-[#C1440E] border-2 border-[#C1440E]/40 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of Account</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full block text-center bg-white hover:bg-[#F5F2E6] text-[#0F1E1B] border-2 border-[#0F1E1B] py-2.5 rounded-xl text-xs font-bold"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center space-x-1.5 bg-[#0F1E1B] hover:bg-[#1A332E] text-[#FDFBF3] border-2 border-[#0F1E1B] py-2.5 rounded-xl text-xs font-bold editorial-shadow-sm"
                  >
                    <span>Try Free</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#F5D90A]" />
                  </Link>
                </div>
              )}
              <p className="text-[10px] text-center text-[#0F1E1B]/50 font-bold">
                PrepPilot AI • Production v2.0
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
