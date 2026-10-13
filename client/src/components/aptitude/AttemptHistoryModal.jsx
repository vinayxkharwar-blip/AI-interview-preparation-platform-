import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Layers
} from 'lucide-react';
import { getUserPYQAttempts, getPYQTestResult } from '../../api/aptitudePYQApi';

export const AttemptHistoryModal = ({ isOpen, onClose, onViewResult }) => {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadAttempts();
    }
  }, [isOpen]);

  const loadAttempts = async () => {
    try {
      setLoading(true);
      const res = await getUserPYQAttempts();
      setAttempts(res.attempts || []);
    } catch (err) {
      console.error('Failed to load user PYQ attempts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInspectAttempt = async (attemptId) => {
    try {
      const res = await getPYQTestResult(attemptId);
      if (res.result && onViewResult) {
        onViewResult(res.result);
      }
    } catch (err) {
      alert('Failed to load attempt details.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-[#FDFBF3] rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b-2 border-[#0F1E1B]/15 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="w-10 h-10 rounded-xl bg-[#0F1E1B] text-[#F5D90A] flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-serif-headline text-2xl font-black text-[#0F1E1B]">
                Your Assessment History
              </h3>
              <p className="text-xs text-[#0F1E1B]/70">
                Track your improvement over time across company qualifiers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#0F1E1B]/70 hover:text-[#C1440E] rounded-xl hover:bg-[#F5F2E6] border border-transparent hover:border-[#0F1E1B]/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Attempt list */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-xs font-bold text-[#0F1E1B]/60">
              Loading past attempts...
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-8 text-xs font-bold text-[#0F1E1B]/60 bg-white p-6 rounded-2xl border">
              No previous test attempts found. Take your first company-specific PYQ test to start tracking performance!
            </div>
          ) : (
            attempts.map((att) => (
              <div
                key={att._id}
                className="p-4 rounded-2xl border-2 border-[#0F1E1B]/20 bg-white hover:border-[#0F1E1B] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-xs bg-[#0F1E1B] text-white px-2 py-0.5 rounded">
                      {att.company}
                    </span>
                    {att.examYear && (
                      <span className="text-[10px] font-bold bg-[#F5D90A] text-[#0F1E1B] px-1.5 py-0.5 rounded">
                        {att.examYear}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        att.passed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {att.passed ? 'Cleared' : 'Needs Review'}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-[#0F1E1B]">
                    {att.examName || `${att.company} Qualifier`} • {att.topic}
                  </div>

                  <div className="text-[10px] text-[#0F1E1B]/60 flex items-center space-x-2">
                    <span>{new Date(att.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Time: {Math.floor((att.timeSpentSeconds || 0) / 60)}m {(att.timeSpentSeconds || 0) % 60}s</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xl font-black font-serif-headline text-[#C1440E]">
                      {att.percentage}%
                    </div>
                    <div className="text-[10px] font-semibold text-[#0F1E1B]/60">
                      {att.rawScore}/{att.maxScore} marks
                    </div>
                  </div>

                  <button
                    onClick={() => handleInspectAttempt(att._id)}
                    className="bg-[#0F1E1B] hover:bg-[#1A332E] text-white text-xs font-bold px-3 py-1.5 rounded-xl"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AttemptHistoryModal;
