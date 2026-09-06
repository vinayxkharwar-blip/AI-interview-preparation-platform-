import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import SessionSummary from '../components/SessionSummary';
import ImprovementPlanCard from '../components/ImprovementPlanCard';
import PostInterviewLearning from '../components/PostInterviewLearning';
import FeedbackCard from '../components/FeedbackCard';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toHundredScale } from '../utils/score';

export default function SessionDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await axiosClient.get(`/sessions/${id}`);
        setData(res.data);
      } catch (err) {
        console.error('Failed to load session details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-[#0F1E1B] font-medium">
        <Loader2 className="w-8 h-8 animate-spin text-[#C1440E] mb-2" />
      </div>
    );
  }

  if (!data || !data.session) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-4 font-sans-body">
        <h2 className="font-serif-headline text-2xl font-bold text-[#0F1E1B]">Session Not Found</h2>
        <Link to="/dashboard" className="text-[#C1440E] font-bold text-sm underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { session, questions = [], answers = [], feedback = [], improvementPlan } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
      {/* Back Button */}
      <Link
        to="/dashboard"
        className="inline-flex items-center space-x-2 text-xs font-bold text-[#0F1E1B] hover:text-[#C1440E] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </Link>

      {/* Session Summary Header */}
      <SessionSummary session={session} />

      {/* AI Improvement Plan */}
      {improvementPlan && <ImprovementPlanCard plan={improvementPlan} />}

      {/* AI Recommended Post-Interview Preparation */}
      <PostInterviewLearning
        session={session}
        improvementPlan={improvementPlan}
        feedbackList={feedback}
      />

      {/* Detailed Q&A Breakdown */}
      <div className="bg-[#FDFBF3] text-[#0F1E1B] p-6 sm:p-8 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-6">
        <h3 className="font-serif-headline text-2xl font-bold text-[#0F1E1B]">Evaluated Questions & Responses ({questions.length})</h3>

        <div className="space-y-8">
          {questions.map((q, idx) => {
            const ans = answers.find((a) => String(a.question) === String(q._id));
            const fb = feedback.find((f) => String(f.answer) === String(ans?._id));

            return (
              <div key={q._id} className="p-6 bg-[#F5F2E6] rounded-2xl border-2 border-[#0F1E1B] space-y-4 shadow-xs">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-[#C1440E] uppercase tracking-wider">
                      Question {idx + 1} • {q.category}
                    </span>
                    <h4 className="font-serif-headline text-lg font-bold text-[#0F1E1B] mt-1">"{q.questionText}"</h4>
                  </div>
                  {fb && (
                    <span className="px-3 py-1 bg-[#F5D90A] border-2 border-[#0F1E1B] text-[#0F1E1B] font-bold text-sm rounded-xl shrink-0 shadow-xs">
                      {toHundredScale(fb.score)} / 100
                    </span>
                  )}
                </div>

                {ans && (
                  <div className="p-4 bg-[#FDFBF3] rounded-xl border border-[#0F1E1B]">
                    <span className="text-[11px] font-bold text-[#0F1E1B]/70 uppercase tracking-wider block mb-1">
                      Candidate Transcript ({ans.answerType}):
                    </span>
                    <p className="text-xs text-[#0F1E1B] leading-relaxed font-medium">{ans.transcript}</p>
                  </div>
                )}

                {fb && <FeedbackCard feedback={fb} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
