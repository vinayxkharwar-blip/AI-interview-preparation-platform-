import React, { useState, useEffect } from 'react';
import {
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Award,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  History,
  UploadCloud,
  FileCheck2,
  HelpCircle
} from 'lucide-react';
import { getAvailableCompanies } from '../../api/aptitudePYQApi';

export const SUPPORTED_COMPANIES = [
  {
    name: 'TCS',
    examTitle: 'TCS NQT (National Qualifier Test)',
    tagline: 'Cognitive & Numerical Reasoning',
    accentColor: 'border-blue-600 bg-blue-50/50',
    logoBadge: 'bg-blue-600 text-white',
  },
  {
    name: 'Infosys',
    examTitle: 'INFYTQ & Campus Certification',
    tagline: 'Mathematical & Logical Ability',
    accentColor: 'border-indigo-600 bg-indigo-50/50',
    logoBadge: 'bg-indigo-600 text-white',
  },
  {
    name: 'Accenture',
    examTitle: 'Cognitive & Technical Assessment',
    tagline: 'Critical Thinking & Abstract Reasoning',
    accentColor: 'border-purple-600 bg-purple-50/50',
    logoBadge: 'bg-purple-600 text-white',
  },
  {
    name: 'Capgemini',
    examTitle: 'Excellence Aptitude Qualifier',
    tagline: 'Data Interpretation & Arithmetic',
    accentColor: 'border-cyan-600 bg-cyan-50/50',
    logoBadge: 'bg-cyan-600 text-white',
  },
  {
    name: 'Cognizant',
    examTitle: 'GenC Quantitative Qualifier',
    tagline: 'Analytical & Quantitative Models',
    accentColor: 'border-emerald-600 bg-emerald-50/50',
    logoBadge: 'bg-emerald-600 text-white',
  },
  {
    name: 'Wipro',
    examTitle: 'Elite National Talent Hunt (NTH)',
    tagline: 'Quantitative & Verbal Reasoning',
    accentColor: 'border-amber-600 bg-amber-50/50',
    logoBadge: 'bg-amber-600 text-white',
  },
];

export const CompanySelector = ({
  user,
  onStartTest,
  onOpenHistory,
  onOpenAdminStudio,
  actionLoading,
  refreshTrigger,
}) => {
  const [availableCompaniesData, setAvailableCompaniesData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Configuration selections
  const [selectedCompany, setSelectedCompany] = useState('TCS');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('All Topics');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All Difficulties');
  const [testMode, setTestMode] = useState('full_mock'); // 'full_mock' | 'topic_practice'
  const [questionCount, setQuestionCount] = useState(10);
  const [negativeMarking, setNegativeMarking] = useState(0.25);

  useEffect(() => {
    loadCompanyMetadata();
  }, [refreshTrigger]);

  const loadCompanyMetadata = async () => {
    try {
      setLoading(true);
      const res = await getAvailableCompanies();
      setAvailableCompaniesData(res.companies || []);
    } catch (err) {
      console.warn('[CompanySelector] Failed to load company metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  // Merge static presets with any new companies found in MongoDB
  const combinedCompanies = [...SUPPORTED_COMPANIES];
  availableCompaniesData.forEach((dbComp) => {
    if (!combinedCompanies.some((c) => c.name.toLowerCase() === dbComp.company.toLowerCase())) {
      combinedCompanies.push({
        name: dbComp.company,
        examTitle: `${dbComp.company} Placement Assessment`,
        tagline: 'Authentic Campus Recruitment PYQs',
        accentColor: 'border-slate-600 bg-slate-50/50',
        logoBadge: 'bg-slate-700 text-white',
      });
    }
  });

  // Find active verified data for the selected company
  const activeCompanyVerifiedData = availableCompaniesData.find(
    (c) => c.company.toLowerCase() === selectedCompany.toLowerCase()
  );

  const availableYears = activeCompanyVerifiedData?.examYears || [];
  const hasVerifiedData = (activeCompanyVerifiedData?.totalQuestions || 0) > 0;

  const handleLaunch = () => {
    onStartTest({
      company: selectedCompany,
      examYear: selectedYear === 'all' ? null : Number(selectedYear),
      topic: selectedTopic,
      difficulty: selectedDifficulty === 'All Difficulties' ? 'Medium' : selectedDifficulty,
      testMode,
      questionCount,
      negativeMarking,
      timeLimitMinutes: questionCount <= 10 ? 15 : 25,
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner & Control Bar */}
      <div className="bg-[#FDFBF3] p-6 sm:p-8 rounded-3xl border-2 border-[#0F1E1B] editorial-shadow flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#F5D90A] text-[#0F1E1B] px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
              Verified PYQ Engine
            </span>
            <span className="text-xs font-bold text-[#0F1E1B]/60">Previous Year Placement Papers</span>
          </div>
          <h2 className="font-serif-headline text-2xl sm:text-3xl font-black text-[#0F1E1B] mt-1">
            Company-Wise Aptitude Practice Arena
          </h2>
          <p className="text-xs sm:text-sm text-[#0F1E1B]/70 max-w-xl mt-1">
            Practice authenticated previous-year aptitude papers with company-specific marking schemes, negative marking, and verified step-by-step solutions.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={onOpenHistory}
            className="flex items-center space-x-1.5 bg-white hover:bg-[#F5F2E6] text-[#0F1E1B] px-3.5 py-2.5 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm transition-all"
          >
            <History className="w-3.5 h-3.5 text-[#C1440E]" />
            <span>Attempt History</span>
          </button>

          {/* Admin Studio trigger */}
          <button
            onClick={onOpenAdminStudio}
            className="flex items-center space-x-1.5 bg-[#0F1E1B] hover:bg-[#1A332E] text-[#FDFBF3] px-3.5 py-2.5 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm transition-all"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#F5D90A]" />
            <span>Admin PYQ Studio</span>
          </button>
        </div>
      </div>

      {/* 1. SELECT TARGET COMPANY */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-black uppercase tracking-wider text-[#0F1E1B] flex items-center space-x-1.5">
            <Building2 className="w-4 h-4 text-[#C1440E]" />
            <span>1. Select Campus Recruitment Company</span>
          </label>
          <span className="text-xs font-bold text-[#0F1E1B]/60">
            {availableCompaniesData.length} Companies with Verified PYQs
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {combinedCompanies.map((comp) => {
            const isSelected = selectedCompany.toLowerCase() === comp.name.toLowerCase();
            const verifiedRecord = availableCompaniesData.find(
              (c) => c.company.toLowerCase() === comp.name.toLowerCase()
            );
            const verifiedCount = verifiedRecord?.totalQuestions || 0;
            const years = verifiedRecord?.examYears || [];

            return (
              <button
                key={comp.name}
                onClick={() => {
                  setSelectedCompany(comp.name);
                  setSelectedYear('all');
                }}
                className={`p-5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#0F1E1B] bg-white editorial-shadow scale-[1.02]'
                    : 'border-[#0F1E1B]/20 bg-[#FDFBF3] hover:border-[#0F1E1B] hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                        comp.logoBadge
                      }`}
                    >
                      {comp.name.substring(0, 3)}
                    </span>
                    {verifiedCount > 0 ? (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{verifiedCount} Verified PYQs</span>
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                        Pending Import
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif-headline text-lg font-black text-[#0F1E1B]">{comp.name}</h3>
                  <p className="text-xs font-bold text-[#C1440E] mt-0.5">{comp.examTitle}</p>
                  <p className="text-[11px] text-[#0F1E1B]/60 mt-1">{comp.tagline}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#0F1E1B]/10 flex items-center justify-between text-[11px] font-bold text-[#0F1E1B]/70">
                  <span>Available Years:</span>
                  <span className="text-[#0F1E1B]">
                    {years.length > 0 ? years.join(', ') : 'None yet'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CONFIGURE TEST PARAMETERS */}
      <div className="bg-[#FDFBF3] p-6 sm:p-8 rounded-3xl border-2 border-[#0F1E1B] editorial-shadow space-y-6">
        <div className="flex items-center space-x-2 border-b-2 border-[#0F1E1B]/15 pb-3">
          <SlidersHorizontal className="w-4 h-4 text-[#C1440E]" />
          <h3 className="font-serif-headline text-xl font-black text-[#0F1E1B]">
            2. Configure Assessment Parameters for {selectedCompany}
          </h3>
        </div>

        {/* Empty State Guard if company has no verified questions */}
        {!hasVerifiedData ? (
          <div className="p-6 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-950 space-y-3">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-5 h-5 text-amber-700" />
              <h4 className="font-serif-headline text-lg font-black">
                No Verified PYQs Currently Available for {selectedCompany}
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
              In accordance with our strict data authenticity policy, questions are only presented after verified previous-year papers have been authorized and imported into MongoDB. Mock or hardcoded placeholders are never substituted.
            </p>
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={onOpenAdminStudio}
                className="bg-[#0F1E1B] text-[#FDFBF3] px-4 py-2 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] hover:bg-[#1A332E]"
              >
                Open Admin Import to Upload {selectedCompany} PYQs
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Exam Year Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F1E1B]/70 uppercase">
                Exam Year (Verified)
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-[#0F1E1B] bg-white text-xs font-bold text-[#0F1E1B] focus:outline-hidden"
              >
                <option value="all">All Verified Years ({availableYears.join(', ')})</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr} Examination Paper
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F1E1B]/70 uppercase">Topic Focus</label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-[#0F1E1B] bg-white text-xs font-bold text-[#0F1E1B] focus:outline-hidden"
              >
                <option value="All Topics">All Topics (Full Comprehensive)</option>
                <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                <option value="Logical Reasoning">Logical Reasoning</option>
                <option value="Verbal Ability">Verbal Ability</option>
              </select>
            </div>

            {/* Difficulty Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F1E1B]/70 uppercase">Difficulty</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-[#0F1E1B] bg-white text-xs font-bold text-[#0F1E1B] focus:outline-hidden"
              >
                <option value="All Difficulties">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium (Standard Qualifier)</option>
                <option value="Hard">Hard (Advanced Section)</option>
              </select>
            </div>

            {/* Test Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F1E1B]/70 uppercase">Test Mode</label>
              <select
                value={testMode}
                onChange={(e) => setTestMode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-[#0F1E1B] bg-white text-xs font-bold text-[#0F1E1B] focus:outline-hidden"
              >
                <option value="full_mock">Full Mock Test (Timed Simulation)</option>
                <option value="topic_practice">Topic Practice (Targeted Drills)</option>
              </select>
            </div>
          </div>
        )}

        {/* Negative marking & Question count bar */}
        {hasVerifiedData && (
          <div className="pt-4 border-t border-[#0F1E1B]/15 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
              {/* Question Count */}
              <div className="flex items-center space-x-2">
                <span className="text-[#0F1E1B]/70">Question Count:</span>
                {[5, 10, 15].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setQuestionCount(cnt)}
                    className={`px-3 py-1 rounded-lg border-2 transition-all ${
                      questionCount === cnt
                        ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B]'
                        : 'bg-white text-[#0F1E1B] border-[#0F1E1B]/20 hover:border-[#0F1E1B]'
                    }`}
                  >
                    {cnt} Qs
                  </button>
                ))}
              </div>

              {/* Negative Marking */}
              <div className="flex items-center space-x-2 pl-4 border-l border-[#0F1E1B]/20">
                <span className="text-[#0F1E1B]/70">Negative Marking:</span>
                <button
                  onClick={() => setNegativeMarking(negativeMarking === 0.25 ? 0 : 0.25)}
                  className={`px-3 py-1 rounded-lg border-2 transition-all ${
                    negativeMarking > 0
                      ? 'bg-rose-600 text-white border-rose-800'
                      : 'bg-white text-[#0F1E1B] border-[#0F1E1B]/20'
                  }`}
                >
                  {negativeMarking > 0 ? '-0.25 Marks per Wrong Answer' : 'No Negative Marking'}
                </button>
              </div>
            </div>

            {/* Launch CTA */}
            <button
              onClick={handleLaunch}
              disabled={actionLoading || !hasVerifiedData}
              className="bg-[#C1440E] hover:bg-[#A3370B] text-white px-6 py-3 rounded-2xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm flex items-center space-x-2 transition-transform hover:scale-105 disabled:opacity-40"
            >
              <span>{actionLoading ? 'Loading Questions...' : `Launch ${selectedCompany} Aptitude Test`}</span>
              <ArrowRight className="w-4 h-4 text-[#F5D90A]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanySelector;
