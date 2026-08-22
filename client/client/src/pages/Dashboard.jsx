import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import NextBestAction from '../components/NextBestAction';
import CompanyPrepModal from '../components/CompanyPrepModal';
import { 
  PlayCircle, 
  FileText, 
  BarChart3, 
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
  Send,
  Bookmark,
  Building2,
  Check,
  Target,
  ExternalLink
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [sessions, setSessions] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobForPrep, setSelectedJobForPrep] = useState(null);

  // Today's goals interactive state
  const [goals, setGoals] = useState([
    { id: 1, text: 'Upload or optimize your ATS resume', completed: false },
    { id: 2, text: 'Explore top recommended jobs & match scores', completed: false },
    { id: 3, text: 'Generate an AI cover letter for your target role', completed: false },
    { id: 4, text: 'Complete a 15-minute mock interview loop', completed: false },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [sessRes, resRes, jobsRes, savedRes, appsRes] = await Promise.allSettled([
          axiosClient.get('/sessions'),
          axiosClient.get('/resumes'),
          fetch('/api/jobs/recommendations', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/jobs/saved', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/applications', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (sessRes.status === 'fulfilled') setSessions(sessRes.value.data || []);
        if (resRes.status === 'fulfilled') {
          const resData = resRes.value.data || [];
          setResumes(resData);
          if (resData.length > 0) {
            setGoals((prev) => prev.map((g) => (g.id === 1 ? { ...g, completed: true } : g)));
          }
        }
        if (jobsRes.status === 'fulfilled' && jobsRes.value.ok) {
          const jobsData = await jobsRes.value.json();
          setJobs(jobsData || []);
          if (jobsData.length > 0) {
            setGoals((prev) => prev.map((g) => (g.id === 2 ? { ...g, completed: true } : g)));
          }
        }
        if (savedRes.status === 'fulfilled' && savedRes.value.ok) {
          const savedData = await savedRes.value.json();
          setSavedJobs(savedData || []);
        }
        if (appsRes.status === 'fulfilled' && appsRes.value.ok) {
          const appsData = await appsRes.value.json();
          setApplications(appsData || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleGoal = (id) => {
    setGoals(goals.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g)));
  };

  const latestResume = resumes.length > 0 ? resumes[0] : null;
  const atsScore = typeof latestResume?.parsedData?.atsScore === 'number' ? latestResume.parsedData.atsScore : 80;
  const featuredJob = jobs.length > 0 ? jobs[0] : null;

  // Composite Career Health Score (0-100)
  const resumeQualityPart = latestResume ? atsScore * 0.3 : 0;
  const skillMatchPart = featuredJob ? (featuredJob.matchPercentage || 85) * 0.25 : 20;
  const applicationPart = applications.length > 0 ? Math.min(20, applications.length * 5) : 0;
  const interviewPart = sessions.length > 0 ? Math.min(25, sessions.length * 8) : 10;
  const careerHealthScore = Math.round(resumeQualityPart + skillMatchPart + applicationPart + interviewPart);

  // Timeline progress
  const timelineSteps = [
    { label: 'Resume Uploaded', completed: Boolean(latestResume) },
    { label: 'Resume Optimized', completed: Boolean(latestResume) },
    { label: 'Jobs Matched', completed: jobs.length > 0 },
    { label: 'Application Submitted', completed: applications.length > 0 },
    { label: 'Interview Practiced', completed: sessions.length > 0 },
    { label: 'Offer Received', completed: applications.some((a) => a.status === 'offer') },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* 1. Personalized Welcome Header */}
      <div className="bg-[#0F1E1B] text-[#FDFBF3] p-8 sm:p-10 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xl bg-[#F5D90A] text-[#0F1E1B] text-xs font-black">
              <Sparkles className="w-3.5 h-3.5 text-[#0F1E1B]" />
              <span>AI Career Platform Active</span>
            </div>
            
            <h1 className="font-serif-headline text-3xl sm:text-5xl font-black text-[#FDFBF3] tracking-tight leading-tight">
              Welcome back, <span className="text-[#F5D90A]">{user?.name || 'Candidate'}</span>!
            </h1>
            
            <p className="text-xs sm:text-sm text-[#FDFBF3]/80 font-sans-body max-w-2xl leading-relaxed">
              Target Role: <strong className="text-[#F5D90A]">{user?.targetRole || 'Full Stack Engineer'}</strong> • Your personalized AI career roadmap is ready.
            </p>
          </div>

          {/* Composite Career Health Score Gauge */}
          <div className="bg-[#FDFBF3] text-[#0F1E1B] rounded-2xl p-5 border-2 border-[#F5D90A] text-center min-w-[170px] shrink-0 shadow-md">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#C1440E]">
              Career Health Score
            </span>
            <div className="text-4xl font-black font-serif-headline text-[#0F1E1B] my-1">
              {careerHealthScore}<span className="text-sm font-bold text-[#0F1E1B]/60">/100</span>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-800 border border-emerald-500/30">
              {careerHealthScore >= 80 ? 'Offer Ready' : careerHealthScore >= 60 ? 'Strong Progress' : 'Needs Setup'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. NEXT BEST ACTION ENGINE BANNER */}
      <NextBestAction
        hasResume={Boolean(latestResume)}
        hasJobs={jobs.length > 0}
        hasCoverLetter={false}
        hasApplications={applications.length > 0}
        hasInterviews={sessions.length > 0}
      />

      {/* 3. Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-4 space-y-1 shadow-xs">
          <span className="text-[10px] font-black uppercase text-[#C1440E]">ATS Score</span>
          <div className="text-2xl sm:text-3xl font-black font-serif-headline text-[#0F1E1B]">
            {atsScore}<span className="text-xs text-[#0F1E1B]/60">/100</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-800">Resume Quality</span>
        </div>

        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-4 space-y-1 shadow-xs">
          <span className="text-[10px] font-black uppercase text-[#0F1E1B]">Jobs Matched</span>
          <div className="text-2xl sm:text-3xl font-black font-serif-headline text-[#0F1E1B]">
            {jobs.length}
          </div>
          <span className="text-[10px] font-bold text-[#0F1E1B]/70">Matched Roles</span>
        </div>

        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-4 space-y-1 shadow-xs">
          <span className="text-[10px] font-black uppercase text-[#0F1E1B]">Applications</span>
          <div className="text-2xl sm:text-3xl font-black font-serif-headline text-[#0F1E1B]">
            {applications.length}
          </div>
          <span className="text-[10px] font-bold text-[#0F1E1B]/70">Pipeline</span>
        </div>

        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-4 space-y-1 shadow-xs">
          <span className="text-[10px] font-black uppercase text-[#0F1E1B]">Mock Loops</span>
          <div className="text-2xl sm:text-3xl font-black font-serif-headline text-[#0F1E1B]">
            {sessions.length}
          </div>
          <span className="text-[10px] font-bold text-[#0F1E1B]/70">Practiced</span>
        </div>

        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-4 space-y-1 shadow-xs">
          <span className="text-[10px] font-black uppercase text-[#0F1E1B]">Interviews</span>
          <div className="text-2xl sm:text-3xl font-black font-serif-headline text-purple-800">
            {applications.filter((a) => a.status === 'interview').length}
          </div>
          <span className="text-[10px] font-bold text-purple-700">Scheduled</span>
        </div>

        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-4 space-y-1 shadow-xs">
          <span className="text-[10px] font-black uppercase text-emerald-800">Job Offers</span>
          <div className="text-2xl sm:text-3xl font-black font-serif-headline text-emerald-800">
            {applications.filter((a) => a.status === 'offer').length}
          </div>
          <span className="text-[10px] font-bold text-emerald-700">Received</span>
        </div>

      </div>

      {/* 4. FEATURED JOB MATCH CARD */}
      {featuredJob && (
        <div className="bg-[#FDFBF3] text-[#0F1E1B] border-3 border-[#0F1E1B] rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[#0F1E1B]/10 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#F5D90A]" />
              <span className="text-xs font-black uppercase tracking-wider text-[#C1440E]">
                ⭐ #1 Featured AI Job Match
              </span>
            </div>
            <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 text-xs font-black">
              {featuredJob.matchPercentage || 95}% Match
            </span>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-[#0F1E1B]/5 border border-[#0F1E1B]/15 overflow-hidden flex items-center justify-center shrink-0">
                {featuredJob.logo ? (
                  <img src={featuredJob.logo} alt={featuredJob.company} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-7 h-7 text-[#0F1E1B]/60" />
                )}
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase text-[#C1440E]">{featuredJob.company}</span>
                <h3 className="text-xl font-bold font-serif-headline text-[#0F1E1B]">{featuredJob.title}</h3>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#0F1E1B]/70 mt-1">
                  <span>📍 {featuredJob.location}</span>
                  <span>💵 {featuredJob.salary || '$140k - $185k'}</span>
                  <span>💼 {featuredJob.jobType}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setSelectedJobForPrep(featuredJob)}
                className="px-4 py-2.5 rounded-xl bg-[#F5D90A] text-[#0F1E1B] font-extrabold text-xs border-2 border-[#0F1E1B] hover:bg-[#e0c609] transition-all flex items-center space-x-1.5"
              >
                <Target className="w-4 h-4" />
                <span>Prepare & Practice</span>
              </button>

              <button
                onClick={() => navigate('/cover-letter', { state: { company: featuredJob.company, role: featuredJob.title } })}
                className="px-4 py-2.5 rounded-xl bg-[#F5F2E6] text-[#0F1E1B] font-extrabold text-xs border border-[#0F1E1B]/20 hover:bg-[#E6E4DC] transition-all flex items-center space-x-1.5"
              >
                <FileText className="w-4 h-4 text-[#C1440E]" />
                <span>Cover Letter</span>
              </button>

              <button
                onClick={() => {
                  if (featuredJob.applyUrl) window.open(featuredJob.applyUrl, '_blank');
                }}
                className="px-4 py-2.5 rounded-xl bg-[#0F1E1B] text-[#FDFBF3] font-bold text-xs hover:bg-[#1A332E] transition-all flex items-center space-x-1.5"
              >
                <span>Apply</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#F5D90A]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CAREER PROGRESS TIMELINE & TODAY'S GOALS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Career Timeline Widget */}
        <div className="lg:col-span-7 bg-[#FDFBF3] text-[#0F1E1B] border-3 border-[#0F1E1B] rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif-headline text-lg font-bold text-[#0F1E1B] flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-700" />
              <span>Career Progress Roadmap</span>
            </h3>
            <span className="text-xs font-black text-[#C1440E]">
              {timelineSteps.filter((s) => s.completed).length} / {timelineSteps.length} Milestones
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {timelineSteps.map((step, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl border text-center space-y-1.5 flex flex-col justify-between ${
                  step.completed
                    ? 'bg-emerald-500/10 border-emerald-600 text-emerald-900 font-bold'
                    : 'bg-[#F5F2E6] border-[#0F1E1B]/20 text-[#0F1E1B]/60 font-medium'
                }`}
              >
                <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center text-xs">
                  {step.completed ? '✅' : '⏳'}
                </div>
                <span className="text-[11px] leading-tight block">{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Goals Checklist */}
        <div className="lg:col-span-5 bg-[#FDFBF3] text-[#0F1E1B] border-3 border-[#0F1E1B] rounded-3xl p-6 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase text-[#C1440E] flex items-center space-x-1">
              <Target className="w-3.5 h-3.5" />
              <span>Today's Recommended Goals</span>
            </span>
            <h3 className="font-serif-headline text-lg font-bold text-[#0F1E1B]">
              Career Velocity Targets
            </h3>
          </div>

          <div className="space-y-2">
            {goals.map((g) => (
              <div
                key={g.id}
                onClick={() => toggleGoal(g.id)}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center space-x-2.5 cursor-pointer transition-all ${
                  g.completed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 line-through'
                    : 'bg-[#F5F2E6] border-[#0F1E1B]/20 text-[#0F1E1B] hover:border-[#0F1E1B]'
                }`}
              >
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${g.completed ? 'bg-emerald-700 text-white' : 'border-[#0F1E1B]'}`}>
                  {g.completed && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>{g.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 6. Company Prep Modal Trigger */}
      {selectedJobForPrep && (
        <CompanyPrepModal
          job={selectedJobForPrep}
          onClose={() => setSelectedJobForPrep(null)}
        />
      )}

    </div>
  );
}
