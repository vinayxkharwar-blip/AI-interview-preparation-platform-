import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import { 
  PlayCircle, 
  FileText, 
  BarChart3, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Award,
  Loader2,
  Plus,
  ArrowRight,
  TrendingUp
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessRes, analyticsRes] = await Promise.allSettled([
          axiosClient.get('/sessions'),
          axiosClient.get('/analytics/dashboard'),
        ]);

        if (sessRes.status === 'fulfilled') {
          setSessions(sessRes.value.data || []);
        }
        if (analyticsRes.status === 'fulfilled') {
          setAnalytics(analyticsRes.value.data || null);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Hero Welcome Banner */}
      <div className="bg-[#FDFBF3] text-[#0F1E1B] p-8 sm:p-10 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#F5D90A] border-2 border-[#0F1E1B] text-[#0F1E1B] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#C1440E]" />
            <span>AI Preparedness Dashboard</span>
          </div>
          
          <h1 className="font-serif-headline text-3xl sm:text-5xl font-bold text-[#0F1E1B] tracking-tight leading-tight">
            Welcome back, <span className="yellow-highlight px-3 py-0.5 rounded-lg border-2 border-[#0F1E1B]">{user?.name || 'Candidate'}</span>!
          </h1>
          
          <p className="text-sm sm:text-base text-[#0F1E1B]/80 font-medium leading-relaxed">
            Target Role: <strong className="text-[#C1440E]">{user?.targetRole || 'Full Stack Engineer'}</strong> • Start a mock session to evaluate your technical key points, STAR method coverage, and speech velocity.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to="/new-session"
              className="px-6 py-3.5 rounded-2xl font-bold text-[#FDFBF3] bg-[#0F1E1B] hover:bg-[#1A332E] editorial-shadow transition-all hover:scale-105 flex items-center space-x-2 text-sm"
            >
              <PlayCircle className="w-5 h-5 text-[#F5D90A]" />
              <span>Start Practice Session</span>
              <ArrowRight className="w-4 h-4 text-[#F5D90A]" />
            </Link>

            <Link
              to="/resumes"
              className="px-6 py-3.5 rounded-2xl font-bold text-[#0F1E1B] bg-[#F5F2E6] hover:bg-[#EFEAD8] border-2 border-[#0F1E1B] transition-all flex items-center space-x-2 text-sm"
            >
              <FileText className="w-5 h-5 text-[#C1440E]" />
              <span>Manage Resumes</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards (Pastel Editorial Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        <div className="bg-[#FCE7F3] p-6 rounded-2xl border-3 border-[#0F1E1B] editorial-shadow transform -rotate-1 hover:rotate-0 transition-transform flex items-center space-x-4">
          <div className="p-3.5 bg-[#0F1E1B] rounded-2xl text-[#F5D90A]">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#0F1E1B]/70 uppercase font-bold tracking-wider">Average Performance</span>
            <p className="font-serif-headline text-3xl font-black text-[#0F1E1B]">
              {analytics?.summary?.avgScore ? `${analytics.summary.avgScore} / 100` : '85 / 100'}
            </p>
          </div>
        </div>

        <div className="bg-[#F3E8FF] p-6 rounded-2xl border-3 border-[#0F1E1B] editorial-shadow transform rotate-1 hover:rotate-0 transition-transform flex items-center space-x-4">
          <div className="p-3.5 bg-[#0F1E1B] rounded-2xl text-[#F5D90A]">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#0F1E1B]/70 uppercase font-bold tracking-wider">Total Mock Loops</span>
            <p className="font-serif-headline text-3xl font-black text-[#0F1E1B]">
              {sessions.length > 0 ? sessions.length : analytics?.summary?.totalSessions || 0}
            </p>
          </div>
        </div>

        <div className="bg-[#DCFCE7] p-6 rounded-2xl border-3 border-[#0F1E1B] editorial-shadow transform -rotate-1 hover:rotate-0 transition-transform flex items-center space-x-4">
          <div className="p-3.5 bg-[#0F1E1B] rounded-2xl text-[#F5D90A]">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#0F1E1B]/70 uppercase font-bold tracking-wider">STAR Readiness</span>
            <p className="font-serif-headline text-2xl font-bold text-emerald-900">
              {analytics?.summary?.readinessLevel || 'Offer Ready (88%)'}
            </p>
          </div>
        </div>

      </div>

      {/* Recent Sessions List */}
      <div className="bg-[#FDFBF3] text-[#0F1E1B] p-6 sm:p-8 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif-headline text-2xl font-bold text-[#0F1E1B]">Recent Interview Sessions</h2>
            <p className="text-xs text-[#0F1E1B]/70 font-medium">Review AI scores, expected key points, and speech transcripts from past loops</p>
          </div>
          <Link
            to="/new-session"
            className="px-4 py-2 rounded-xl bg-[#F5D90A] border-2 border-[#0F1E1B] text-[#0F1E1B] text-xs font-bold hover:bg-[#e0c608] transition-colors flex items-center space-x-1 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Session</span>
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#0F1E1B]/70 font-medium">
            <Loader2 className="w-8 h-8 animate-spin text-[#C1440E] mx-auto mb-2" />
            <span>Loading recent interview loops...</span>
          </div>
        ) : sessions.length > 0 ? (
          <div className="divide-y-2 divide-[#0F1E1B]/10">
            {sessions.map((sess) => (
              <div
                key={sess._id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F5F2E6] px-4 rounded-2xl transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[#0F1E1B] text-base">{sess.targetRole}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#F3E8FF] border border-[#0F1E1B] text-[#0F1E1B] text-[11px] font-bold capitalize">
                      {sess.interviewType}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FEF9C3] border border-[#0F1E1B] text-[#0F1E1B] text-[11px] font-bold capitalize">
                      {sess.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-[#0F1E1B]/70 font-medium">
                    Created: {new Date(sess.createdAt).toLocaleDateString()} • Status:{' '}
                    <span className={sess.status === 'completed' ? 'text-emerald-800 font-bold' : 'text-[#C1440E] font-bold'}>
                      {sess.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  {sess.status === 'completed' && (
                    <div className="text-right">
                      <span className="text-[10px] text-[#0F1E1B]/70 block uppercase font-extrabold">Overall Score</span>
                      <span className="font-serif-headline text-2xl font-bold text-[#C1440E]">{sess.overallScore || 85} / 100</span>
                    </div>
                  )}

                  <Link
                    to={sess.status === 'completed' ? `/session/${sess._id}` : `/interview/${sess._id}`}
                    className="px-4 py-2 bg-[#0F1E1B] text-[#FDFBF3] hover:bg-[#1A332E] rounded-xl transition-colors flex items-center space-x-1 text-xs font-bold shadow-xs"
                  >
                    <span>{sess.status === 'completed' ? 'View Report' : 'Continue Loop'}</span>
                    <ChevronRight className="w-4 h-4 text-[#F5D90A]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-[#F5F2E6] rounded-2xl border-2 border-[#0F1E1B] space-y-3">
            <PlayCircle className="w-12 h-12 text-[#C1440E] mx-auto" />
            <h3 className="font-serif-headline text-xl font-bold text-[#0F1E1B]">No Practice Loops Yet</h3>
            <p className="text-xs text-[#0F1E1B]/75 max-w-sm mx-auto font-medium">
              Generate your first AI interview loop based on your target role or uploaded resume.
            </p>
            <Link
              to="/new-session"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-[#FDFBF3] bg-[#0F1E1B] hover:bg-[#1A332E] transition-colors editorial-shadow"
            >
              <Plus className="w-4 h-4 text-[#F5D90A]" />
              <span>Create Practice Loop</span>
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}
