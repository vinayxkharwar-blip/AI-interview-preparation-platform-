import React, { useState } from 'react';
import { HelpCircle, Lightbulb, CheckSquare, Target, ChevronDown, ChevronUp } from 'lucide-react';

export default function QuestionCard({ question, currentNumber, totalQuestions }) {
  const [showHints, setShowHints] = useState(false);

  if (!question) return null;

  return (
    <div className="bg-[#FDFBF3] text-[#0F1E1B] p-6 sm:p-8 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-6">
      {/* Header Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <span className="px-3.5 py-1 bg-[#F5D90A] text-[#0F1E1B] border-2 border-[#0F1E1B] rounded-full text-xs font-black uppercase tracking-wider shadow-xs">
            Question {currentNumber} of {totalQuestions}
          </span>
          <span className="px-3 py-1 bg-[#F5F2E6] text-[#0F1E1B] border-2 border-[#0F1E1B] rounded-full text-xs font-bold flex items-center space-x-1.5">
            <Target className="w-3.5 h-3.5 text-[#C1440E]" />
            <span>{question.category || 'General'}</span>
          </span>
        </div>
      </div>

      {/* Main Question Text */}
      <div>
        <h3 className="font-serif-headline text-2xl sm:text-3xl font-bold text-[#0F1E1B] leading-tight tracking-tight">
          "{question.questionText}"
        </h3>
      </div>

      {/* Expected Key Points */}
      {question.expectedKeyPoints && question.expectedKeyPoints.length > 0 && (
        <div className="bg-[#DCFCE7] p-4 rounded-2xl border-2 border-[#0F1E1B]">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#0F1E1B] uppercase tracking-wider mb-2">
            <CheckSquare className="w-4 h-4 text-[#C1440E]" />
            <span>Expected Key Concepts to Cover</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {question.expectedKeyPoints.map((point, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-[#FDFBF3] border-2 border-[#0F1E1B] text-[#0F1E1B] text-xs font-bold rounded-xl shadow-xs"
              >
                • {point}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hints Accordion */}
      {question.hints && question.hints.length > 0 && (
        <div className="border-t-2 border-[#0F1E1B]/15 pt-4">
          <button
            onClick={() => setShowHints(!showHints)}
            className="flex items-center justify-between w-full text-xs font-bold text-[#C1440E] hover:underline transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-4 h-4 text-[#0F1E1B]" />
              <span>Need a hint or approach guidance?</span>
            </div>
            {showHints ? <ChevronUp className="w-4 h-4 text-[#0F1E1B]" /> : <ChevronDown className="w-4 h-4 text-[#0F1E1B]" />}
          </button>

          {showHints && (
            <div className="mt-3 p-4 bg-[#FEF9C3] border-2 border-[#0F1E1B] rounded-2xl text-[#0F1E1B] text-xs font-bold space-y-2 animate-fadeIn">
              {question.hints.map((hint, idx) => (
                <p key={idx}>💡 {hint}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
