import React from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Printer,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Brain,
  Code2,
  Users,
  FileText
} from 'lucide-react';

export const PlacementReportView = ({ reportData, overallScore, drive, onClose }) => {
  const report = reportData || drive?.finalReport || {};

  const getVerdictStyle = (verdict) => {
    switch (verdict) {
      case 'SELECTED':
        return 'bg-emerald-500 text-white border-emerald-700';
      case 'RECOMMENDED':
        return 'bg-blue-600 text-white border-blue-800';
      case 'NEEDS_REFINEMENT':
      case 'FAILED':
        return 'bg-rose-500 text-white border-rose-700';
      default:
        return 'bg-amber-500 text-white border-amber-700';
    }
  };

  const roundIcons = [
    <Brain className="w-5 h-5 text-purple-600" />,
    <Code2 className="w-5 h-5 text-blue-600" />,
    <Users className="w-5 h-5 text-emerald-600" />,
    <FileText className="w-5 h-5 text-[#C1440E]" />,
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-[#FDFBF3] rounded-2xl sm:rounded-3xl border-2 border-[#0F1E1B] editorial-shadow-lg p-4 sm:p-10 max-w-4xl mx-auto my-2 sm:my-6 animate-fadeIn print:shadow-none print:border-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[#0F1E1B]/15 pb-4 sm:pb-6 gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#0F1E1B] text-[#FDFBF3] px-2.5 py-0.5 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-wider">
              Official Assessment Scorecard
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-[#0F1E1B]/60">AI Placement Drive</span>
          </div>
          <h2 className="font-serif-headline text-2xl sm:text-4xl font-black text-[#0F1E1B] mt-1.5 leading-tight">
            Comprehensive 4-Round Evaluation Report
          </h2>
          <p className="text-xs sm:text-sm text-[#0F1E1B]/70 mt-1">
            Target Role: <b className="text-[#0F1E1B]">{drive?.targetRole || 'Full Stack Engineer'}</b> • Scored via Multimodal AI Rubrics
          </p>
        </div>

        <div className="flex items-center space-x-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 bg-white hover:bg-[#F5F2E6] text-[#0F1E1B] px-3.5 py-2 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-[#C1440E]" />
            <span>Print Report</span>
          </button>
          <button
            onClick={onClose}
            className="bg-[#0F1E1B] text-[#FDFBF3] px-4 py-2 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm hover:bg-[#1A332E]"
          >
            Close
          </button>
        </div>
      </div>

      {/* Main Readiness Score Banner */}
      <div className="my-8 p-6 sm:p-8 rounded-3xl bg-[#0F1E1B] text-[#FDFBF3] border-2 border-[#0F1E1B] editorial-shadow flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border ${getVerdictStyle(
                report.verdict
              )}`}
            >
              {report.verdict?.replace('_', ' ') || 'EVALUATED'}
            </span>
            <span className="text-xs font-bold text-[#FDFBF3]/70">Hiring Benchmark</span>
          </div>
          <h3 className="font-serif-headline text-2xl sm:text-3xl font-black text-[#FDFBF3]">
            {report.hiringRecommendation || 'Placement Evaluation Completed'}
          </h3>
          <p className="text-xs sm:text-sm text-[#FDFBF3]/80 max-w-xl leading-relaxed">
            {report.executiveSummary}
          </p>
        </div>

        <div className="text-center bg-[#FDFBF3] text-[#0F1E1B] p-5 rounded-2xl border-2 border-[#0F1E1B] editorial-shadow-sm shrink-0 min-w-[150px]">
          <div className="text-4xl sm:text-5xl font-black font-serif-headline text-[#C1440E]">
            {report.readinessScore || overallScore || 0}
            <span className="text-xl text-[#0F1E1B]/60 font-sans">/100</span>
          </div>
          <div className="text-[11px] font-black uppercase tracking-wider text-[#0F1E1B]/70 mt-1">
            Readiness Index
          </div>
        </div>
      </div>

      {/* 4 Rounds Scorecard Grid */}
      <div className="my-8">
        <h4 className="font-serif-headline text-xl font-black text-[#0F1E1B] mb-4 flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-[#C1440E]" />
          <span>Stage-by-Stage Performance Breakdown</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(report.roundSummary || []).map((rnd, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border-2 transition-all ${
                rnd.passed
                  ? 'bg-emerald-50/70 border-emerald-600'
                  : 'bg-rose-50/70 border-rose-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#0F1E1B]/20 flex items-center justify-center">
                  {roundIcons[idx] || <Award className="w-4 h-4 text-[#C1440E]" />}
                </div>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    rnd.passed ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                  }`}
                >
                  {rnd.passed ? 'Cleared' : 'Needs Review'}
                </span>
              </div>

              <div className="font-bold text-xs text-[#0F1E1B]/80">{rnd.roundName}</div>
              <div className="text-2xl font-black font-serif-headline text-[#0F1E1B] mt-1">
                {rnd.score || 0} <span className="text-xs font-normal text-[#0F1E1B]/60">/ 100</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#0F1E1B]/10 rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    rnd.passed ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                  style={{ width: `${Math.min(100, rnd.score || 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Growth Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
        <div className="p-6 rounded-2xl bg-emerald-50/50 border-2 border-emerald-600">
          <h4 className="font-bold text-sm text-emerald-950 flex items-center space-x-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-serif-headline text-base">Key Candidate Strengths</span>
          </h4>
          <ul className="space-y-2 text-xs sm:text-sm text-emerald-900 list-disc list-inside">
            {(report.topStrengths || []).map((s, idx) => (
              <li key={idx} className="leading-relaxed">
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 rounded-2xl bg-amber-50/50 border-2 border-amber-600">
          <h4 className="font-bold text-sm text-amber-950 flex items-center space-x-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="font-serif-headline text-base">Actionable Growth Next Steps</span>
          </h4>
          <ul className="space-y-2 text-xs sm:text-sm text-amber-900 list-disc list-inside">
            {(report.areasForImprovement || []).map((w, idx) => (
              <li key={idx} className="leading-relaxed">
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-6 border-t-2 border-[#0F1E1B]/15 flex flex-wrap items-center justify-between text-xs text-[#0F1E1B]/70 gap-2">
        <span>Verified by PrepPilot AI Evaluation Engine</span>
        <span>Generated: {new Date(report.generatedAt || Date.now()).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

export default PlacementReportView;
