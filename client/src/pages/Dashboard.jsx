import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import { getCurrentPlacementDrive } from '../api/placementApi';
import NextBestAction from '../components/NextBestAction';
import CompanyPrepModal from '../components/CompanyPrepModal';
import { 
  FileText, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Award,
  Loader2,
  Plus,
  ArrowRight,
  TrendingUp,
  Briefcase,
  Building2,
  Check,
  Target,
  ExternalLink,
  Trophy,
  PlayCircle,
  ShieldCheck,
  BarChart3,
  Calendar,
  Send,
  Zap
} from 'lucide-react';
import PrepPilotIcon from '../components/brand/PrepPilotIcon';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [placementDrive, setPlacementDrive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedJobForPrep, setSelectedJobForPrep] = useState(null);

  const initialGoals = [
    { id: 1, text: 'Upload or optimize your ATS resume', completed: false },
    { id: 2, text: 'Explore recommended jobs & match scores', completed: false },
    { id: 3, text: 'Complete a structured AI mock interview loop', completed: false },
    { id: 4, text: 'Advance your 4-round AI Placement Drive', completed: false },
  ];

  const [goals, setGoals] = useState(initialGoals);

  const currentUserId = user?.id || user?._id;
  const currentTargetRole =
    (typeof window !== 'undefined' && localStorage.getItem('preppilot_target_role')) ||
    user?.targetRole ||
    'Full Stack Engineer';

  useEffect(() => {
    // Reset state on user switch or mount
    setSessions([]);
    setResumes([]);
    setJobs([]);
    setApplications([]);
    setPlacementDrive(null);
    setGoals(initialGoals);

    if (!currentUserId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [sessRes, resRes, jobsRes, appsRes, driveRes] = await Promise.allSettled([
          axiosClient.get('/sessions'),
          axiosClient.get('/resumes'),
          axiosClient.get('/jobs/recommendations', {
            params: { targetRole: currentTargetRole }
          }),
          axiosClient.get('/applications'),
          getCurrentPlacementDrive(),
        ]);

        let hasResume = false;
        let completedInterviewCount = 0;

        if (sessRes.status === 'fulfilled') {
          const sessList = Array.isArray(sessRes.value.data) ? sessRes.value.data : [];
          setSessions(sessList);
          completedInterviewCount = sessList.filter((s) => s.status === 'completed').length;
          if (completedInterviewCount > 0) {
            setGoals((prev) => prev.map((g) => (g.id === 3 ? { ...g, completed: true } : g)));
          }
        }

        if (resRes.status === 'fulfilled') {
          const resData = Array.isArray(resRes.value.data) ? resRes.value.data : [];
          setResumes(resData);
          if (resData.length > 0) {
            hasResume = true;
            setGoals((prev) => prev.map((g) => (g.id === 1 ? { ...g, completed: true } : g)));
          }
        }

        if (jobsRes.status === 'fulfilled') {
          const jobsData = Array.isArray(jobsRes.value.data) ? jobsRes.value.data : [];
          setJobs(jobsData);
          if (hasResume && jobsData.some((j) => (j.matchPercentage || 0) > 0)) {
            setGoals((prev) => prev.map((g) => (g.id === 2 ? { ...g, completed: true } : g)));
          }
        }

        if (appsRes.status === 'fulfilled') {
          setApplications(Array.isArray(appsRes.value.data) ? appsRes.value.data : []);
        }

        if (driveRes.status === 'fulfilled' && driveRes.value?.data) {
          const driveData = driveRes.value.data;
          setPlacementDrive(driveData);
          if (driveData.currentRound > 1 || driveData.status === 'completed') {
            setGoals((prev) => prev.map((g) => (g.id === 4 ? { ...g, completed: true } : g)));
          }
        }
      } catch (err) {
        console.error('[Dashboard Metrics Load Error]:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUserId, currentTargetRole]);

  const toggleGoal = (id) => {
    setGoals(goals.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g)));
  };

  const latestResume = resumes.length > 0 ? resumes[0] : null;
  const effectiveTargetRole =
    (typeof window !== 'undefined' && localStorage.getItem('preppilot_target_role')) ||
    user?.targetRole ||
    latestResume?.parsedData?.targetRole ||
    'Full Stack Engineer';
  const atsScore = typeof latestResume?.parsedData?.atsScore === 'number' ? latestResume.parsedData.atsScore : null;
  const featuredJob = jobs.length > 0 ? jobs[0] : null;
  const matchedJobs = latestResume ? jobs.filter((j) => (j.matchPercentage || 0) > 0) : jobs;

  // Completed mock interview sessions (do NOT count incomplete/abandoned sessions)
  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const scheduledInterviews = applications.filter((a) => a.status === 'interview');
  const offersReceived = applications.filter((a) => a.status === 'offer');

  // Placement Arena rounds calculation
  const completedRoundsCount = placementDrive
    ? placementDrive.status === 'completed'
      ? 4
      : Math.max(0, (placementDrive.currentRound || 1) - 1)
    : 0;

  // Composite Career Health Score (0-100) strictly computed from persisted evidence
  const resumePart = atsScore !== null ? Math.round(atsScore * 0.3) : 0; // max 30
  const interviewPart = Math.min(25, completedSessions.length * 8); // max 25
  const applicationPart = Math.min(20, applications.length * 5); // max 20
  const placementPart = Math.round((completedRoundsCount / 4) * 25); // max 25
  const careerHealthScore = Math.min(100, resumePart + interviewPart + applicationPart + placementPart);

  // Verifiable Career Timeline Progress
  const timelineSteps = [
    { label: 'Resume Uploaded', completed: Boolean(latestResume) },
    { label: 'Skills Analyzed', completed: Boolean(latestResume && atsScore !== null) },
    { label: 'Jobs Matched', completed: matchedJobs.length > 0 },
    { label: 'Application Pipeline', completed: applications.length > 0 },
    { label: 'Mock Loop Completed', completed: completedSessions.length > 0 },
    { label: 'Job Offer Received', completed: offersReceived.length > 0 },
  ];

  const roundTitles = {
    1: 'Round 1: Aptitude Test',
    2: 'Round 2: Technical Interview',
    3: 'Round 3: Group Discussion',
    4: 'Round 4: Resume Deep-Dive',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-8 animate-fadeIn">
      
      {/* ================= 1. PERSONALIZED WELCOME HEADER ================= */}
      <div className="bg-[#10221D] text-[#FAF8F0] p-5 sm:p-8 rounded-2xl sm:rounded-3xl border-2 border-[#10221D] editorial-shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-xl bg-[#FFC400] text-[#10221D] text-xs font-black shadow-xs">
              <PrepPilotIcon size={15} variant="bare" />
              <span>PrepPilot AI Flight Deck</span>
            </div>
            
            <h1 className="font-serif-headline text-2xl sm:text-4xl font-black text-[#FAF8F0] tracking-tight leading-tight">
              Welcome back, <span className="text-[#FFC400]">{user?.name || 'Candidate'}</span>!
            </h1>
            
            <p className="text-xs sm:text-sm text-[#FAF8F0]/80 font-sans-body max-w-2xl leading-relaxed">
              Target Role: <strong className="text-[#FFC400]">{effectiveTargetRole}</strong> • Verified metrics calibrated from your live interview loops and applications.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[#FAF8F0]/90 font-medium">
              <span className="bg-[#FAF8F0]/10 border border-[#FAF8F0]/15 px-2.5 py-1 rounded-lg">📄 {resumes.length} {resumes.length === 1 ? 'Resume' : 'Resumes'}</span>
              <span className="bg-[#FAF8F0]/10 border border-[#FAF8F0]/15 px-2.5 py-1 rounded-lg">🎙️ {completedSessions.length} Completed {completedSessions.length === 1 ? 'Interview' : 'Interviews'}</span>
              <span className="bg-[#FAF8F0]/10 border border-[#FAF8F0]/15 px-2.5 py-1 rounded-lg">💼 {applications.length} Active {applications.length === 1 ? 'Application' : 'Applications'}</span>
            </div>
          </div>

          {/* Genuine Career Health Score Gauge */}
          <div className="bg-[#FDFBF3] text-[#10221D] rounded-2xl p-4 sm:p-5 border-2 border-[#FFC400] text-center w-full md:w-auto md:min-w-[180px] shrink-0 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#F47721]">
              Career Health Score
            </span>
            <div className="text-3xl sm:text-4xl font-black font-serif-headline text-[#10221D] my-1">
              {careerHealthScore}<span className="text-sm font-bold text-[#10221D]/50">/100</span>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 block mb-1">
              {careerHealthScore >= 80 ? 'Offer Ready' : careerHealthScore >= 50 ? 'Steady Progress' : 'Initial Phase'}
            </span>
            <p className="text-[9px] text-[#10221D]/65 font-medium leading-tight max-w-[200px] mx-auto">
              Based on ATS resume score (30%), completed loops (25%), applications (20%) & campus drive (25%).
            </p>
          </div>
        </div>
      </div>

      {/* ================= 2. DYNAMIC NEXT BEST ACTION ENGINE ================= */}
      <NextBestAction
        hasResume={Boolean(latestResume)}
        hasJobs={matchedJobs.length > 0}
        placementDrive={placementDrive}
        hasApplications={applications.length > 0}
        completedInterviewsCount={completedSessions.length}
        targetRole={effectiveTargetRole}
      />

      {/* ================= 3. AI PLACEMENT ARENA STATUS CARD ================= */}
      <div className="bg-[#FDFBF3] p-5 sm:p-6 rounded-2xl border-2 border-[#10221D] editorial-shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#10221D] text-[#FFC400] flex items-center justify-center shrink-0 shadow-xs">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="bg-[#FFC400] text-[#10221D] px-2 py-0.5 rounded text-[10px] font-black uppercase">
                Campus Arena
              </span>
              <span className="text-xs font-bold text-[#10221D]/60">
                {placementDrive ? `${completedRoundsCount} of 4 Rounds Completed` : '0 of 4 Rounds Completed'}
              </span>
            </div>
            <h3 className="font-serif-headline text-lg sm:text-xl font-black text-[#10221D]">
              {placementDrive && placementDrive.status === 'completed'
                ? 'Placement Drive Gauntlet Completed'
                : placementDrive
                ? `Current: ${roundTitles[placementDrive.currentRound] || 'Round 1: Aptitude Test'}`
                : 'AI Placement Drive'}
            </h3>
            <p className="text-xs text-[#10221D]/70 max-w-xl">
              Complete the 4-stage gauntlet: Aptitude PYQs, Technical Live Interview, AI Group Discussion, and Resume Evaluation.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/placement-drive')}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#10221D] text-[#FAF8F0] hover:bg-[#1A332E] font-bold text-xs border border-[#10221D] transition-all flex items-center justify-center space-x-1.5 shrink-0 shadow-xs cursor-pointer"
        >
          <span>
            {placementDrive && placementDrive.status === 'completed'
              ? 'View Gauntlet Report'
              : placementDrive
              ? `Continue Round ${placementDrive.currentRound || 1}`
              : 'Start Placement Drive'}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#FFC400]" />
        </button>
      </div>

      {/* ================= 4. OVERVIEW KPI METRIC CARDS ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        
        {/* ATS Score */}
        <button
          type="button"
          onClick={() => navigate('/resumes')}
          className="bg-[#FDFBF3] hover:bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl p-2.5 sm:p-3.5 space-y-1 editorial-shadow-sm flex flex-col justify-between text-left transition-all hover:scale-[1.02] cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#F47721] w-full">
            <span className="text-[10px] font-black uppercase tracking-wider">ATS Score</span>
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl sm:text-3xl font-black font-serif-headline text-[#10221D]">
            {atsScore !== null ? atsScore : '—'}
            {atsScore !== null && <span className="text-xs font-bold text-[#10221D]/50">/100</span>}
          </div>
          <span className="text-[10px] font-bold text-emerald-800 truncate">
            {latestResume ? 'Resume Quality' : 'Upload Resume →'}
          </span>
        </button>

        {/* Matched Jobs */}
        <button
          type="button"
          onClick={() => navigate('/career-hub?tab=jobs')}
          className="bg-[#FDFBF3] hover:bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl p-2.5 sm:p-3.5 space-y-1 editorial-shadow-sm flex flex-col justify-between text-left transition-all hover:scale-[1.02] cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#10221D]/70 w-full">
            <span className="text-[10px] font-black uppercase tracking-wider">Matched Jobs</span>
            <Briefcase className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl sm:text-3xl font-black font-serif-headline text-[#10221D]">
            {matchedJobs.length}
          </div>
          <span className="text-[10px] font-bold text-[#10221D]/70 truncate">Explore Roles →</span>
        </button>

        {/* Applications Submitted */}
        <button
          type="button"
          onClick={() => navigate('/career-hub?tab=applications')}
          className="bg-[#FDFBF3] hover:bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl p-2.5 sm:p-3.5 space-y-1 editorial-shadow-sm flex flex-col justify-between text-left transition-all hover:scale-[1.02] cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#10221D]/70 w-full">
            <span className="text-[10px] font-black uppercase tracking-wider">Applications</span>
            <Send className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl sm:text-3xl font-black font-serif-headline text-[#10221D]">
            {applications.length}
          </div>
          <span className="text-[10px] font-bold text-[#10221D]/70 truncate">Track Pipeline →</span>
        </button>

        {/* Mock Interview Loops (Only Completed Sessions) */}
        <button
          type="button"
          onClick={() => navigate('/new-session', { state: { targetRole: effectiveTargetRole } })}
          className="bg-[#FDFBF3] hover:bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl p-2.5 sm:p-3.5 space-y-1 editorial-shadow-sm flex flex-col justify-between text-left transition-all hover:scale-[1.02] cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#10221D]/70 w-full">
            <span className="text-[10px] font-black uppercase tracking-wider">Mock Loops</span>
            <PlayCircle className="w-3.5 h-3.5 text-[#F47721]" />
          </div>
          <div className="text-xl sm:text-3xl font-black font-serif-headline text-[#10221D]">
            {completedSessions.length}
          </div>
          <span className="text-[10px] font-bold text-[#10221D]/70 truncate">Start New Loop →</span>
        </button>

        {/* Scheduled Interviews */}
        <button
          type="button"
          onClick={() => navigate('/career-hub?tab=applications')}
          className="bg-[#FDFBF3] hover:bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl p-2.5 sm:p-3.5 space-y-1 editorial-shadow-sm flex flex-col justify-between text-left transition-all hover:scale-[1.02] cursor-pointer"
        >
          <div className="flex items-center justify-between text-purple-800 w-full">
            <span className="text-[10px] font-black uppercase tracking-wider">Interviews</span>
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl sm:text-3xl font-black font-serif-headline text-purple-900">
            {scheduledInterviews.length}
          </div>
          <span className="text-[10px] font-bold text-purple-800 truncate">Scheduled Calls</span>
        </button>

        {/* Offers Received */}
        <button
          type="button"
          onClick={() => navigate('/career-hub?tab=applications')}
          className="bg-[#FDFBF3] hover:bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl p-2.5 sm:p-3.5 space-y-1 editorial-shadow-sm flex flex-col justify-between text-left transition-all hover:scale-[1.02] cursor-pointer"
        >
          <div className="flex items-center justify-between text-emerald-800 w-full">
            <span className="text-[10px] font-black uppercase tracking-wider">Job Offers</span>
            <Award className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl sm:text-3xl font-black font-serif-headline text-emerald-900">
            {offersReceived.length}
          </div>
          <span className="text-[10px] font-bold text-emerald-800 truncate">Confirmed Offers</span>
        </button>

      </div>

      {/* ================= 5. FEATURED JOB MATCH CARD ================= */}
      {featuredJob ? (
        <div className="bg-[#FDFBF3] text-[#10221D] border-2 border-[#10221D] rounded-2xl p-5 sm:p-6 editorial-shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#10221D]/10 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#F47721]" />
              <span className="text-xs font-black uppercase tracking-wider text-[#F47721]">
                Top Verified AI Job Recommendation
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black">
              {featuredJob.matchPercentage || 85}% Skill Match
            </span>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#FAF8F0] border border-[#10221D]/20 overflow-hidden flex items-center justify-center shrink-0">
                {featuredJob.logo ? (
                  <img src={featuredJob.logo} alt={featuredJob.company} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-[#10221D]/60" />
                )}
              </div>
              <div>
                <span className="text-xs font-black uppercase text-[#F47721] tracking-wide">{featuredJob.company}</span>
                <h3 className="text-lg sm:text-xl font-bold font-serif-headline text-[#10221D]">{featuredJob.title}</h3>
                <div className="flex flex-wrap gap-2 text-xs font-medium text-[#10221D]/70 mt-0.5">
                  <span>📍 {featuredJob.location}</span>
                  {featuredJob.salary && <span>• 💵 {featuredJob.salary}</span>}
                  {featuredJob.jobType && <span>• 💼 {featuredJob.jobType}</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto">
              {/* Connected Mock Interview Hook */}
              <button
                onClick={() =>
                  navigate('/new-session', {
                    state: {
                      targetRole: featuredJob.title,
                      resumeId: latestResume?._id,
                    },
                  })
                }
                className="w-full sm:w-auto justify-center px-3.5 py-2 rounded-xl bg-[#FFC400] text-[#10221D] font-black text-xs border border-[#10221D] hover:bg-[#E5B000] transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer"
                title="Configure an AI mock interview tailored to this specific job"
              >
                <PlayCircle className="w-3.5 h-3.5 text-[#10221D]" />
                <span>Practice Interview for Role</span>
              </button>

              <button
                onClick={() =>
                  navigate('/cover-letter', {
                    state: {
                      company: featuredJob.company,
                      role: featuredJob.title,
                      resumeId: latestResume?._id,
                    },
                  })
                }
                className="w-full sm:w-auto justify-center px-3.5 py-2 rounded-xl bg-[#FAF8F0] text-[#10221D] font-bold text-xs border border-[#10221D]/20 hover:bg-[#F5F2E6] transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#F47721]" />
                <span>Cover Letter</span>
              </button>

              {featuredJob.applyUrl && (
                <button
                  onClick={() => window.open(featuredJob.applyUrl, '_blank')}
                  className="w-full sm:w-auto justify-center px-3.5 py-2 rounded-xl bg-[#10221D] text-[#FAF8F0] font-bold text-xs hover:bg-[#1A332E] transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>Apply</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#FFC400]" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#FDFBF3] text-[#10221D] border-2 border-[#10221D] rounded-2xl p-6 text-center space-y-2 editorial-shadow-sm">
          <Briefcase className="w-8 h-8 text-[#10221D]/40 mx-auto" />
          <h3 className="font-serif-headline text-base font-bold text-[#10221D]">No Live Job Matches Indexed Yet</h3>
          <p className="text-xs text-[#10221D]/60 max-w-md mx-auto">
            Upload your resume or set your target role to trigger our AI job recommendation and matching pipeline.
          </p>
          <button
            onClick={() => navigate('/career-hub?tab=jobs')}
            className="px-4 py-2 bg-[#FFC400] text-[#10221D] rounded-xl text-xs font-black border border-[#10221D] inline-flex items-center space-x-1.5 mt-2"
          >
            <span>Explore Career Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ================= 6. CAREER PROGRESS ROADMAP & TODAY'S GOALS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Real Career Timeline Widget */}
        <div className="lg:col-span-7 bg-[#FDFBF3] text-[#10221D] border-2 border-[#10221D] rounded-2xl p-5 sm:p-6 space-y-4 editorial-shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#10221D]/10">
            <h3 className="font-serif-headline text-base sm:text-lg font-black text-[#10221D] flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              <span>Career Progress Roadmap</span>
            </h3>
            <span className="text-xs font-black text-[#F47721]">
              {timelineSteps.filter((s) => s.completed).length} / {timelineSteps.length} Milestones Confirmed
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {timelineSteps.map((step, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-center space-y-1 flex flex-col justify-between ${
                  step.completed
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                    : 'bg-[#FAF8F0] border-[#10221D]/15 text-[#10221D]/60 font-medium'
                }`}
              >
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center text-xs">
                  {step.completed ? '✅' : '⏳'}
                </div>
                <span className="text-[11px] leading-tight block">{step.label}</span>
                <span className="text-[9px] uppercase font-bold tracking-wider">
                  {step.completed ? 'Achieved' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Goals Checklist */}
        <div className="lg:col-span-5 bg-[#FDFBF3] text-[#10221D] border-2 border-[#10221D] rounded-2xl p-5 sm:p-6 space-y-3 flex flex-col justify-between editorial-shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-[#F47721] flex items-center space-x-1">
              <Target className="w-3.5 h-3.5" />
              <span>Recommended Daily Goals</span>
            </span>
            <h3 className="font-serif-headline text-base sm:text-lg font-black text-[#10221D]">
              Prep Velocity Targets
            </h3>
          </div>

          <div className="space-y-2">
            {goals.map((g) => (
              <div
                key={g.id}
                onClick={() => toggleGoal(g.id)}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center space-x-2.5 cursor-pointer transition-all ${
                  g.completed
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 line-through'
                    : 'bg-[#FAF8F0] border-[#10221D]/20 text-[#10221D] hover:border-[#10221D]'
                }`}
              >
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${g.completed ? 'bg-emerald-700 text-white' : 'border-[#10221D]'}`}>
                  {g.completed && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>{g.text}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#10221D]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] text-[#10221D]/70 font-medium">
            <span>Click targets to mark complete</span>
            <button
              onClick={() => navigate('/new-session', { state: { targetRole: effectiveTargetRole } })}
              className="text-[#F47721] hover:underline font-bold text-left sm:text-right cursor-pointer"
            >
              Start New Interview Loop →
            </button>
          </div>
        </div>

      </div>

      {/* ================= 7. COMPANY PREP MODAL TRIGGER ================= */}
      {selectedJobForPrep && (
        <CompanyPrepModal
          job={selectedJobForPrep}
          onClose={() => setSelectedJobForPrep(null)}
        />
      )}

    </div>
  );
}
