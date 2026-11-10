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
  HelpCircle,
  Play,
  BarChart3,
  BookOpen,
  PlusCircle,
  Info
} from 'lucide-react';
import { getAvailableCompanies } from '../../api/aptitudePYQApi';
import CompanyPatternModal from './CompanyPatternModal';
import CustomCompanyModal from './CustomCompanyModal';
import TopicPracticeTab from './TopicPracticeTab';
import AptitudeAnalyticsTab from './AptitudeAnalyticsTab';

export const CompanySelector = ({
  user,
  onStartTest,
  onOpenHistory,
  onOpenAdminStudio,
  actionLoading,
  refreshTrigger,
}) => {
  // Navigation tabs: 'company_prep', 'topic_practice', 'analytics'
  const [activeTab, setActiveTab] = useState('company_prep');

  const [availableCompaniesData, setAvailableCompaniesData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected company and modals
  const [patternModalCompany, setPatternModalCompany] = useState(null);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [showCustomCompanyModal, setShowCustomCompanyModal] = useState(false);

  // Quick setup drawer for custom parameters on a selected company
  const [drawerCompany, setDrawerCompany] = useState(null);
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('All Topics');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All Difficulties');
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

  const handleOpenPattern = (comp) => {
    setPatternModalCompany(comp);
    setShowPatternModal(true);
  };

  const handleStartQuickPractice = (comp) => {
    const compName = typeof comp === 'string' ? comp : comp.company;
    const targetCompData = availableCompaniesData.find(
      (c) => c.company.toLowerCase() === compName.toLowerCase()
    );

    onStartTest({
      company: compName,
      examYear: null,
      topic: 'All Topics',
      subtopic: 'All Subtopics',
      difficulty: 'Medium',
      testMode: 'topic_practice',
      questionCount: 10,
      negativeMarking: targetCompData?.negativeMarking ?? 0.25,
      timeLimitMinutes: 15,
    });
  };

  const handleStartFullMock = (comp) => {
    const compName = typeof comp === 'string' ? comp : comp.company;
    const targetCompData = availableCompaniesData.find(
      (c) => c.company.toLowerCase() === compName.toLowerCase()
    );

    onStartTest({
      company: compName,
      examYear: 2024,
      topic: 'All Topics',
      subtopic: 'All Subtopics',
      difficulty: 'Medium',
      testMode: 'full_mock',
      questionCount: targetCompData?.fullMockQuestionCount || 20,
      negativeMarking: targetCompData?.negativeMarking ?? 0.25,
      timeLimitMinutes: targetCompData?.expectedDurationMinutes || 25,
    });
  };

  const handleLaunchCustomConfigured = () => {
    if (!drawerCompany) return;
    onStartTest({
      company: drawerCompany.company,
      examYear: selectedYear === 'all' ? null : Number(selectedYear),
      topic: selectedTopic,
      subtopic: 'All Subtopics',
      difficulty: selectedDifficulty === 'All Difficulties' ? 'Medium' : selectedDifficulty,
      testMode: 'topic_practice',
      questionCount,
      negativeMarking,
      timeLimitMinutes: questionCount <= 10 ? 15 : 25,
    });
    setDrawerCompany(null);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner & Control Bar */}
      <div className="bg-[#FDFBF3] p-6 sm:p-8 rounded-3xl border-2 border-[#0F1E1B] editorial-shadow flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#F5D90A] text-[#0F1E1B] px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
              Recruitment Assessment Engine
            </span>
            <span className="text-xs font-bold text-[#0F1E1B]/60">
              Campus Placement Aptitude Arena
            </span>
          </div>
          <h2 className="font-serif-headline text-2xl sm:text-3xl font-black text-[#0F1E1B] mt-1">
            Company-Wise Aptitude Assessment Module
          </h2>
          <p className="text-xs sm:text-sm text-[#0F1E1B]/70 max-w-2xl mt-1 leading-relaxed">
            Practice authenticated previous-year aptitude papers and realistic simulations modeled after official hiring patterns of TCS, Infosys, Accenture, Wipro, Capgemini, Cognizant, HCLTech, Tech Mahindra, and Deloitte.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
              activeTab === 'analytics'
                ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B]'
                : 'bg-white hover:bg-[#F5F2E6] text-[#0F1E1B] border-[#0F1E1B] editorial-shadow-sm'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Analytics</span>
          </button>

          <button
            onClick={onOpenHistory}
            className="flex items-center space-x-1.5 bg-white hover:bg-[#F5F2E6] text-[#0F1E1B] px-3.5 py-2.5 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm transition-all"
          >
            <History className="w-3.5 h-3.5 text-[#C1440E]" />
            <span>Attempt History</span>
          </button>

          {(user?.role === 'admin' || user?.email?.includes('admin')) && (
            <button
              onClick={onOpenAdminStudio}
              className="flex items-center space-x-1.5 bg-[#0F1E1B] hover:bg-[#1A332E] text-[#FDFBF3] px-3.5 py-2.5 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm transition-all"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#F5D90A]" />
              <span>Admin Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs Header */}
      <div className="flex border-b-2 border-[#0F1E1B]/20">
        <button
          onClick={() => setActiveTab('company_prep')}
          className={`flex items-center space-x-2 py-3 px-6 text-xs sm:text-sm font-black border-b-4 -mb-[3px] transition-all ${
            activeTab === 'company_prep'
              ? 'border-[#C1440E] text-[#0F1E1B] bg-white rounded-t-xl'
              : 'border-transparent text-[#0F1E1B]/60 hover:text-[#0F1E1B]'
          }`}
        >
          <Building2 className="w-4 h-4 text-[#C1440E]" />
          <span>1. Company-Wise Preparation</span>
          <span className="bg-[#F5D90A] text-[#0F1E1B] text-[10px] font-black px-2 py-0.5 rounded-full ml-1.5">
            9 Companies + Custom
          </span>
        </button>

        <button
          onClick={() => setActiveTab('topic_practice')}
          className={`flex items-center space-x-2 py-3 px-6 text-xs sm:text-sm font-black border-b-4 -mb-[3px] transition-all ${
            activeTab === 'topic_practice'
              ? 'border-[#C1440E] text-[#0F1E1B] bg-white rounded-t-xl'
              : 'border-transparent text-[#0F1E1B]/60 hover:text-[#0F1E1B]'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>2. Topic-Wise Practice</span>
          <span className="bg-[#F5F2E6] text-[#0F1E1B] text-[10px] font-black px-2 py-0.5 rounded-full border border-[#0F1E1B]/20 ml-1.5">
            72 Subtopics
          </span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center space-x-2 py-3 px-6 text-xs sm:text-sm font-black border-b-4 -mb-[3px] transition-all ${
            activeTab === 'analytics'
              ? 'border-[#C1440E] text-[#0F1E1B] bg-white rounded-t-xl'
              : 'border-transparent text-[#0F1E1B]/60 hover:text-[#0F1E1B]'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <span>3. Performance Analytics</span>
        </button>
      </div>

      {/* TAB 1: COMPANY-WISE PREPARATION */}
      {activeTab === 'company_prep' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif-headline text-lg font-black text-[#0F1E1B]">
                Target Campus Hiring Assessments
              </h3>
              <p className="text-xs text-[#0F1E1B]/60">
                Choose a company to view verified exam patterns, practice quick drills, or launch a full timed mock test.
              </p>
            </div>
            <button
              onClick={() => setShowCustomCompanyModal(true)}
              className="flex items-center space-x-1.5 bg-[#0F1E1B] hover:bg-[#1A332E] text-[#FDFBF3] px-3.5 py-2 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm transition-transform hover:scale-102"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#F5D90A]" />
              <span>Configure Other Company</span>
            </button>
          </div>

          {/* 9 Supported Companies Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {availableCompaniesData.map((comp) => {
              const isVerified = comp.isVerifiedPattern !== false;

              return (
                <div
                  key={comp.company}
                  className="bg-white rounded-2xl border-2 border-[#0F1E1B] editorial-shadow p-5 flex flex-col justify-between hover:border-[#C1440E] transition-all group"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                          comp.logoBadge || 'bg-[#0F1E1B] text-white'
                        }`}
                      >
                        {comp.company.substring(0, 3)}
                      </span>

                      {isVerified ? (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Verified Pattern</span>
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>Practice Simulation</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-serif-headline text-xl font-black text-[#0F1E1B] group-hover:text-[#C1440E] transition-colors">
                      {comp.company}
                    </h4>
                    <p className="text-xs font-bold text-[#C1440E] mt-0.5 line-clamp-1">
                      {comp.examTitle}
                    </p>
                    <p className="text-[11px] text-[#0F1E1B]/60 mt-1 line-clamp-2">
                      {comp.intro || comp.tagline}
                    </p>

                    {/* Metadata Badges Bar */}
                    <div className="mt-3.5 pt-3 border-t border-[#0F1E1B]/10 grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                      <div className="bg-[#FDFBF3] p-1.5 rounded-lg border border-[#0F1E1B]/10">
                        <span className="text-[#0F1E1B]/60 block uppercase">Duration</span>
                        <span className="text-xs font-black text-[#0F1E1B]">
                          {comp.expectedDurationMinutes}m
                        </span>
                      </div>
                      <div className="bg-[#FDFBF3] p-1.5 rounded-lg border border-[#0F1E1B]/10">
                        <span className="text-[#0F1E1B]/60 block uppercase">Cutoff</span>
                        <span className="text-xs font-black text-[#0F1E1B]">
                          {comp.passCutoffPercentage}%
                        </span>
                      </div>
                      <div className="bg-[#FDFBF3] p-1.5 rounded-lg border border-[#0F1E1B]/10">
                        <span className="text-[#0F1E1B]/60 block uppercase">Questions</span>
                        <span className="text-xs font-black text-emerald-700">
                          {comp.totalQuestions || 15} Qs
                        </span>
                      </div>
                    </div>

                    {/* Difficulty Distribution Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#0F1E1B]/60 mb-1">
                        <span>Difficulty Mix:</span>
                        <span>
                          E: {comp.difficultyDistribution?.Easy || '30%'} | M:{' '}
                          {comp.difficultyDistribution?.Medium || '50%'} | H:{' '}
                          {comp.difficultyDistribution?.Hard || '20%'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-200 rounded-full flex overflow-hidden">
                        <div className="bg-emerald-400 h-full w-[30%]" />
                        <div className="bg-amber-400 h-full w-[50%]" />
                        <div className="bg-rose-400 h-full w-[20%]" />
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="mt-5 pt-3 border-t border-[#0F1E1B]/15 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleStartQuickPractice(comp)}
                        disabled={actionLoading}
                        className="w-full bg-white hover:bg-[#F5F2E6] text-[#0F1E1B] py-2 px-2.5 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] transition-transform hover:scale-102 flex items-center justify-center space-x-1"
                      >
                        <Play className="w-3 h-3 fill-current text-[#C1440E]" />
                        <span>Practice (10 Qs)</span>
                      </button>

                      <button
                        onClick={() => handleStartFullMock(comp)}
                        disabled={actionLoading}
                        className="w-full bg-[#0F1E1B] hover:bg-[#1A332E] text-white py-2 px-2.5 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] transition-transform hover:scale-102 flex items-center justify-center space-x-1"
                      >
                        <Award className="w-3 h-3 text-[#F5D90A]" />
                        <span>Full Mock ({comp.fullMockQuestionCount || 20} Qs)</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] font-bold">
                      <button
                        onClick={() => handleOpenPattern(comp)}
                        className="text-[#C1440E] hover:underline flex items-center space-x-1"
                      >
                        <Info className="w-3 h-3" />
                        <span>View Exam Pattern & Syllabus</span>
                      </button>

                      <button
                        onClick={() => setDrawerCompany(comp)}
                        className="text-[#0F1E1B]/60 hover:text-[#0F1E1B] hover:underline flex items-center space-x-1"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Custom Setup</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 10th Card: Configure Custom Company */}
            <div className="bg-[#FDFBF3] rounded-2xl border-2 border-dashed border-[#0F1E1B]/30 p-6 flex flex-col justify-between hover:border-[#0F1E1B] transition-all text-center">
              <div>
                <span className="w-12 h-12 mx-auto rounded-2xl bg-white border border-[#0F1E1B]/20 flex items-center justify-center shadow-xs text-[#0F1E1B] mb-3">
                  <PlusCircle className="w-6 h-6 text-[#C1440E]" />
                </span>
                <h4 className="font-serif-headline text-lg font-black text-[#0F1E1B]">
                  10. Other Tech Companies
                </h4>
                <p className="text-xs font-bold text-[#C1440E] mt-0.5">
                  Configurable Question-Bank Management
                </p>
                <p className="text-[11px] text-[#0F1E1B]/60 mt-1 leading-relaxed">
                  Targeting Amazon, Cisco, Oracle, or Mindtree? Configure a custom simulated placement test with tailored timers, questions, and section weightages.
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-[#0F1E1B]/15">
                <button
                  onClick={() => setShowCustomCompanyModal(true)}
                  className="w-full bg-[#0F1E1B] hover:bg-[#1A332E] text-[#FDFBF3] py-2.5 px-4 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm flex items-center justify-center space-x-1.5 transition-transform hover:scale-102"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F5D90A]" />
                  <span>Configure Custom Assessment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TOPIC-WISE PRACTICE */}
      {activeTab === 'topic_practice' && (
        <TopicPracticeTab onStartDrill={onStartTest} actionLoading={actionLoading} />
      )}

      {/* TAB 3: PERFORMANCE ANALYTICS */}
      {activeTab === 'analytics' && (
        <AptitudeAnalyticsTab onViewAttemptResult={onOpenHistory} />
      )}

      {/* CUSTOM SETUP MODAL / DRAWER */}
      {drawerCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1E1B]/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#FDFBF3] w-full max-w-md rounded-3xl border-2 border-[#0F1E1B] editorial-shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#0F1E1B]/15 pb-3">
              <h3 className="font-serif-headline text-lg font-black text-[#0F1E1B]">
                Configure Test for {drawerCompany.company}
              </h3>
              <button
                onClick={() => setDrawerCompany(null)}
                className="text-xs font-black text-[#0F1E1B]/60 hover:text-[#0F1E1B]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-bold">
              <div>
                <label className="text-[#0F1E1B]/70 uppercase block mb-1">Target Category</label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#0F1E1B] bg-white font-bold"
                >
                  <option value="All Topics">All Comprehensive Topics</option>
                  <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                  <option value="Logical Reasoning">Logical Reasoning</option>
                  <option value="Verbal Ability">Verbal Ability</option>
                  <option value="Pseudocode">Pseudocode</option>
                  <option value="Programming">Programming</option>
                </select>
              </div>

              <div>
                <label className="text-[#0F1E1B]/70 uppercase block mb-1">Difficulty Level</label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#0F1E1B] bg-white font-bold"
                >
                  <option value="All Difficulties">All Levels</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#0F1E1B]/70 uppercase block mb-1">Questions</label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#0F1E1B] bg-white font-bold"
                  >
                    <option value={5}>5 Qs</option>
                    <option value={10}>10 Qs</option>
                    <option value={15}>15 Qs</option>
                    <option value={20}>20 Qs</option>
                  </select>
                </div>

                <div>
                  <label className="text-[#0F1E1B]/70 uppercase block mb-1">Negative Mark</label>
                  <select
                    value={negativeMarking}
                    onChange={(e) => setNegativeMarking(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#0F1E1B] bg-white font-bold"
                  >
                    <option value={0}>0 (None)</option>
                    <option value={0.25}>-0.25</option>
                    <option value={0.33}>-0.33</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#0F1E1B]/15 flex items-center justify-end space-x-2">
              <button
                onClick={() => setDrawerCompany(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#0F1E1B]/70 hover:bg-[#F5F2E6]"
              >
                Cancel
              </button>
              <button
                onClick={handleLaunchCustomConfigured}
                disabled={actionLoading}
                className="bg-[#C1440E] text-white px-4 py-2 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm"
              >
                Launch Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CompanyPatternModal
        isOpen={showPatternModal}
        onClose={() => setShowPatternModal(false)}
        company={patternModalCompany}
        onStartPractice={handleStartQuickPractice}
        onStartFullMock={handleStartFullMock}
      />

      <CustomCompanyModal
        isOpen={showCustomCompanyModal}
        onClose={() => setShowCustomCompanyModal(false)}
        onLaunchCustomTest={onStartTest}
      />
    </div>
  );
};

export default CompanySelector;
