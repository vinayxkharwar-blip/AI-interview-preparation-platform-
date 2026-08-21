import React from 'react';
import { Award, CheckCircle2, XCircle, Lightbulb, Star, ShieldCheck } from 'lucide-react';
import { toHundredScale } from '../utils/score';

export default function FeedbackCard({ feedback }) {
  if (!feedback) return null;

  const normalizedScore = toHundredScale(feedback.score);

  return (
    <div className="bg-[#FDFBF3] text-[#0F1E1B] p-6 sm:p-8 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-6 animate-fadeIn">
      {/* Top Banner with Score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#F5F2E6] rounded-2xl border-2 border-[#0F1E1B]">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-[#0F1E1B] text-[#F5D90A] rounded-2xl shadow-md">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <h4 className="font-serif-headline text-2xl font-bold text-[#0F1E1B]">AI Grading & Rubric Report</h4>
            <p className="text-xs text-[#0F1E1B]/70 font-medium">Category: {feedback.category || 'General'}</p>
          </div>
        </div>

        {/* Dynamic Score Badge */}
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-[#0F1E1B]/70 uppercase font-black">Performance Grade</span>
            <p className="text-xs font-bold text-[#C1440E]">
              {normalizedScore >= 80 ? 'Exceptional (Offer Level)' : normalizedScore >= 60 ? 'Competent' : 'Needs Practice'}
            </p>
          </div>
          <div className="px-5 py-2.5 rounded-2xl bg-[#F5D90A] border-2 border-[#0F1E1B] flex items-center space-x-2 editorial-shadow-sm text-[#0F1E1B]">
            <Star className="w-5 h-5 fill-[#0F1E1B]" />
            <span className="font-serif-headline text-3xl font-black">{normalizedScore}</span>
            <span className="text-xs font-bold opacity-75">/ 100</span>
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Strengths */}
        <div className="bg-[#DCFCE7] p-5 rounded-2xl border-2 border-[#0F1E1B] space-y-3">
          <div className="flex items-center space-x-2 text-[#0F1E1B] text-xs font-extrabold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-800" />
            <span>Key Strengths Identified</span>
          </div>
          {feedback.strengths && feedback.strengths.length > 0 ? (
            <ul className="space-y-2">
              {feedback.strengths.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-xs text-[#0F1E1B] font-bold leading-relaxed">
                  <span className="text-emerald-800 font-extrabold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#0F1E1B]/60 italic font-medium">No specific strengths noted.</p>
          )}
        </div>

        {/* Weaknesses */}
        <div className="bg-[#FCE7F3] p-5 rounded-2xl border-2 border-[#0F1E1B] space-y-3">
          <div className="flex items-center space-x-2 text-[#0F1E1B] text-xs font-extrabold uppercase tracking-wider">
            <XCircle className="w-4 h-4 text-rose-800" />
            <span>Areas for Improvement</span>
          </div>
          {feedback.weaknesses && feedback.weaknesses.length > 0 ? (
            <ul className="space-y-2">
              {feedback.weaknesses.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-xs text-[#0F1E1B] font-bold leading-relaxed">
                  <span className="text-rose-800 font-extrabold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#0F1E1B]/60 italic font-medium">No major weaknesses detected.</p>
          )}
        </div>

      </div>

      {/* Actionable Suggestion */}
      {(feedback.suggestion || feedback.actionableFeedback) && (
        <div className="p-5 bg-[#F3E8FF] border-2 border-[#0F1E1B] rounded-2xl flex items-start space-x-3">
          <Lightbulb className="w-5 h-5 text-[#C1440E] shrink-0 mt-0.5" />
          <div>
            <h5 className="text-xs font-extrabold text-[#0F1E1B] uppercase tracking-wider mb-1">
              Expert AI Coach Action Item
            </h5>
            <p className="text-xs text-[#0F1E1B] font-medium leading-relaxed">
              {feedback.suggestion || feedback.actionableFeedback}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
