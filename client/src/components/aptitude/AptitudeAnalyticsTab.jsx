import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Clock,
  Brain,
  CheckCircle2,
  XCircle,
  Building2,
  BarChart3,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { getAptitudeAnalytics, getUserPYQAttempts } from '../../api/aptitudePYQApi';

export const AptitudeAnalyticsTab = ({ onViewAttemptResult }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await getAptitudeAnalytics();
      setAnalytics(res.analytics);
    } catch (err) {
      console.warn('Failed to load aptitude analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-xs font-bold text-[#0F1E1B]/60">Calculating performance analytics...</p>
      </div>
    );
  }

  const {
    totalTests = 0,
    totalQuestionsAttempted = 0,
    averageScore = 0,
    passRate = 0,
    companyStats = {},
    categoryStats = {},
    recentAttempts = [],
  } = analytics || {};

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border-2 border-[#0F1E1B] editorial-shadow-sm">
          <div className="flex items-center justify-between text-[#0F1E1B]/60 text-xs font-bold uppercase">
            <span>Tests Attempted</span>
            <Clock className="w-4 h-4 text-[#C1440E]" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="font-serif-headline text-3xl font-black text-[#0F1E1B]">
              {totalTests}
            </span>
            <span className="text-xs text-[#0F1E1B]/60 font-semibold">Total sessions</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border-2 border-[#0F1E1B] editorial-shadow-sm">
          <div className="flex items-center justify-between text-[#0F1E1B]/60 text-xs font-bold uppercase">
            <span>Average Score</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="font-serif-headline text-3xl font-black text-[#0F1E1B]">
              {averageScore}%
            </span>
            <span className="text-xs text-[#0F1E1B]/60 font-semibold">Across all tests</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border-2 border-[#0F1E1B] editorial-shadow-sm">
          <div className="flex items-center justify-between text-[#0F1E1B]/60 text-xs font-bold uppercase">
            <span>Overall Pass Rate</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="font-serif-headline text-3xl font-black text-[#0F1E1B]">
              {passRate}%
            </span>
            <span className="text-xs text-[#0F1E1B]/60 font-semibold">Passed 60%+ cutoff</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border-2 border-[#0F1E1B] editorial-shadow-sm">
          <div className="flex items-center justify-between text-[#0F1E1B]/60 text-xs font-bold uppercase">
            <span>Questions Solved</span>
            <Brain className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="font-serif-headline text-3xl font-black text-[#0F1E1B]">
              {totalQuestionsAttempted}
            </span>
            <span className="text-xs text-[#0F1E1B]/60 font-semibold">Problems practiced</span>
          </div>
        </div>
      </div>

      {/* Category Accuracy Breakdown */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-[#0F1E1B] editorial-shadow-sm space-y-4">
        <h3 className="font-serif-headline text-xl font-black text-[#0F1E1B] flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-[#C1440E]" />
          <span>Category Accuracy & Proficiency</span>
        </h3>
        <p className="text-xs text-[#0F1E1B]/70">
          Accuracy percentage calculated from your evaluated attempts in each placement section:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {[
            { name: 'Quantitative Aptitude', color: 'emerald' },
            { name: 'Logical Reasoning', color: 'indigo' },
            { name: 'Verbal Ability', color: 'amber' },
            { name: 'Pseudocode', color: 'cyan' },
            { name: 'Programming', color: 'rose' },
          ].map((cat) => {
            const stats = categoryStats[cat.name] || { total: 0, correct: 0, accuracy: 0 };
            const hasData = stats.total > 0;

            return (
              <div
                key={cat.name}
                className="p-4 rounded-2xl bg-[#FDFBF3] border-2 border-[#0F1E1B]/15 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#0F1E1B]">{cat.name}</span>
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-full ${
                      hasData && stats.accuracy >= 65
                        ? 'bg-emerald-100 text-emerald-800'
                        : hasData
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {hasData ? `${stats.accuracy}%` : 'Not Taken'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      stats.accuracy >= 65
                        ? 'bg-emerald-500'
                        : stats.accuracy >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${stats.accuracy || 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-semibold text-[#0F1E1B]/60">
                  <span>{stats.correct} Correct</span>
                  <span>{stats.total} Attempted</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Company Track Record */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-[#0F1E1B] editorial-shadow-sm space-y-4">
        <h3 className="font-serif-headline text-xl font-black text-[#0F1E1B] flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-[#C1440E]" />
          <span>Company-Wise Track Record</span>
        </h3>

        {Object.keys(companyStats).length === 0 ? (
          <div className="text-center py-6 text-xs text-[#0F1E1B]/60">
            No company tests taken yet. Launch a quick practice or full mock test above!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(companyStats).map(([compName, stats]) => (
              <div
                key={compName}
                className="p-4 rounded-2xl bg-[#FDFBF3] border-2 border-[#0F1E1B]/15 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif-headline text-base font-black text-[#0F1E1B]">
                    {compName}
                  </span>
                  <span className="text-[11px] font-bold text-[#0F1E1B]/70">
                    {stats.attempts} Attempt{stats.attempts > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold pt-1">
                  <div className="bg-white p-2 rounded-xl border border-[#0F1E1B]/10">
                    <span className="text-[10px] text-[#0F1E1B]/60 uppercase block">Average</span>
                    <span className="text-sm font-black text-[#0F1E1B]">{stats.averageScore}%</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-[#0F1E1B]/10">
                    <span className="text-[10px] text-[#0F1E1B]/60 uppercase block">Best Score</span>
                    <span className="text-sm font-black text-emerald-700">{stats.highestScore}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Attempts List */}
      {recentAttempts.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-[#0F1E1B] editorial-shadow-sm space-y-4">
          <h3 className="font-serif-headline text-xl font-black text-[#0F1E1B]">
            Recent Assessment Attempts
          </h3>

          <div className="divide-y divide-[#0F1E1B]/10">
            {recentAttempts.map((att) => (
              <div
                key={att.id}
                className="py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center space-x-3">
                  {att.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-black text-[#0F1E1B] text-sm">{att.company}</span>
                    <p className="text-[11px] text-[#0F1E1B]/60 font-medium">
                      {att.totalQuestions} Questions •{' '}
                      {att.date ? new Date(att.date).toLocaleDateString() : 'Recent'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-black ${
                      att.passed
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-400'
                        : 'bg-rose-100 text-rose-800 border border-rose-400'
                    }`}
                  >
                    {att.score}% Score
                  </span>

                  {typeof onViewAttemptResult === 'function' && (
                    <button
                      onClick={() => onViewAttemptResult(att.id)}
                      className="bg-[#0F1E1B] hover:bg-[#1A332E] text-white px-3 py-1 rounded-xl text-xs font-bold"
                    >
                      Review Solutions
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AptitudeAnalyticsTab;

