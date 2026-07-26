import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import QuestionCard from '../components/QuestionCard';
import AnswerRecorder from '../components/AnswerRecorder';
import FeedbackCard from '../components/FeedbackCard';
import SessionSummary from '../components/SessionSummary';
import ImprovementPlanCard from '../components/ImprovementPlanCard';
import { Loader2, ArrowRight, CheckCircle2, RotateCcw, AlertCircle } from 'lucide-react';

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

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const res = await axiosClient.get(`/sessions/${sessionId}`);
        const { session: sessDoc, questions: qList, answers: aList, feedback: fList, improvementPlan: planDoc } = res.data;

        setSession(sessDoc);
        setQuestions(qList || []);

        // Map past submitted answers & feedback by question ID
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
        console.error('Failed to load session details:', err);
        setError('Failed to load interview session details.');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  const currentQuestion = questions[currentIndex];
  const currentFeedback = currentQuestion ? feedbackMap[currentQuestion._id] : null;

  const handleAnswerSubmit = async ({ transcript, answerType, audioUrl }) => {
    if (!currentQuestion) return;
    setIsSubmitting(true);
    setError('');

    try {
      const res = await axiosClient.post('/answers/submit', {
        sessionId,
        questionId: currentQuestion._id,
        transcript,
        answerType,
        audioUrl,
      });

      const { answer, feedback } = res.data;

      setAnswersMap((prev) => ({ ...prev, [currentQuestion._id]: answer }));
      setFeedbackMap((prev) => ({ ...prev, [currentQuestion._id]: feedback }));

      setIsSubmitting(false);
    } catch (err) {
      console.error('Submit answer error:', err);
      setError(err.response?.data?.message || 'Failed to analyze candidate answer.');
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Last question answered! Complete session & synthesize AI Improvement Plan
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium">Preparing interview session environment...</p>
      </div>
    );
  }

  if (sessionCompleted) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
        <SessionSummary
          session={session}
          overallScore={summaryData?.overallScore}
          categoryBreakdown={summaryData?.categoryBreakdown}
          onStartNew={() => navigate('/new-session')}
        />
        {improvementPlan && <ImprovementPlanCard plan={improvementPlan} />}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
      
      {/* Progress Top Bar */}
      <div className="flex items-center justify-between bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Target Role: <span className="text-indigo-400 font-semibold">{session?.targetRole}</span>
          </span>
          <span className="text-slate-700">•</span>
          <span className="text-xs font-medium text-slate-400 capitalize">
            Type: <span className="text-purple-400 font-semibold">{session?.interviewType}</span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center space-x-3">
          <div className="w-32 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
          <span className="text-xs font-bold font-mono text-slate-300">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Question Card */}
      {currentQuestion && (
        <QuestionCard
          question={currentQuestion}
          currentNumber={currentIndex + 1}
          totalQuestions={questions.length}
        />
      )}

      {/* Step 2: Answer Recorder & Transcription Confirmation */}
      {!currentFeedback && (
        <AnswerRecorder
          onAnswerSubmitted={handleAnswerSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Step 3: Instant Feedback & Score Evaluation */}
      {currentFeedback && (
        <div className="space-y-6">
          <FeedbackCard feedback={currentFeedback} />

          <button
            onClick={handleNextQuestion}
            disabled={isCompleting}
            className="w-full py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 text-base"
          >
            {isCompleting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Synthesizing Final Improvement Plan with AI...</span>
              </>
            ) : currentIndex < questions.length - 1 ? (
              <>
                <span>Proceed to Next Question</span>
                <ArrowRight className="w-5 h-5" />
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Complete Session & Generate Improvement Plan</span>
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
}
