import React from 'react';
import { Award, CheckCircle2, XCircle, Lightbulb, Star, ShieldCheck } from 'lucide-react';

export default function FeedbackCard({ feedback }) {
  if (!feedback) return null;

  const getScoreColor = (score) => {
    if (score >= 8) return 'from-emerald-500 to-teal-600 text-emerald-400 border-emerald-500/30';
    if (score >= 6) return 'from-amber-500 to-orange-600 text-amber-400 border-amber-500/30';
    return 'from-rose-500 to-red-600 text-rose-400 border-rose-500/30';
  };

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-6 animate-fadeIn">
      {/* Top Banner with Score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900/90 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white">AI Evaluation & Score</h4>
            <p className="text-xs text-slate-400">Category: {feedback.category || 'Technical Depth'}</p>
          </div>
        </div>

        {/* Dynamic Score Badge */}
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400 uppercase font-semibold">Grade</span>
            <p className="text-xs font-bold text-indigo-400">
              {feedback.score >= 8 ? 'Exceptional' : feedback.score >= 6 ? 'Competent' : 'Needs Practice'}
            </p>
          </div>
          <div className={`px-5 py-2.5 rounded-2xl bg-gradient-to-br border flex items-center space-x-2 shadow-lg ${getScoreColor(feedback.score)}`}>
            <Star className="w-5 h-5 fill-current" />
            <span className="text-2xl font-extrabold font-mono">{feedback.score}</span>
            <span className="text-xs font-bold opacity-75">/ 10</span>
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Strengths */}
        <div className="bg-emerald-950/20 p-5 rounded-2xl border border-emerald-900/40 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Key Strengths Identified</span>
          </div>
          {feedback.strengths && feedback.strengths.length > 0 ? (
            <ul className="space-y-2">
              {feedback.strengths.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-xs text-emerald-200 leading-relaxed">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">No specific strengths noted.</p>
          )}
        </div>

        {/* Weaknesses */}
        <div className="bg-rose-950/20 p-5 rounded-2xl border border-rose-900/40 space-y-3">
          <div className="flex items-center space-x-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
            <XCircle className="w-4 h-4" />
            <span>Areas for Improvement</span>
          </div>
          {feedback.weaknesses && feedback.weaknesses.length > 0 ? (
            <ul className="space-y-2">
              {feedback.weaknesses.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-xs text-rose-200 leading-relaxed">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">No major weaknesses detected.</p>
          )}
        </div>

      </div>

      {/* Actionable Suggestion */}
      {feedback.suggestion && (
        <div className="p-5 bg-indigo-950/30 border border-indigo-800/40 rounded-2xl flex items-start space-x-3">
          <Lightbulb className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
              Expert AI Coach Suggestion
            </h5>
            <p className="text-xs text-slate-200 leading-relaxed">
              {feedback.suggestion}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
