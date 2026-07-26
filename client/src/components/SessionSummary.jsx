import React from 'react';
import { Award, CheckCircle2, TrendingUp, Compass, ArrowRight, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SessionSummary({ session, overallScore, categoryBreakdown, onStartNew }) {
  const displayScore = overallScore || session?.overallScore || 0;
  const breakdown = categoryBreakdown || session?.categoryBreakdown || [];

  return (
    <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Interview Session Completed!</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Session Performance Summary</h2>
        <p className="text-sm text-slate-400">
          Target Role: <span className="text-indigo-400 font-semibold">{session?.targetRole || 'Software Engineer'}</span> • Type: <span className="text-purple-400 font-semibold">{session?.interviewType || 'Technical'}</span>
        </p>
      </div>

      {/* Overall Score Circle */}
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/80 rounded-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 blur-xl pointer-events-none"></div>
        <span className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-2">Overall Score</span>
        <div className="flex items-baseline space-x-2">
          <span className="text-6xl font-black text-white font-mono gradient-text">{displayScore}</span>
          <span className="text-2xl font-bold text-slate-500">/ 10</span>
        </div>
        <p className="text-xs font-semibold text-indigo-300 mt-2">
          {displayScore >= 8 ? '🌟 Outstanding Performance' : displayScore >= 6.5 ? '👍 Solid Baseline - Minor Refinement Needed' : '📚 Recommended Additional Practice'}
        </p>
      </div>

      {/* Category Breakdown Grid */}
      {breakdown.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Category Score Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {breakdown.map((cat, idx) => (
              <div key={idx} className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">{cat.category}</span>
                <span className="text-sm font-extrabold font-mono text-indigo-400">{cat.score} / 10</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-slate-800">
        <Link
          to="/analytics"
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20"
        >
          <TrendingUp className="w-5 h-5" />
          <span>View Progress Analytics</span>
        </Link>
        <button
          onClick={onStartNew}
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-all flex items-center justify-center space-x-2"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Start Another Interview</span>
        </button>
      </div>
    </div>
  );
}
