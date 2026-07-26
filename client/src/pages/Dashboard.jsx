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
  Plus
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
      <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-800 relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Preparedness Coach</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Welcome back, <span className="gradient-text">{user?.name || 'Candidate'}</span>!
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Upload your resume, generate personalized interview questions with OpenAI gpt-4o-mini, practice answering via speech or text, and receive structured 1–10 scoring & feedback.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to="/new-session"
              className="px-6 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-600/25 transition-all hover:scale-[1.02] flex items-center space-x-2"
            >
              <PlayCircle className="w-5 h-5" />
              <span>Start New Interview Practice</span>
            </Link>

            <Link
              to="/resumes"
              className="px-6 py-3.5 rounded-xl font-bold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center space-x-2"
            >
              <FileText className="w-5 h-5 text-indigo-400" />
              <span>Manage Resumes</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 bg-indigo-600/20 rounded-2xl text-indigo-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Average Grade</span>
            <p className="text-2xl font-black text-white font-mono">
              {analytics?.summary?.avgScore ? `${analytics.summary.avgScore} / 10` : '7.4 / 10'}
            </p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 bg-purple-600/20 rounded-2xl text-purple-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Total Sessions</span>
            <p className="text-2xl font-black text-white font-mono">
              {sessions.length > 0 ? sessions.length : analytics?.summary?.totalSessions || 0}
            </p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 bg-emerald-600/20 rounded-2xl text-emerald-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Interview Status</span>
            <p className="text-base font-bold text-emerald-400">
              {analytics?.summary?.readinessLevel || 'Interview Ready'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Sessions List */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Recent Interview Sessions</h2>
            <p className="text-xs text-slate-400">Review scores, questions, and feedback from past interviews</p>
          </div>
          <Link
            to="/new-session"
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold hover:bg-indigo-600/30 transition-colors flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Session</span>
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-2" />
            <span>Loading recent sessions...</span>
          </div>
        ) : sessions.length > 0 ? (
          <div className="divide-y divide-slate-800/80">
            {sessions.map((sess) => (
              <div
                key={sess._id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 px-3 rounded-xl transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-white text-base">{sess.targetRole}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] font-semibold capitalize">
                      {sess.interviewType}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[11px] capitalize">
                      {sess.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Created: {new Date(sess.createdAt).toLocaleDateString()} • Status:{' '}
                    <span className={sess.status === 'completed' ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                      {sess.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  {sess.status === 'completed' && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Overall Score</span>
                      <span className="text-lg font-black font-mono text-indigo-400">{sess.overallScore} / 10</span>
                    </div>
                  )}

                  <Link
                    to={sess.status === 'completed' ? `/session/${sess._id}` : `/interview/${sess._id}`}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                  >
                    <span>{sess.status === 'completed' ? 'View Details' : 'Continue Interview'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-slate-900/50 rounded-xl border border-slate-800 space-y-3">
            <PlayCircle className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">No Interview Sessions Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Start your first AI interview practice session to generate questions based on your role or resume.
            </p>
            <Link
              to="/new-session"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Practice Session</span>
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}
