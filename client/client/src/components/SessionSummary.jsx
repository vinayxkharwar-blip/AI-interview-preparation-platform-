import React from 'react';
import { CheckCircle2, TrendingUp, RotateCcw, AlertCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toHundredScale } from '../utils/score';
import EmptyState from './common/EmptyState';

export default function SessionSummary({ session, overallScore, categoryBreakdown, onStartNew }) {
  const rawScore = overallScore ?? session?.overallScore;
  const hasScore = rawScore !== undefined && rawScore !== null;
  const displayScore = hasScore ? toHundredScale(rawScore) : null;
  const breakdown = categoryBreakdown || session?.categoryBreakdown || [];

  if (!session && !hasScore) {
    return (
      <EmptyState
        title="Session Summary Data Missing"
        description="No performance summary data is available for this practice loop."
        icon={AlertCircle}
        actionText="Start New Practice Loop"
        onAction={onStartNew}
      />
    );
  }

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
          Target Role: <strong className="text-[#C1440E]">{session?.targetRole || 'Unspecified'}</strong> • Category: <strong className="text-[#0F1E1B]">{session?.interviewType || 'Unspecified'}</strong>
        </p>
      </div>

      {/* Overall Score Circle */}
      <div className="flex flex-col items-center justify-center p-8 bg-[#F5D90A] text-[#0F1E1B] rounded-3xl border-3 border-[#0F1E1B] editorial-shadow relative overflow-hidden">
        <span className="text-xs uppercase font-black tracking-widest text-[#0F1E1B]/70 mb-2">Overall Candidate Readiness Score</span>
        <div className="flex items-baseline space-x-2">
          <span className="font-serif-headline text-6xl font-black text-[#0F1E1B]">{hasScore ? displayScore : 'N/A'}</span>
          <span className="text-2xl font-bold text-[#0F1E1B]/60">/ 100</span>
        </div>
        <p className="text-xs font-extrabold text-[#0F1E1B] mt-2 bg-[#FDFBF3] px-3 py-1 rounded-full border border-[#0F1E1B]">
          {!hasScore
            ? '⚠️ Score Pending / Data Unavailable'
            : displayScore >= 80
            ? '🌟 Outstanding Performance - Offer Level Ready'
            : '👍 Solid Foundation - Minor Technical Refinement Recommended'}
        </p>
      </div>

      {/* Focused Topic Delta OR Category Breakdown Grid */}
      {session?.focusTopic ? (
        <div className="bg-[#FEF9C3] p-6 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[#0F1E1B]/70">
              <Sparkles className="w-4 h-4 text-[#C1440E]" />
              <span>Focused Practice Retry Performance</span>
            </div>
            <span className="px-3 py-1 bg-[#C1440E] text-[#FDFBF3] text-[10px] font-black rounded-full uppercase tracking-wider">
              Weak Topic Focus
            </span>
          </div>

          <h3 className="font-serif-headline text-xl sm:text-2xl font-bold text-[#0F1E1B]">
            "{session.focusTopic}"
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-[#FDFBF3] rounded-2xl border-2 border-[#0F1E1B] text-center shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0F1E1B]/70 block mb-1">
                Before Score
              </span>
              <span className="font-serif-headline text-2xl font-black text-[#0F1E1B]">
                {session.previousScore != null ? `${toHundredScale(session.previousScore)} / 100` : 'N/A'}
              </span>
            </div>

            <div className="p-4 bg-[#FDFBF3] rounded-2xl border-2 border-[#0F1E1B] text-center shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0F1E1B]/70 block mb-1">
                After Score
              </span>
              <span className="font-serif-headline text-2xl font-black text-[#0F1E1B]">
                {displayScore != null ? `${displayScore} / 100` : 'N/A'}
              </span>
            </div>

            <div className="p-4 bg-[#FDFBF3] rounded-2xl border-2 border-[#0F1E1B] text-center shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0F1E1B]/70 block mb-1">
                Topic Delta Improvement
              </span>
              {session.previousScore != null && displayScore != null ? (
                <span
                  className={`font-serif-headline text-2xl font-black ${
                    displayScore - toHundredScale(session.previousScore) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {displayScore - toHundredScale(session.previousScore) >= 0
                    ? `+${displayScore - toHundredScale(session.previousScore)} pts`
                    : `${displayScore - toHundredScale(session.previousScore)} pts`}
                </span>
              ) : (
                <span className="font-serif-headline text-2xl font-black text-[#0F1E1B]">N/A</span>
              )}
            </div>
          </div>
        </div>
      ) : breakdown.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-[#0F1E1B] uppercase tracking-wider">Category Score Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {breakdown.map((cat, idx) => (
              <div key={idx} className="p-4 bg-[#F5F2E6] rounded-2xl border-2 border-[#0F1E1B] flex items-center justify-between shadow-xs">
                <span className="text-xs font-bold text-[#0F1E1B]">{cat.category}</span>
                <span className="font-serif-headline text-xl font-bold text-[#C1440E]">{toHundredScale(cat.score)} / 100</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
