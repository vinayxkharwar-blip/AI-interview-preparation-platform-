import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Sparkles, Mail, Lock, LogIn, AlertCircle, Loader2, ArrowRight, Check } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(trimmedEmail, password);
      setLoading(false);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || err.message || 'Invalid credentials or server unavailable.');
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('test@example.com');
    setPassword('password123');
    setLoading(true);
    setError('');
    try {
      await login('test@example.com', 'password123');
      setLoading(false);
      navigate('/dashboard');
    } catch (err) {
      console.error('Demo login error:', err);
      setError('Demo login issue. Please try signing up.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-[#FDFBF3] text-[#0F1E1B] p-8 sm:p-10 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-8 animate-fadeIn relative">
        
        {/* Title & Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#0F1E1B] text-[#FDFBF3] items-center justify-center shadow-lg mb-2">
            <Sparkles className="w-7 h-7 text-[#F5D90A]" />
          </div>
          <h2 className="font-serif-headline text-3xl font-bold text-[#0F1E1B]">Welcome Back</h2>
          <p className="text-xs sm:text-sm text-[#0F1E1B]/70 font-medium">
            Sign in to access your AI mock sessions, transcripts & growth roadmaps.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border-2 border-rose-600 rounded-2xl flex items-center space-x-3 text-rose-800 text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Demo Login Option */}
        <div className="bg-[#F5F2E6] p-3.5 rounded-2xl border-2 border-[#0F1E1B]/20 flex items-center justify-between">
          <div className="text-xs font-bold text-[#0F1E1B]">
            <span>💡 Quick Test?</span>
            <span className="block text-[11px] text-[#0F1E1B]/70 font-medium">Auto-fill test candidate credentials</span>
          </div>
          <button
            type="button"
            onClick={handleDemoLogin}
            className="px-3 py-1.5 rounded-xl bg-[#F5D90A] text-[#0F1E1B] font-bold text-xs border-2 border-[#0F1E1B] hover:bg-[#e0c608] transition-colors shadow-xs"
          >
            One-Click Login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0F1E1B] mb-2">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#0F1E1B]/50">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                className="w-full pl-10 pr-4 py-3 bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl text-[#0F1E1B] placeholder-[#0F1E1B]/40 focus:outline-none focus:bg-[#FDFBF3] text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0F1E1B] mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#0F1E1B]/50">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl text-[#0F1E1B] placeholder-[#0F1E1B]/40 focus:outline-none focus:bg-[#FDFBF3] text-sm font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl text-sm font-bold text-[#FDFBF3] bg-[#0F1E1B] hover:bg-[#1A332E] disabled:opacity-50 transition-all editorial-shadow flex items-center justify-center space-x-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#F5D90A]" />
            ) : (
              <>
                <span>Sign In to Platform</span>
                <ArrowRight className="w-4 h-4 text-[#F5D90A]" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-[#0F1E1B]/15">
          <p className="text-xs text-[#0F1E1B]/70 font-medium">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-bold text-[#C1440E] hover:underline decoration-[#F5D90A] decoration-2">
              Create an Account
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
