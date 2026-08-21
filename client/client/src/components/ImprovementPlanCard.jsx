import React from 'react';
import { Target, Compass, BookOpen, Sparkles, CheckSquare } from 'lucide-react';

export default function ImprovementPlanCard({ plan }) {
  if (!plan) return null;

  return (
    <div className="bg-[#FDFBF3] text-[#0F1E1B] p-6 sm:p-8 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 border-b-2 border-[#0F1E1B]/15">
        <div className="p-3 bg-[#0F1E1B] text-[#F5D90A] rounded-2xl shadow-md">
          <Compass className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-serif-headline text-2xl font-bold text-[#0F1E1B]">AI-Synthesized Personalized Growth Roadmap</h3>
          <p className="text-xs text-[#0F1E1B]/70 font-medium">Custom recommendations based on your session response patterns.</p>
        </div>
      </div>

      {/* Overall Summary */}
      {plan.overallSummary && (
        <div className="p-4 bg-[#F5F2E6] rounded-2xl border-2 border-[#0F1E1B] text-xs text-[#0F1E1B] leading-relaxed font-medium">
          <span className="font-bold text-[#C1440E] block mb-1 uppercase tracking-wider text-[11px]">Executive Session Assessment:</span>
          {plan.overallSummary}
        </div>
      )}

      {/* Focus Areas List */}
      {plan.focusAreas && plan.focusAreas.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-[#0F1E1B] uppercase tracking-wider">
            Key Priority Focus Areas ({plan.focusAreas.length})
          </h4>

          <div className="space-y-4">
            {plan.focusAreas.map((item, idx) => (
              <div
                key={idx}
                className="p-5 bg-[#F3E8FF] rounded-2xl border-2 border-[#0F1E1B] space-y-3 shadow-xs"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-[#0F1E1B] text-[#F5D90A] text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <h5 className="font-serif-headline text-lg font-bold text-[#0F1E1B]">{item.topic}</h5>
                </div>

                <div className="space-y-2 pl-8">
                  <div>
                    <span className="text-[11px] font-bold text-[#0F1E1B]/70 uppercase tracking-wider block">
                      Observation:
                    </span>
                    <p className="text-xs text-[#0F1E1B] font-medium leading-relaxed">{item.observation}</p>
                  </div>

                  <div className="pt-1">
                    <span className="text-[11px] font-extrabold text-[#C1440E] uppercase tracking-wider block flex items-center space-x-1">
                      <BookOpen className="w-3.5 h-3.5 inline mr-1" />
                      Actionable Practice Recommendation:
                    </span>
                    <p className="text-xs text-[#0F1E1B] font-bold leading-relaxed bg-[#FDFBF3] p-3 rounded-xl border border-[#0F1E1B] mt-1 shadow-xs">
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
