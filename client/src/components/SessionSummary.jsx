import React from 'react';
import { Award, CheckCircle2, TrendingUp, Compass, ArrowRight, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SessionSummary({ session, overallScore, categoryBreakdown, onStartNew }) {
  const displayScore = overallScore || session?.overallScore || 85;
  const breakdown = categoryBreakdown || session?.categoryBreakdown || [];

  return (
    <div className="bg-[#FDFBF3] text-[#0F1E1B] p-8 sm:p-10 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#DCFCE7] border-2 border-[#0F1E1B] text-emerald-900 text-xs font-black uppercase tracking-wider mb-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>Interview Session Completed!</span>
        </div>
        <h2 className="font-serif-headline text-3xl sm:text-5xl font-bold text-[#0F1E1B]">Loop Performance Report</h2>
        <p className="text-sm text-[#0F1E1B]/80 font-medium">
          Target Role: <strong className="text-[#C1440E]">{session?.targetRole || 'Full Stack Engineer'}</strong> • Category: <strong className="text-[#0F1E1B]">{session?.interviewType || 'Technical'}</strong>
        </p>
      </div>

      {/* Overall Score Circle */}
      <div className="flex flex-col items-center justify-center p-8 bg-[#F5D90A] text-[#0F1E1B] rounded-3xl border-3 border-[#0F1E1B] editorial-shadow relative overflow-hidden">
        <span className="text-xs uppercase font-black tracking-widest text-[#0F1E1B]/70 mb-2">Overall Candidate Readiness Score</span>
        <div className="flex items-baseline space-x-2">
          <span className="font-serif-headline text-6xl font-black text-[#0F1E1B]">{displayScore > 10 ? displayScore : displayScore * 10}</span>
          <span className="text-2xl font-bold text-[#0F1E1B]/60">/ 100</span>
        </div>
        <p className="text-xs font-extrabold text-[#0F1E1B] mt-2 bg-[#FDFBF3] px-3 py-1 rounded-full border border-[#0F1E1B]">
          {displayScore >= 80 || displayScore >= 8 ? '🌟 Outstanding Performance - Offer Level Ready' : '👍 Solid Foundation - Minor Technical Refinement Recommended'}
        </p>
      </div>

      {/* Category Breakdown Grid */}
      {breakdown.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-[#0F1E1B] uppercase tracking-wider">Category Score Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {breakdown.map((cat, idx) => (
              <div key={idx} className="p-4 bg-[#F5F2E6] rounded-2xl border-2 border-[#0F1E1B] flex items-center justify-between shadow-xs">
                <span className="text-xs font-bold text-[#0F1E1B]">{cat.category}</span>
                <span className="font-serif-headline text-xl font-bold text-[#C1440E]">{cat.score > 10 ? cat.score : cat.score * 10} / 100</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t-2 border-[#0F1E1B]/15">
        <Link
          to="/analytics"
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold text-[#FDFBF3] bg-[#0F1E1B] hover:bg-[#1A332E] transition-all flex items-center justify-center space-x-2 editorial-shadow text-sm"
        >
          <TrendingUp className="w-5 h-5 text-[#F5D90A]" />
          <span>View Detailed Progress Analytics</span>
        </Link>
        <button
          onClick={onStartNew}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold text-[#0F1E1B] bg-[#F5F2E6] hover:bg-[#EFEAD8] border-2 border-[#0F1E1B] transition-all flex items-center justify-center space-x-2 text-sm"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Start Another Practice Loop</span>
        </button>
      </div>
    </div>
  );
}
