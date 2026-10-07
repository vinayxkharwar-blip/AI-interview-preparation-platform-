import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import QuestionCard from '../components/QuestionCard';
import AnswerRecorder from '../components/AnswerRecorder';
import FeedbackCard from '../components/FeedbackCard';
import SessionSummary from '../components/SessionSummary';
import ImprovementPlanCard from '../components/ImprovementPlanCard';
import PostInterviewLearning from '../components/PostInterviewLearning';
import { 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  Video, 
  Volume2, 
  Clock, 
  ShieldCheck, 
  Keyboard, 
  Type, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  CheckCircle2 
} from 'lucide-react';

export default function InterviewSession() {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState({});
  const [feedbackMap, setFeedbackMap] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [improvementPlan, setImprovementPlan] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTextAnswer, setShowTextAnswer] = useState(false);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const res = await axiosClient.get(`/sessions/${sessionId}`);
        const { session: sessDoc, questions: qList, answers: aList, feedback: fList, improvementPlan: planDoc } = res.data;

        setSession(sessDoc);
        setQuestions(qList || []);

        if (!qList || qList.length === 0) {
          console.warn('[InterviewSession] ⚠️ Session loaded but questions array is empty!');
          setError('No questions found for this session. Please start a new session.');
        }

        const aMap = {};
        const fMap = {};
        if (aList) {
          aList.forEach((a) => {
            aMap[a.question] = a;
          });
        }
        if (fList) {
          fList.forEach((f) => {
            if (f.answer) {
              const matchingAns = aList?.find((a) => String(a._id) === String(f.answer));
              if (matchingAns) {
                fMap[matchingAns.question] = f;
              }
            }
          });
        }

        setAnswersMap(aMap);
        setFeedbackMap(fMap);

        if (sessDoc?.status === 'completed') {
          setSessionCompleted(true);
          setImprovementPlan(planDoc);
          setSummaryData({
            overallScore: sessDoc.overallScore,
            categoryBreakdown: sessDoc.categoryBreakdown,
          });
        }
      } catch (err) {
        console.error('[InterviewSession] Failed to load session details:', err);
        setError('Failed to load interview session details: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  const currentQuestion = questions[currentIndex];
  const currentFeedback = currentQuestion ? feedbackMap[currentQuestion._id] : null;

  const handleAnswerSubmit = async ({ transcript, answerType, audioUrl }) => {
    if (!currentQuestion) {
      setError('Cannot submit answer: current question is invalid or missing.');
      return;
    }

    if (!transcript || !transcript.trim()) {
      setError('Please enter or record an answer before submitting.');
      return;
    }

    const questionIdToSubmit = currentQuestion._id || currentQuestion.id;
    const requestPayload = {
      sessionId,
      questionId: questionIdToSubmit,
      transcript: transcript.trim(),
      answerType: answerType || 'text',
      audioUrl: audioUrl || '',
    };

    setIsSubmitting(true);
    setError('');

    try {
      const res = await axiosClient.post('/answers/submit', requestPayload);
      const { answer, feedback } = res.data;

      setAnswersMap((prev) => ({ ...prev, [questionIdToSubmit]: answer }));
      setFeedbackMap((prev) => ({ ...prev, [questionIdToSubmit]: feedback }));

      setIsSubmitting(false);
    } catch (err) {
      console.error('[InterviewSession] Submit answer failed:', err);
      setError(err.response?.data?.message || 'Failed to analyze candidate answer.');
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowTextAnswer(false);
    } else {
      setIsCompleting(true);
      setError('');
      try {
        const res = await axiosClient.post(`/sessions/${sessionId}/complete`);
        const { overallScore, categoryBreakdown, improvementPlan: planDoc } = res.data;

        setSummaryData({ overallScore, categoryBreakdown });
        setImprovementPlan(planDoc);
        setSessionCompleted(true);
      } catch (err) {
        console.error('Complete session error:', err);
        setError('Error completing interview session.');
      } finally {
        setIsCompleting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-[#0F1E1B] font-medium">
        <Loader2 className="w-10 h-10 animate-spin text-[#C1440E] mb-3" />
        <p className="text-sm font-bold">Preparing live interview environment...</p>
      </div>
    );
  }

  if (sessionCompleted) {
    const feedbackList = Object.values(feedbackMap);
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
        <SessionSummary
          session={session}
          overallScore={summaryData?.overallScore}
          categoryBreakdown={summaryData?.categoryBreakdown}
          onStartNew={() => navigate('/new-session')}
        />
        {improvementPlan && <ImprovementPlanCard plan={improvementPlan} />}
        <PostInterviewLearning
          session={session}
          improvementPlan={improvementPlan}
          feedbackList={feedbackList}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fadeIn">
      
      {/* Progress Top Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-[#FDFBF3] text-neutral-900 p-4 sm:p-5 rounded-2xl border border-neutral-200 gap-4">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-semibold text-neutral-600">
            Target Role: <strong className="text-neutral-900">{session?.targetRole}</strong>
          </span>
          <span className="text-neutral-300">•</span>
          {session?.focusTopic ? (
            <span className="px-2.5 py-0.5 bg-neutral-100 text-neutral-800 text-xs font-semibold rounded-full">
              Focused Practice: {session.focusTopic}
            </span>
          ) : (
            <span className="text-xs font-semibold text-neutral-600 capitalize">
              Loop: <strong className="text-neutral-900">{session?.interviewType}</strong>
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="flex items-center space-x-3">
          <div className="w-36 bg-neutral-100 h-2.5 rounded-full border border-neutral-200 overflow-hidden">
            <div
              className="bg-[#E7B92E] h-full transition-all duration-300 rounded-full"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
          <span className="text-xs font-semibold font-mono text-neutral-600">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-rose-800 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Focused Practice Badge */}
      {session?.focusTopic && (
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5 text-[#E7B92E]" />
          <span>Focused Practice: {session.focusTopic}</span>
        </div>
      )}

      {/* PRIMARY ANSWER MODE: FULL-WIDTH HERO VIDEO CALL CARD */}
      {!currentFeedback && (
        <div className="bg-[#18181B] text-white rounded-3xl border border-white/10 p-6 sm:p-7 space-y-5">
          {/* Header Row: Avatar with live dot + Name & single muted metadata line */}
          <div className="flex items-center space-x-3.5">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-[#E7B92E]" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#18181B]"></span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">Alex</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                AI technical interviewer · 15 min · not recorded
              </p>
            </div>
          </div>

          {/* Conversational Question Prompt */}
          <div className="bg-white/[0.04] border border-white/10 p-5 sm:p-6 rounded-2xl space-y-3">
            <p className="text-xs text-neutral-400 font-medium">
              Talk through question {currentIndex + 1} of {questions.length} out loud
            </p>
            <p className="font-serif-headline text-lg sm:text-2xl font-bold text-white leading-snug sm:leading-relaxed">
              "{currentQuestion?.questionText}"
            </p>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Alex will listen in real time, evaluate your technical depth, and ask interactive follow-up questions.
            </p>
          </div>

          {/* Primary CTA Button (Single Brightest Element) */}
          <div>
            <button
              type="button"
              onClick={() => navigate(`/interview/${sessionId}/live`)}
              className="w-full py-3.5 px-5 bg-[#E7B92E] hover:bg-[#dda91b] text-neutral-950 font-bold text-sm sm:text-base rounded-xl transition-all flex items-center justify-center space-x-2 shadow-sm hover:shadow active:scale-[0.99] cursor-pointer"
            >
              <Video className="w-4 h-4 text-neutral-950" />
              <span>Start live interview</span>
              <ArrowRight className="w-4 h-4 text-neutral-950" />
            </button>
          </div>
        </div>
      )}

      {/* SECONDARY MODE: COLLAPSED / EXPANDABLE TEXT & VOICE INPUT */}
      {!currentFeedback && (
        <div className="space-y-6">
          {!showTextAnswer ? (
            /* Quiet collapsed row */
            <div className="p-4 bg-[#FDFBF3] text-neutral-800 rounded-2xl border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-neutral-100 text-neutral-600 rounded-xl border border-neutral-200">
                  <Keyboard className="w-4 h-4" />
                </div>
                <p className="text-xs sm:text-sm text-neutral-600 font-medium">
                  Prefer to type this one? Answer with text or a voice note instead.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTextAnswer(true)}
                className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs rounded-xl border border-neutral-300 transition-all flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
              >
                <Type className="w-3.5 h-3.5 text-neutral-500" />
                <span>Type instead</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>
            </div>
          ) : (
            /* Expanded text/voice input workspace */
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F1E1B]/80 flex items-center space-x-2">
                  <Type className="w-4 h-4 text-[#C1440E]" />
                  <span>Text & Voice Note Workspace</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowTextAnswer(false)}
                  className="text-xs font-bold text-[#0F1E1B]/60 hover:text-[#0F1E1B] flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <span>Hide text input</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Question Card with hints and collapsed expected key concepts */}
              {currentQuestion && (
                <QuestionCard
                  question={currentQuestion}
                  currentNumber={currentIndex + 1}
                  totalQuestions={questions.length}
                />
              )}

              {/* Answer Recorder */}
              <AnswerRecorder
                onAnswerSubmitted={handleAnswerSubmit}
                isSubmitting={isSubmitting}
              />
            </div>
          )}
        </div>
      )}

      {/* Step 3: Instant Feedback & Score Evaluation */}
      {currentFeedback && (
        <div className="space-y-6">
          <FeedbackCard feedback={currentFeedback} />

          <button
            onClick={handleNextQuestion}
            disabled={isCompleting}
            className="w-full py-4 px-6 rounded-2xl font-bold text-[#FDFBF3] bg-[#0F1E1B] hover:bg-[#1A332E] transition-all editorial-shadow flex items-center justify-center space-x-2 text-base cursor-pointer"
          >
            {isCompleting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-[#F5D90A]" />
                <span>Synthesizing Final Growth Roadmap with AI...</span>
              </>
            ) : currentIndex < questions.length - 1 ? (
              <>
                <span>Proceed to Next Question</span>
                <ArrowRight className="w-5 h-5 text-[#F5D90A]" />
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Complete Loop & View Full Report</span>
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
}
