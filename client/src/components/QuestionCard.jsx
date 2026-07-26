import React, { useState } from 'react';
import { HelpCircle, Lightbulb, CheckSquare, Target, ChevronDown, ChevronUp } from 'lucide-react';

export default function QuestionCard({ question, currentNumber, totalQuestions }) {
  const [showHints, setShowHints] = useState(false);

  if (!question) return null;

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl space-y-6">
      {/* Header Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <span className="px-3.5 py-1.5 bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-full text-xs font-bold uppercase tracking-wider">
            Question {currentNumber} of {totalQuestions}
          </span>
          <span className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-xs font-medium flex items-center space-x-1.5">
            <Target className="w-3.5 h-3.5 text-purple-400" />
            <span>{question.category || 'General'}</span>
          </span>
        </div>
      </div>

      {/* Main Question Text */}
      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-white leading-snug tracking-tight">
          {question.questionText}
        </h3>
      </div>

      {/* Expected Key Points */}
      {question.expectedKeyPoints && question.expectedKeyPoints.length > 0 && (
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>Expected Key Concepts to Cover</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {question.expectedKeyPoints.map((point, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 bg-slate-800/90 border border-slate-700/60 text-slate-300 text-xs rounded-md"
              >
                • {point}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hints Accordion */}
      {question.hints && question.hints.length > 0 && (
        <div className="border-t border-slate-800 pt-4">
          <button
            onClick={() => setShowHints(!showHints)}
            className="flex items-center justify-between w-full text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-4 h-4" />
              <span>Need a hint or approach guidance?</span>
            </div>
            {showHints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHints && (
            <div className="mt-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-xs space-y-2 animate-fadeIn">
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
