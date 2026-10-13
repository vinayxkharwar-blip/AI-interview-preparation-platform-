import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  ArrowRight,
  ArrowLeft,
  Flag,
  RotateCcw,
  AlertTriangle,
  Building2,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';
import { submitPYQTest } from '../../api/aptitudePYQApi';

export const PYQTestEngine = ({
  testData,
  onComplete,
  onExit,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [timeLeft, setTimeLeft] = useState((testData?.timeLimitMinutes || 15) * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  const questions = testData?.questions || [];
  const currentQuestion = questions[currentIdx];

  // Active countdown timer
  useEffect(() => {
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
  }, []);

  const handleSelectOption = (optionText) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.questionId]: optionText,
    }));
  };

  const handleClearCurrent = () => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQuestion.questionId];
      return copy;
    });
  };

  const handleToggleFlag = () => {
    if (!currentQuestion) return;
    setFlagged((prev) => ({
      ...prev,
      [currentQuestion.questionId]: !prev[currentQuestion.questionId],
    }));
  };

  const handleAutoSubmit = () => {
    handleSubmitConfirmed();
  };

  const handleSubmitConfirmed = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    clearInterval(timerRef.current);

    const timeSpentSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      const res = await submitPYQTest(testData.testId, answers, timeSpentSeconds);
      if (onComplete) onComplete(res.result);
    } catch (err) {
      console.error('Error submitting PYQ test:', err);
      alert(err.response?.data?.message || 'Failed to submit test. Please check network connection.');
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="bg-[#FDFBF3] rounded-3xl border-2 border-[#0F1E1B] editorial-shadow-lg p-4 sm:p-8 max-w-5xl mx-auto my-6 animate-fadeIn">
      {/* Top Test Header */}
      <div className="flex flex-wrap items-center justify-between border-b-2 border-[#0F1E1B]/15 pb-4 mb-6 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#0F1E1B] text-[#FDFBF3] px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider">
              {testData.company || 'Placement Test'}
            </span>
            {testData.examYear && (
              <span className="bg-[#F5D90A] text-[#0F1E1B] px-2 py-0.5 rounded text-[10px] font-black">
                {testData.examYear} Paper
              </span>
            )}
            {testData.negativeMarking > 0 && (
              <span className="bg-rose-100 text-rose-800 border border-rose-400 px-2 py-0.5 rounded text-[10px] font-bold">
                -{testData.negativeMarking} Negative Marking
              </span>
            )}
          </div>
          <h2 className="font-serif-headline text-2xl font-black text-[#0F1E1B] mt-1">
            {testData.examName || `${testData.company} Official Mock`}
          </h2>
          <p className="text-xs text-[#0F1E1B]/70 mt-0.5">
            {testData.topic} • {testData.difficulty} Level • {questions.length} Questions
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Active Timer */}
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
            onClick={() => setShowSubmitModal(true)}
            disabled={isSubmitting}
            className="bg-[#C1440E] hover:bg-[#A3370B] text-white px-4 py-2 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm transition-transform hover:scale-102 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Finish Test'}
          </button>
        </div>
      </div>

      {/* Main Test Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Question Viewer Column */}
        <div className="lg:col-span-8 space-y-4">
          {currentQuestion ? (
            <div className="p-6 rounded-2xl bg-white border-2 border-[#0F1E1B] editorial-shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-7 h-7 rounded-lg bg-[#0F1E1B] text-[#FDFBF3] font-bold text-xs flex items-center justify-center">
                    Q{currentIdx + 1}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F5D90A]/40 text-[#0F1E1B]">
                    {currentQuestion.topic}
                  </span>
                  {currentQuestion.subtopic && (
                    <span className="text-[11px] font-semibold text-[#0F1E1B]/60">
                      ({currentQuestion.subtopic})
                    </span>
                  )}
                </div>

                {/* Mark for review toggle */}
                <button
                  onClick={handleToggleFlag}
                  className={`flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
                    flagged[currentQuestion.questionId]
                      ? 'bg-purple-100 text-purple-900 border-purple-400'
                      : 'bg-[#FDFBF3] text-[#0F1E1B]/60 border-neutral-300 hover:text-[#0F1E1B]'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>{flagged[currentQuestion.questionId] ? 'Flagged' : 'Mark for Review'}</span>
                </button>
              </div>

              {/* Question Text */}
              <h3 className="font-bold text-base sm:text-lg text-[#0F1E1B] leading-relaxed my-5">
                {currentQuestion.questionText}
              </h3>

              {/* Options */}
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

              {/* Bottom Nav Actions */}
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
                  Clear Selection
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

        {/* Right Palette Column */}
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
                const isFlagged = Boolean(flagged[q.questionId]);
                const isCurrent = idx === currentIdx;

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 rounded-lg text-xs font-bold border-2 transition-all relative ${
                      isCurrent
                        ? 'border-[#0F1E1B] bg-[#F5D90A] text-[#0F1E1B] editorial-shadow-sm scale-105'
                        : isFlagged
                        ? 'border-purple-600 bg-purple-100 text-purple-900'
                        : isAnswered
                        ? 'border-emerald-700 bg-emerald-600 text-white'
                        : 'border-[#0F1E1B]/30 bg-white text-[#0F1E1B]/70 hover:border-[#0F1E1B]'
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-600" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Status Legend */}
            <div className="mt-4 pt-4 border-t border-[#0F1E1B]/15 space-y-1.5 text-[11px] font-bold">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-700" />
                <span className="text-[#0F1E1B]/70">Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded bg-[#F5D90A] border border-[#0F1E1B]" />
                <span className="text-[#0F1E1B]/70">Current Question</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded bg-purple-200 border border-purple-500" />
                <span className="text-[#0F1E1B]/70">Marked for Review ({flaggedCount})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded bg-white border border-[#0F1E1B]/30" />
                <span className="text-[#0F1E1B]/70">Unanswered ({unansweredCount})</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#0F1E1B]/15">
              <button
                onClick={() => setShowSubmitModal(true)}
                className="w-full bg-[#C1440E] hover:bg-[#A3370B] text-white py-2.5 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm transition-all"
              >
                Submit Test & View Solutions
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-[#FDFBF3] rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg max-w-md w-full p-6 space-y-4">
            <h3 className="font-serif-headline text-2xl font-black text-[#0F1E1B]">
              Confirm Test Submission
            </h3>
            <p className="text-xs text-[#0F1E1B]/75 leading-relaxed">
              Are you sure you want to finish the test? Your responses will be graded server-side with verified correct answers and detailed step-by-step solutions.
            </p>

            <div className="p-4 rounded-xl bg-[#F5F2E6] border border-[#0F1E1B]/20 space-y-2 text-xs font-bold">
              <div className="flex justify-between">
                <span className="text-[#0F1E1B]/70">Answered Questions:</span>
                <span className="text-emerald-800">{answeredCount} of {questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#0F1E1B]/70">Unanswered Questions:</span>
                <span className="text-rose-800">{unansweredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#0F1E1B]/70">Marked for Review:</span>
                <span className="text-purple-800">{flaggedCount}</span>
              </div>
              {testData.negativeMarking > 0 && (
                <div className="pt-2 border-t border-[#0F1E1B]/10 text-rose-700 text-[11px]">
                  * Note: Incorrect answers incur -{testData.negativeMarking} negative marking.
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-[#0F1E1B] text-xs font-bold text-[#0F1E1B] hover:bg-[#F5F2E6]"
              >
                Resume Test
              </button>
              <button
                onClick={handleSubmitConfirmed}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-[#C1440E] hover:bg-[#A3370B] text-white text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Evaluating...' : 'Yes, Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PYQTestEngine;
