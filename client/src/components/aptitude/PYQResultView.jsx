import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Brain,
  RotateCcw,
  ExternalLink,
  Layers,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

export const PYQResultView = ({
  result,
  onRetake,
  onBackToSelector,
}) => {
  const [filterSection, setFilterSection] = useState('all'); // 'all', 'incorrect', 'correct'

  if (!result) return null;

  const questions = result.questions || [];
  const filteredQuestions = questions.filter((q) => {
    if (filterSection === 'incorrect') return !q.isCorrect && q.isAnswered;
    if (filterSection === 'unanswered') return !q.isAnswered;
    if (filterSection === 'correct') return q.isCorrect;
    return true;
  });

  const negativePenalty = (result.totalIncorrect * (result.negativeMarking || 0)).toFixed(2);

  return (
    <div className="bg-[#FDFBF3] rounded-3xl border-2 border-[#0F1E1B] editorial-shadow-lg p-6 sm:p-10 max-w-5xl mx-auto my-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between border-b-2 border-[#0F1E1B]/15 pb-6 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#0F1E1B] text-[#FDFBF3] px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider">
              {result.company || 'Placement Test'}
            </span>
            {result.examYear && (
              <span className="bg-[#F5D90A] text-[#0F1E1B] px-2 py-0.5 rounded text-[10px] font-black">
                {result.examYear} Paper
              </span>
            )}
            <span className="text-xs font-bold text-[#0F1E1B]/60">Verified PYQ Assessment Report</span>
          </div>
          <h2 className="font-serif-headline text-3xl font-black text-[#0F1E1B] mt-1.5">
            {result.examName || `${result.company} Placement Assessment`} Scorecard
          </h2>
          <p className="text-xs sm:text-sm text-[#0F1E1B]/70 mt-0.5">
            {result.topic} • {result.difficulty} Level • Negative Marking: -{result.negativeMarking} per error
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onRetake}
            className="flex items-center space-x-1.5 bg-white hover:bg-[#F5F2E6] text-[#0F1E1B] px-4 py-2.5 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#C1440E]" />
            <span>Retake Test</span>
          </button>
          <button
            onClick={onBackToSelector}
            className="bg-[#0F1E1B] text-[#FDFBF3] hover:bg-[#1A332E] px-4 py-2.5 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm transition-all"
          >
            Back to Companies
          </button>
        </div>
      </div>

      {/* Main Score & Cutoff Banner */}
      <div
        className={`my-8 p-6 sm:p-8 rounded-3xl border-2 border-[#0F1E1B] editorial-shadow flex flex-col md:flex-row items-center justify-between gap-6 ${
          result.passed
            ? 'bg-emerald-50 text-emerald-950'
            : 'bg-rose-50 text-rose-950'
        }`}
      >
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
                result.passed
                  ? 'bg-emerald-200 border-emerald-600 text-emerald-900'
                  : 'bg-rose-200 border-rose-600 text-rose-900'
              }`}
            >
              {result.passed ? 'Benchmark Cutoff Cleared 🎉' : 'Cutoff Not Cleared'}
            </span>
            <span className="text-xs font-bold opacity-75">
              (60% Placement Benchmark)
            </span>
          </div>

          <h3 className="font-serif-headline text-2xl sm:text-3xl font-black">
            {result.passed
              ? `Congratulations! Ready for ${result.company} Qualifiers.`
              : `Needs Practice on ${result.weakTopics?.join(', ') || 'Core Aptitude Topics'}`}
          </h3>
          <p className="text-xs sm:text-sm opacity-85 max-w-xl leading-relaxed">
            {result.recommendations?.[0] ||
              'Review the detailed step-by-step explanations below to address conceptual gaps before attempting another mock.'}
          </p>
        </div>

        {/* Score Tile */}
        <div className="bg-[#FDFBF3] text-[#0F1E1B] p-5 rounded-2xl border-2 border-[#0F1E1B] editorial-shadow-sm text-center shrink-0 min-w-[170px]">
          <div className="text-4xl sm:text-5xl font-black font-serif-headline text-[#C1440E]">
            {result.rawScore}
            <span className="text-xl text-[#0F1E1B]/60 font-sans">/{result.maxScore}</span>
          </div>
          <div className="text-xs font-black uppercase tracking-wider text-[#0F1E1B]/80 mt-1">
            Accuracy: {result.percentage}%
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
        <div className="bg-white p-4 rounded-2xl border-2 border-[#0F1E1B] editorial-shadow-sm">
          <div className="text-[10px] font-black uppercase text-emerald-800">Correct Answers</div>
          <div className="text-2xl sm:text-3xl font-black font-serif-headline text-[#0F1E1B] mt-1">
            {result.totalCorrect} <span className="text-xs font-normal text-[#0F1E1B]/60">/ {result.totalQuestions}</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-700">+{result.totalCorrect} Marks</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-[#0F1E1B] editorial-shadow-sm">
          <div className="text-[10px] font-black uppercase text-rose-800">Incorrect Answers</div>
          <div className="text-2xl sm:text-3xl font-black font-serif-headline text-[#0F1E1B] mt-1">
            {result.totalIncorrect}
          </div>
          <span className="text-[10px] font-bold text-rose-700">
            {result.negativeMarking > 0 ? `-${negativePenalty} Negative Penalty` : 'No penalty'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-[#0F1E1B] editorial-shadow-sm">
          <div className="text-[10px] font-black uppercase text-neutral-600">Unanswered</div>
          <div className="text-2xl sm:text-3xl font-black font-serif-headline text-[#0F1E1B] mt-1">
            {result.totalUnanswered}
          </div>
          <span className="text-[10px] font-bold text-neutral-500">0 Marks deducted</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-[#0F1E1B] editorial-shadow-sm">
          <div className="text-[10px] font-black uppercase text-[#C1440E]">Time Spent</div>
          <div className="text-2xl sm:text-3xl font-black font-serif-headline text-[#0F1E1B] mt-1">
            {Math.floor(result.timeSpentSeconds / 60)}m {result.timeSpentSeconds % 60}s
          </div>
          <span className="text-[10px] font-bold text-[#0F1E1B]/60">Pacing Speed</span>
        </div>
      </div>

      {/* Topic-Wise Breakdown & Weak Topics */}
      <div className="my-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Topic performance meters */}
        <div className="bg-[#F5F2E6] p-6 rounded-2xl border-2 border-[#0F1E1B] editorial-shadow-sm space-y-4">
          <h4 className="font-serif-headline text-lg font-black text-[#0F1E1B] flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-[#C1440E]" />
            <span>Topic-Wise Accuracy Breakdown</span>
          </h4>

          <div className="space-y-3">
            {result.topicBreakdown?.map((tb, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#0F1E1B]">{tb.topic}</span>
                  <span className={tb.accuracy >= 60 ? 'text-emerald-800' : 'text-rose-800'}>
                    {tb.correct}/{tb.total} ({tb.accuracy}%)
                  </span>
                </div>
                <div className="w-full bg-[#0F1E1B]/10 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      tb.accuracy >= 60 ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                    style={{ width: `${tb.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actionable Recommendations & Weak Topics */}
        <div className="bg-[#F5F2E6] p-6 rounded-2xl border-2 border-[#0F1E1B] editorial-shadow-sm space-y-3">
          <h4 className="font-serif-headline text-lg font-black text-[#0F1E1B] flex items-center space-x-2">
            <Brain className="w-4 h-4 text-[#C1440E]" />
            <span>Personalized Practice Action Items</span>
          </h4>

          {result.weakTopics?.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-100/70 border border-rose-300 text-xs text-rose-950 font-bold">
              Detected Weak Topics: <span className="underline">{result.weakTopics.join(', ')}</span>
            </div>
          )}

          <ul className="space-y-2 text-xs text-[#0F1E1B]/80 list-disc list-inside leading-relaxed">
            {result.recommendations?.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Detailed Solutions & Step-by-Step Explanations */}
      <div className="my-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#0F1E1B]/15 pb-4">
          <h4 className="font-serif-headline text-2xl font-black text-[#0F1E1B] flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-[#C1440E]" />
            <span>Question Solutions & Step-by-Step Explanations</span>
          </h4>

          {/* Solution Filters */}
          <div className="flex space-x-1.5 text-xs font-bold">
            {['all', 'incorrect', 'unanswered', 'correct'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterSection(f)}
                className={`px-3 py-1 rounded-lg capitalize border transition-all ${
                  filterSection === f
                    ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B]'
                    : 'bg-white text-[#0F1E1B]/70 border-neutral-300 hover:border-[#0F1E1B]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List of Questions with Explanations */}
        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => {
            const isUserCorrect = q.isCorrect;
            const isUnanswered = !q.isAnswered;

            return (
              <div
                key={idx}
                className={`p-5 rounded-2xl border-2 transition-all ${
                  isUserCorrect
                    ? 'border-emerald-600 bg-emerald-50/30'
                    : isUnanswered
                    ? 'border-neutral-400 bg-neutral-50/50'
                    : 'border-rose-400 bg-rose-50/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-md bg-[#0F1E1B] text-[#FDFBF3] text-xs font-bold flex items-center justify-center">
                      Q{idx + 1}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F5D90A]/40 text-[#0F1E1B]">
                      {q.topic}
                    </span>
                    {q.subtopic && (
                      <span className="text-[11px] font-semibold text-[#0F1E1B]/60">
                        • {q.subtopic}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-full flex items-center space-x-1 ${
                      isUserCorrect
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-400'
                        : isUnanswered
                        ? 'bg-neutral-200 text-neutral-800 border border-neutral-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-400'
                    }`}
                  >
                    {isUserCorrect ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> <span>Correct (+1.0)</span>
                      </>
                    ) : isUnanswered ? (
                      <>
                        <HelpCircle className="w-3.5 h-3.5" /> <span>Unanswered (0.0)</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />{' '}
                        <span>
                          Incorrect ({result.negativeMarking > 0 ? `-${result.negativeMarking}` : '0.0'})
                        </span>
                      </>
                    )}
                  </span>
                </div>

                {/* Question */}
                <p className="font-bold text-sm sm:text-base text-[#0F1E1B] leading-relaxed my-3">
                  {q.questionText}
                </p>

                {/* Options grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
                  {q.options?.map((opt, oIdx) => {
                    const isOptionCorrect = String(opt).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
                    const isUserChoice = String(opt).trim().toLowerCase() === String(q.userAnswer || '').trim().toLowerCase();

                    return (
                      <div
                        key={oIdx}
                        className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-between ${
                          isOptionCorrect
                            ? 'bg-emerald-100 border-emerald-600 text-emerald-950 font-bold'
                            : isUserChoice && !isOptionCorrect
                            ? 'bg-rose-100 border-rose-500 text-rose-950 line-through font-bold'
                            : 'bg-white border-neutral-200 text-[#0F1E1B]/70'
                        }`}
                      >
                        <span>{opt}</span>
                        {isOptionCorrect && (
                          <span className="text-[10px] text-emerald-800 font-black ml-2 shrink-0">
                            ✓ Correct Option
                          </span>
                        )}
                        {isUserChoice && !isOptionCorrect && (
                          <span className="text-[10px] text-rose-800 font-bold ml-2 shrink-0">
                            Your Choice
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Step-by-Step Mathematical / Logical Explanation */}
                {q.explanation && (
                  <div className="mt-3 p-3.5 rounded-xl bg-[#FDFBF3] border border-[#0F1E1B]/15 text-xs text-[#0F1E1B] space-y-1">
                    <span className="font-black text-[#C1440E] uppercase text-[11px] block">
                      Detailed Mathematical / Logical Solution:
                    </span>
                    <p className="leading-relaxed">{q.explanation}</p>
                  </div>
                )}

                {/* Source Attribution */}
                {q.sourceTitle && (
                  <div className="mt-2 text-[10px] font-bold text-[#0F1E1B]/50 flex items-center space-x-1.5">
                    <span>Source: {q.sourceTitle}</span>
                    {q.sourceUrl && (
                      <a
                        href={q.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#C1440E] hover:underline flex items-center space-x-0.5"
                      >
                        <span>[Reference Link]</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PYQResultView;
