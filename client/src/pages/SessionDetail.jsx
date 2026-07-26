import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import SessionSummary from '../components/SessionSummary';
import ImprovementPlanCard from '../components/ImprovementPlanCard';
import FeedbackCard from '../components/FeedbackCard';
import { Loader2, ArrowLeft, HelpCircle, CheckCircle2 } from 'lucide-react';

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
      <div className="min-h-[70vh] flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
      </div>
    );
  }

  if (!data || !data.session) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Session Not Found</h2>
        <Link to="/dashboard" className="text-indigo-400 font-semibold text-sm underline">
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
        className="inline-flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </Link>

      {/* Session Summary Header */}
      <SessionSummary session={session} />

      {/* AI Improvement Plan */}
      {improvementPlan && <ImprovementPlanCard plan={improvementPlan} />}

      {/* Detailed Q&A Breakdown */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
        <h3 className="text-xl font-bold text-white">Questions & Evaluated Answers ({questions.length})</h3>

        <div className="space-y-8">
          {questions.map((q, idx) => {
            const ans = answers.find((a) => String(a.question) === String(q._id));
            const fb = feedback.find((f) => String(f.answer) === String(ans?._id));

            return (
              <div key={q._id} className="p-6 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      Question {idx + 1} • {q.category}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1">{q.questionText}</h4>
                  </div>
                  {fb && (
                    <span className="px-3 py-1 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-mono font-bold text-sm rounded-lg shrink-0">
                      {fb.score} / 10
                    </span>
                  )}
                </div>

                {ans && (
                  <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Candidate Response Transcript ({ans.answerType}):
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed">{ans.transcript}</p>
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
