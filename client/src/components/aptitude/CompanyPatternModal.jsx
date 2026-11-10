import React from 'react';
import {
  X,
  ShieldCheck,
  Sparkles,
  Clock,
  Award,
  AlertCircle,
  Layers,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Building2
} from 'lucide-react';

export const CompanyPatternModal = ({
  isOpen,
  onClose,
  company,
  onStartPractice,
  onStartFullMock,
}) => {
  if (!isOpen || !company) return null;

  const isVerified = company.isVerifiedPattern !== false;
  const sections = company.sections || [
    { name: 'Quantitative Aptitude', category: 'Quantitative Aptitude', questions: 7, duration: 20 },
    { name: 'Logical Reasoning', category: 'Logical Reasoning', questions: 7, duration: 20 },
    { name: 'Verbal Ability', category: 'Verbal Ability', questions: 6, duration: 20 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0F1E1B]/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FDFBF3] w-full max-w-3xl rounded-3xl border-2 border-[#0F1E1B] editorial-shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 sm:p-8 border-b-2 border-[#0F1E1B]/15 flex items-start justify-between gap-4 bg-white">
          <div className="flex items-start space-x-3.5">
            <span
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${
                company.logoBadge || 'bg-[#0F1E1B] text-white'
              }`}
            >
              {company.company?.substring(0, 3) || 'COM'}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-serif-headline text-2xl font-black text-[#0F1E1B]">
                  {company.company}
                </h3>
                {isVerified ? (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Verified Official Pattern</span>
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Practice Simulation</span>
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-[#C1440E] mt-0.5">
                {company.examTitle || `${company.company} Campus Qualifier`}
              </p>
              <p className="text-[11px] text-[#0F1E1B]/60 mt-0.5">{company.tagline}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#0F1E1B]/60 hover:text-[#0F1E1B] hover:bg-[#F5F2E6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
          {/* Company Introduction */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#0F1E1B] mb-2 flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#C1440E]" />
              <span>Assessment Overview & Hiring Focus</span>
            </h4>
            <p className="text-xs sm:text-sm text-[#0F1E1B]/80 leading-relaxed bg-white p-4 rounded-2xl border border-[#0F1E1B]/15">
              {company.intro ||
                `${company.company} conducts standardized screening assessments to evaluate candidate numerical aptitude, logical deduction, English verbal proficiency, and algorithmic thinking.`}
            </p>
          </div>

          {/* Key Assessment Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-[#0F1E1B]/15 text-center">
              <span className="text-[10px] font-bold uppercase text-[#0F1E1B]/60 block">Expected Time</span>
              <span className="text-sm font-black text-[#0F1E1B] mt-0.5 flex items-center justify-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-[#C1440E]" />
                <span>{company.expectedDurationMinutes || 60} Mins</span>
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#0F1E1B]/15 text-center">
              <span className="text-[10px] font-bold uppercase text-[#0F1E1B]/60 block">Full Mock Size</span>
              <span className="text-sm font-black text-[#0F1E1B] mt-0.5">
                {company.fullMockQuestionCount || 20} Questions
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#0F1E1B]/15 text-center">
              <span className="text-[10px] font-bold uppercase text-[#0F1E1B]/60 block">Cutoff Target</span>
              <span className="text-sm font-black text-[#0F1E1B] mt-0.5 flex items-center justify-center space-x-1">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>{company.passCutoffPercentage || 60}% Benchmark</span>
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#0F1E1B]/15 text-center">
              <span className="text-[10px] font-bold uppercase text-[#0F1E1B]/60 block">Negative Marking</span>
              <span className="text-xs font-black text-[#0F1E1B] mt-1">
                {company.negativeMarking > 0 ? `-${company.negativeMarking} per error` : 'No Negative Marks'}
              </span>
            </div>
          </div>

          {/* Section-by-Section Examination Pattern */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#0F1E1B] mb-2.5 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-[#C1440E]" />
              <span>Section Breakdown & Weightage</span>
            </h4>
            <div className="overflow-x-auto border border-[#0F1E1B]/15 rounded-2xl bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F2E6] border-b border-[#0F1E1B]/15 text-[#0F1E1B] font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3.5">Section Name</th>
                    <th className="py-2.5 px-3.5">Tested Category</th>
                    <th className="py-2.5 px-3.5 text-center">Mock Qs</th>
                    <th className="py-2.5 px-3.5 text-center">Section Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0F1E1B]/10">
                  {sections.map((sec, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3.5 font-bold text-[#0F1E1B]">{sec.name}</td>
                      <td className="py-2.5 px-3.5 text-[#0F1E1B]/70">
                        <span className="bg-[#FDFBF3] px-2 py-0.5 rounded border border-[#0F1E1B]/10 text-[11px] font-medium">
                          {sec.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-bold text-[#0F1E1B]">
                        {sec.questions} Qs
                      </td>
                      <td className="py-2.5 px-3.5 text-center text-[#0F1E1B]/80 font-mono">
                        {sec.duration} mins
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Difficulty Distribution */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#0F1E1B] mb-2 flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#C1440E]" />
              <span>Difficulty Distribution</span>
            </h4>
            <div className="flex items-center space-x-2 text-xs font-bold text-[#0F1E1B]">
              <div className="flex-1 bg-white p-2.5 rounded-xl border border-emerald-300 text-center text-emerald-800">
                Easy: {company.difficultyDistribution?.Easy || '30%'}
              </div>
              <div className="flex-1 bg-white p-2.5 rounded-xl border border-amber-300 text-center text-amber-800">
                Medium: {company.difficultyDistribution?.Medium || '50%'}
              </div>
              <div className="flex-1 bg-white p-2.5 rounded-xl border border-rose-300 text-center text-rose-800">
                Hard: {company.difficultyDistribution?.Hard || '20%'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 bg-[#F5F2E6] border-t-2 border-[#0F1E1B]/15 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-[#0F1E1B]/70 font-semibold">
            {company.totalQuestions || 15} verified questions ready for {company.company}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                onClose();
                onStartPractice(company.company);
              }}
              className="bg-white hover:bg-neutral-100 text-[#0F1E1B] px-4 py-2 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] transition-transform hover:scale-102"
            >
              Start Quick Practice (10 Qs)
            </button>

            <button
              onClick={() => {
                onClose();
                onStartFullMock(company.company);
              }}
              className="bg-[#C1440E] hover:bg-[#A3370B] text-white px-5 py-2 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm flex items-center space-x-1.5 transition-transform hover:scale-102"
            >
              <span>Start Full Mock Exam (20 Qs)</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#F5D90A]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyPatternModal;

