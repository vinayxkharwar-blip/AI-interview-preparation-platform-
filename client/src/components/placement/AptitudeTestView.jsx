import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  Award,
  ChevronRight,
  HelpCircle,
  Layers
} from 'lucide-react';
import { submitAptitudeTest } from '../../api/placementApi';

export const AptitudeTestView = ({ driveId, testData, onComplete, onCancel }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState((testData?.durationMinutes || 15) * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedSection, setSelectedSection] = useState('all');
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  const questions = testData?.questions || [];
  const currentQuestion = questions[currentIdx];

  // Filter questions by section if selected
  const filteredIndices = questions
    .map((q, idx) => ({ ...q, originalIdx: idx }))
    .filter((q) => (selectedSection === 'all' ? true : q.section === selectedSection));

  // Timer countdown
  useEffect(() => {
    if (result) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [result]);

  const handleSelectOption = (optionText) => {
    if (result || !currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.questionId]: optionText,
    }));
  };

  const handleClearCurrent = () => {
    if (result || !currentQuestion) return;
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQuestion.questionId];
      return copy;
    });
  };

  const handleAutoSubmit = () => {
    handleSubmit(true);
  };

  const handleSubmit = async (isAuto = false) => {
    if (isSubmitting || result) return;

    if (!isAuto) {
      const answeredCount = Object.keys(answers).length;
      if (answeredCount < questions.length) {
        const confirmSubmit = window.confirm(
          `You have answered ${answeredCount} of ${questions.length} questions. Are you sure you want to submit?`
        );
        if (!confirmSubmit) return;
      }
    }

    setIsSubmitting(true);
    clearInterval(timerRef.current);

    const timeSpentSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      const res = await submitAptitudeTest(driveId, answers, timeSpentSeconds);
      setResult(res.result);
      if (onComplete) onComplete(res.drive);
    } catch (err) {
      console.error('Error submitting aptitude test:', err);
      alert(err.response?.data?.message || 'Failed to submit aptitude test. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="bg-[#FDFBF3] rounded-2xl border-2 border-[#0F1E1B] editorial-shadow-lg p-3.5 sm:p-8 max-w-5xl mx-auto my-2 sm:my-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[#0F1E1B]/15 pb-3 sm:pb-4 mb-4 sm:mb-6 gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-[#F5D90A] text-[#0F1E1B] px-2.5 py-0.5 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-wider">
              Round 1 of 4
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-[#0F1E1B]/60">Attempt {testData?.currentAttempt || 1} of {testData?.maxAttempts || 3}</span>
          </div>
          <h2 className="font-serif-headline text-xl sm:text-3xl font-black text-[#0F1E1B] leading-tight mt-0.5">
            Aptitude & Reasoning Assessment
          </h2>
          <p className="text-xs sm:text-sm text-[#0F1E1B]/70 font-medium">
            15 Questions across Quantitative, Logical, and Verbal Ability • 60% Pass Benchmark
          </p>
        </div>

        {!result ? (
          <div className="flex items-center space-x-3">
            <div
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border-2 font-mono font-bold text-sm ${
                timeLeft < 180
                  ? 'bg-rose-50 border-rose-500 text-rose-600 animate-pulse'
                  : 'bg-[#F5F2E6] border-[#0F1E1B] text-[#0F1E1B]'
              }`}
            >
              <Clock className="w-4 h-4 text-[#C1440E]" />
              <span>{formatTime(timeLeft)}</span>
            </div>

            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="bg-[#C1440E] hover:bg-[#A3370B] text-white px-4 py-2 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm hover:scale-102 transition-transform disabled:opacity-50"
            >
              {isSubmitting ? 'Evaluating...' : 'Submit Test'}
            </button>
          </div>
        ) : (
          <button
            onClick={onCancel}
            className="bg-[#0F1E1B] text-[#FDFBF3] px-4 py-2 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm hover:bg-[#1A332E] transition-all"
          >
            Back to Dashboard
          </button>
        )}
      </div>

      {/* RESULT VIEW */}
      {result ? (
        <div className="space-y-6">
          {/* Result Banner */}
          <div
            className={`p-6 rounded-2xl border-2 border-[#0F1E1B] ${
              result.passed
                ? 'bg-emerald-50 text-emerald-950 editorial-shadow'
                : 'bg-rose-50 text-rose-950 editorial-shadow'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-[#0F1E1B] ${
                    result.passed ? 'bg-emerald-400 text-emerald-950' : 'bg-rose-400 text-rose-950'
                  }`}
                >
                  {result.passed ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black uppercase tracking-wider">
                      {result.passed ? 'Round 1 Passed!' : 'Cutoff Not Cleared'}
                    </span>
                    <span className="text-xs font-bold opacity-75">
                      (Score: {result.score}% • Cutoff: {result.passThreshold}%)
                    </span>
                  </div>
                  <h3 className="font-serif-headline text-2xl font-black mt-0.5">
                    {result.passed ? 'Round 2 Technical Interview Unlocked' : 'Need Practice on Speed & Accuracy'}
                  </h3>
                  <p className="text-xs sm:text-sm mt-1 opacity-90">{result.feedback}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-3xl font-black font-serif-headline">
                  {result.totalCorrect} / {result.totalQuestions}
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">Correct Answers</span>
              </div>
            </div>

            {/* Section Breakdown Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-[#0F1E1B]/15">
              <div className="bg-white/80 p-3 rounded-xl border border-[#0F1E1B]/20">
                <div className="text-[11px] font-bold text-[#0F1E1B]/70 uppercase">Quantitative Aptitude</div>
                <div className="text-lg font-black text-[#0F1E1B]">
                  {result.breakdown?.quantitative?.score} / {result.breakdown?.quantitative?.total}
                </div>
                <div className="text-[10px] text-[#0F1E1B]/60 font-medium">Math & Percentages</div>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-[#0F1E1B]/20">
                <div className="text-[11px] font-bold text-[#0F1E1B]/70 uppercase">Logical Reasoning</div>
                <div className="text-lg font-black text-[#0F1E1B]">
                  {result.breakdown?.logical?.score} / {result.breakdown?.logical?.total}
                </div>
                <div className="text-[10px] text-[#0F1E1B]/60 font-medium">Puzzles & Deductions</div>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-[#0F1E1B]/20">
                <div className="text-[11px] font-bold text-[#0F1E1B]/70 uppercase">Verbal Ability</div>
                <div className="text-lg font-black text-[#0F1E1B]">
                  {result.breakdown?.verbal?.score} / {result.breakdown?.verbal?.total}
                </div>
                <div className="text-[10px] text-[#0F1E1B]/60 font-medium">Grammar & Vocabulary</div>
              </div>
            </div>
          </div>

          {/* Solutions & Explanations Header */}
          <div className="flex items-center justify-between pt-4">
            <h4 className="font-serif-headline text-xl font-black text-[#0F1E1B] flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-[#C1440E]" />
              <span>Detailed Solutions & Step-by-Step Explanations</span>
            </h4>
          </div>

          {/* Detailed Question Review Cards */}
          <div className="space-y-4">
            {result.questions?.map((q, idx) => (
              <div
                key={idx}
                className={`p-4 sm:p-5 rounded-xl border-2 ${
                  q.isCorrect ? 'border-emerald-600 bg-emerald-50/30' : 'border-rose-400 bg-rose-50/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-md bg-[#0F1E1B] text-[#FDFBF3] text-xs font-bold flex items-center justify-center">
                      Q{idx + 1}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F5F2E6] border border-[#0F1E1B]/20 text-[#0F1E1B]">
                      {q.section}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                      q.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {q.isCorrect ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> <span>Correct</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" /> <span>Incorrect</span>
                      </>
                    )}
                  </span>
                </div>

                <p className="font-bold text-[#0F1E1B] text-sm sm:text-base mt-2">{q.questionText}</p>

                {/* Option grid review */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {q.options?.map((opt, oIdx) => {
                    const isCorrectChoice = opt.trim() === q.correctOption.trim();
                    const isUserChoice = opt.trim() === (q.userSelectedOption || '').trim();

                    return (
                      <div
                        key={oIdx}
                        className={`p-2.5 rounded-lg text-xs font-semibold border flex items-center justify-between ${
                          isCorrectChoice
                            ? 'bg-emerald-100/90 border-emerald-600 text-emerald-950 font-bold'
                            : isUserChoice
                            ? 'bg-rose-100/80 border-rose-500 text-rose-950 line-through'
                            : 'bg-white/60 border-neutral-200 text-[#0F1E1B]/70'
                        }`}
                      >
                        <span>{opt}</span>
                        {isCorrectChoice && <span className="text-[10px] text-emerald-800 font-black">✓ Correct</span>}
                        {isUserChoice && !isCorrectChoice && (
                          <span className="text-[10px] text-rose-800 font-bold">Your Choice</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Step-by-Step Explanation */}
                {q.explanation && (
                  <div className="mt-3 p-3 rounded-lg bg-[#FDFBF3] border border-[#0F1E1B]/15 text-xs text-[#0F1E1B]/80">
                    <span className="font-bold text-[#C1440E]">Explanation: </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ACTIVE TEST VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Question Column */}
          <div className="lg:col-span-8 space-y-5">
            {/* Section tabs & Progress */}
            <div className="flex items-center justify-between bg-[#F5F2E6] p-2 rounded-xl border border-[#0F1E1B]/15">
              <div className="flex space-x-1">
                {['all', 'quantitative', 'logical', 'verbal'].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setSelectedSection(sec)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                      selectedSection === sec
                        ? 'bg-[#0F1E1B] text-[#FDFBF3] shadow-xs'
                        : 'text-[#0F1E1B]/70 hover:text-[#0F1E1B]'
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-[#0F1E1B]/70 px-2">
                Answered: <b className="text-[#0F1E1B]">{answeredCount}</b> / {questions.length}
              </span>
            </div>

            {/* Current Question Display */}
            {currentQuestion ? (
              <div className="p-6 rounded-2xl bg-white border-2 border-[#0F1E1B] editorial-shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-[#0F1E1B] text-[#FDFBF3] font-bold text-xs flex items-center justify-center">
                      Q{currentIdx + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F5D90A]/40 text-[#0F1E1B]">
                      {currentQuestion.section}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#0F1E1B]/60">Single Choice</span>
                </div>

                <h3 className="font-bold text-base sm:text-lg text-[#0F1E1B] leading-relaxed my-4">
                  {currentQuestion.questionText}
                </h3>

                {/* Options List */}
                <div className="space-y-2.5 my-6">
                  {currentQuestion.options?.map((option, oIdx) => {
                    const isSelected = answers[currentQuestion.questionId] === option;
                    const letter = String.fromCharCode(65 + oIdx);

                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleSelectOption(option)}
                        className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center space-x-3 ${
                          isSelected
                            ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B] editorial-shadow-sm font-bold scale-[1.01]'
                            : 'bg-[#FDFBF3] hover:bg-[#F5F2E6] border-[#0F1E1B]/20 text-[#0F1E1B]'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                            isSelected ? 'bg-[#F5D90A] text-[#0F1E1B]' : 'bg-[#E6E4DC] text-[#0F1E1B]'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="text-sm">{option}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Question Navigation Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-[#0F1E1B]/15">
                  <button
                    onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                    disabled={currentIdx === 0}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[#0F1E1B]/30 hover:bg-[#F5F2E6] disabled:opacity-40"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <button
                    onClick={handleClearCurrent}
                    className="text-xs font-semibold text-[#C1440E] hover:underline"
                  >
                    Clear Choice
                  </button>

                  <button
                    onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                    disabled={currentIdx === questions.length - 1}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0F1E1B] text-[#FDFBF3] hover:bg-[#1A332E] disabled:opacity-40"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right Question Palette Column */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#F5F2E6] p-4 rounded-2xl border-2 border-[#0F1E1B] editorial-shadow-sm">
              <h4 className="font-serif-headline text-base font-black text-[#0F1E1B] mb-3 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#C1440E]" />
                <span>Question Palette</span>
              </h4>

              {/* Grid of question buttons */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = Boolean(answers[q.questionId]);
                  const isCurrent = idx === currentIdx;

                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-9 rounded-lg text-xs font-bold border-2 transition-all ${
                        isCurrent
                          ? 'border-[#0F1E1B] bg-[#F5D90A] text-[#0F1E1B] editorial-shadow-sm scale-105'
                          : isAnswered
                          ? 'border-emerald-700 bg-emerald-600 text-white'
                          : 'border-[#0F1E1B]/30 bg-white text-[#0F1E1B]/70 hover:border-[#0F1E1B]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-[#0F1E1B]/15 space-y-1.5 text-[11px] font-bold">
                <div className="flex items-center space-x-2">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-600 border border-emerald-700" />
                  <span className="text-[#0F1E1B]/70">Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3.5 h-3.5 rounded bg-[#F5D90A] border border-[#0F1E1B]" />
                  <span className="text-[#0F1E1B]/70">Current Question</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3.5 h-3.5 rounded bg-white border border-[#0F1E1B]/30" />
                  <span className="text-[#0F1E1B]/70">Unanswered ({questions.length - answeredCount})</span>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="mt-6 pt-4 border-t border-[#0F1E1B]/15">
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                  className="w-full bg-[#C1440E] hover:bg-[#A3370B] text-white py-2.5 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Evaluating...' : 'Complete & Submit Round 1'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AptitudeTestView;
