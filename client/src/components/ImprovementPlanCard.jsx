import React from 'react';
import { Target, Compass, BookOpen, Sparkles, CheckSquare } from 'lucide-react';

export default function ImprovementPlanCard({ plan }) {
  if (!plan) return null;

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
        <div className="p-3 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-400">
          <Compass className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">AI-Synthesized Personalized Improvement Plan</h3>
          <p className="text-xs text-slate-400">Custom recommendations based on your session response patterns.</p>
        </div>
      </div>

      {/* Overall Summary */}
      {plan.overallSummary && (
        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-indigo-400 block mb-1">Executive Session Assessment:</span>
          {plan.overallSummary}
        </div>
      )}

      {/* Focus Areas List */}
      {plan.focusAreas && plan.focusAreas.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Key Priority Focus Areas ({plan.focusAreas.length})
          </h4>

          <div className="space-y-4">
            {plan.focusAreas.map((item, idx) => (
              <div
                key={idx}
                className="p-5 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-3 hover:border-purple-500/30 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <h5 className="text-base font-bold text-white">{item.topic}</h5>
                </div>

                <div className="space-y-2 pl-8">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Observation:
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.observation}</p>
                  </div>

                  <div className="pt-1">
                    <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block flex items-center space-x-1">
                      <BookOpen className="w-3.5 h-3.5 inline mr-1" />
                      Actionable Practice Recommendation:
                    </span>
                    <p className="text-xs text-purple-200 font-medium leading-relaxed bg-purple-950/20 p-2.5 rounded-lg border border-purple-900/40 mt-1">
                      {item.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
