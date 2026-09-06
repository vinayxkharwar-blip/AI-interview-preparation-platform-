import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import ResumeUpload from '../components/ResumeUpload';
import JobCard from '../components/JobCard';
import { 
  Sparkles, 
  FileText, 
  Target, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Send, 
  Bookmark, 
  PlayCircle, 
  Award, 
  TrendingUp, 
  Lightbulb, 
  Loader2,
  FileCheck,
  Building2,
  Check,
  ChevronRight
} from 'lucide-react';

export default function Resumes() {
  const navigate = useNavigate();

  const [resumes, setResumes] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user resumes
      const resRes = await axiosClient.get('/resumes');
      const resumesData = resRes.data || [];
      setResumes(resumesData);

      // 2. Fetch top recommended jobs
      const jobsRes = await axiosClient.get('/jobs/recommendations');
      setRecommendedJobs(jobsRes.data || []);

      // 3. Fetch saved jobs
      const savedRes = await axiosClient.get('/jobs/saved');
      setSavedJobs(savedRes.data || []);

      // 4. Fetch applications
      const appsRes = await axiosClient.get('/applications');
      setApplications(appsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch resume page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUploadSuccess = (newResume) => {
    setResumes((prev) => [newResume, ...prev]);
    fetchData();
  };

  // Handle Save / Unsave Job
  const handleSaveToggle = async (job) => {
    const isSaved = savedJobs.some((sj) => sj.jobId === job.id || sj.jobId === job.jobId);
    if (isSaved) {
      const savedItem = savedJobs.find((sj) => sj.jobId === job.id || sj.jobId === job.jobId);
      if (savedItem) {
        try {
          await axiosClient.delete(`/jobs/save/${savedItem._id || savedItem.id}`);
          setSavedJobs(savedJobs.filter((sj) => sj.jobId !== (job.id || job.jobId)));
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      try {
        const res = await axiosClient.post('/jobs/save', {
          jobId: job.id || job.jobId,
          title: job.title,
          company: job.company,
          logo: job.logo,
          location: job.location,
          salary: job.salary,
          jobType: job.jobType,
          experience: job.experience,
          description: job.description,
          skills: job.skills,
          applyUrl: job.applyUrl,
          matchedSkills: job.matchedSkills,
          missingSkills: job.missingSkills,
          matchPercentage: job.matchPercentage,
        });

        setSavedJobs([res.data.savedJob, ...savedJobs]);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Handle Apply Job
  const handleApplyJob = async (job) => {
    try {
      const res = await axiosClient.post('/applications', {
        jobId: job.id || job.jobId,
        title: job.title,
        company: job.company,
        logo: job.logo,
        location: job.location,
        status: 'applied',
        applyUrl: job.applyUrl,
      });

      setApplications([res.data.application, ...applications]);
    } catch (e) {
      console.error(e);
    }
  };

  const latestResume = resumes.length > 0 ? resumes[0] : null;
  const parsed = latestResume?.parsedData || {};
  const atsScore = typeof parsed.atsScore === 'number' ? parsed.atsScore : 82;
  const targetRole = parsed.targetRole || 'Full Stack Engineer';

  // Career Progress Checklist items
  const progressChecklist = [
    { label: 'Resume Uploaded', completed: Boolean(latestResume) },
    { label: 'Resume Score Generated', completed: Boolean(latestResume) },
    { label: 'Jobs Recommended', completed: recommendedJobs.length > 0 },
    { label: 'Cover Letter Generated', completed: false },
    { label: 'Interview Practiced', completed: false },
    { label: 'Application Submitted', completed: applications.length > 0 },
    { label: 'Offer Received', completed: applications.some((a) => a.status === 'offer') },
  ];

  const workflowSteps = [
    { step: '1', title: 'Upload Resume', desc: 'PDF / DOCX' },
    { step: '2', title: 'ATS Analysis', desc: 'Score & Skills' },
    { step: '3', title: 'Job Match', desc: 'Match % & Gaps' },
    { step: '4', title: 'Cover Letter', desc: 'AI Generator' },
    { step: '5', title: 'Apply', desc: 'Track Pipeline' },
    { step: '6', title: 'AI Interview', desc: 'Mock Loops' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 animate-fadeIn">
      
      {/* SECTION 1: Hero Section with Visual Workflow */}
      <div className="bg-[#0F1E1B] text-[#FDFBF3] rounded-3xl p-6 sm:p-8 space-y-6 editorial-shadow-lg relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left Title & Description */}
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xl bg-[#F5D90A] text-[#0F1E1B] text-xs font-black">
              <Sparkles className="w-4 h-4 text-[#0F1E1B]" />
              <span>🚀 AI Career Hub Gateway</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black font-serif-headline tracking-tight text-[#FDFBF3] leading-tight">
              Upload your resume once and let AI guide your entire job search journey.
            </h1>
            
            <p className="text-xs sm:text-sm text-[#FDFBF3]/80 leading-relaxed font-sans-body">
              Our AI automatically analyzes your document to calculate ATS compatibility, recommend top-tier jobs, generate customized cover letters, and prepare you for technical interviews.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              {[
                'Analyze Resume',
                'Calculate ATS Score',
                'Extract Skills',
                'Recommend Jobs',
                'Calculate Job Match %',
                'Generate Cover Letters',
                'Track Applications',
                'Start AI Mock Interviews',
              ].map((feat, idx) => (
                <div key={idx} className="flex items-center space-x-1.5 text-xs font-bold text-[#F5D90A]">
                  <span>✓</span>
                  <span className="text-[#FDFBF3]">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Visual Workflow Diagram */}
          <div className="lg:col-span-6 bg-[#FDFBF3]/10 border border-[#FDFBF3]/20 rounded-2xl p-5 backdrop-blur-sm space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#F5D90A] text-center">
              Automated AI Career Workflow Timeline
            </h3>

            <div className="grid grid-cols-3 gap-3 pt-1">
              {workflowSteps.map((ws, i) => (
                <div
                  key={i}
                  className="bg-[#FDFBF3] text-[#0F1E1B] rounded-xl p-3 text-center border-2 border-[#F5D90A] shadow-sm flex flex-col justify-between space-y-1 relative"
                >
                  <span className="w-5 h-5 rounded-full bg-[#0F1E1B] text-[#F5D90A] font-black text-[10px] flex items-center justify-center mx-auto">
                    {ws.step}
                  </span>
                  <p className="text-xs font-black font-serif-headline text-[#0F1E1B] leading-snug">
                    {ws.title}
                  </p>
                  <span className="text-[9px] font-bold text-[#C1440E] uppercase">{ws.desc}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 2: Redesigned Upload Card */}
      <ResumeUpload onUploadSuccess={handleUploadSuccess} />

      {/* SECTION 3: Resume Summary Dashboard (If Resume Exists) */}
      {latestResume && (
        <div className="bg-[#FDFBF3] text-[#0F1E1B] p-6 sm:p-8 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-[#0F1E1B]/10 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-[#0F1E1B] text-[#F5D90A] rounded-2xl">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase text-[#C1440E]">Analyzed Active Resume</span>
                <h2 className="font-serif-headline text-2xl font-bold text-[#0F1E1B]">
                  {latestResume.fileName}
                </h2>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/career-hub')}
                className="px-4 py-2 rounded-xl bg-[#0F1E1B] text-[#FDFBF3] text-xs font-bold hover:bg-[#1A332E] transition-all flex items-center space-x-1.5 shadow-xs"
              >
                <Briefcase className="w-3.5 h-3.5 text-[#F5D90A]" />
                <span>View Career Hub</span>
              </button>

              <button
                onClick={() => navigate('/cover-letter')}
                className="px-4 py-2 rounded-xl bg-[#F5D90A] text-[#0F1E1B] text-xs font-bold border-2 border-[#0F1E1B] hover:bg-[#e0c609] transition-all"
              >
                <span>Cover Letter</span>
              </button>
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-black uppercase text-[#C1440E]">ATS Score</span>
              <div className="text-3xl font-black font-serif-headline text-[#0F1E1B]">
                {atsScore}<span className="text-xs font-bold text-[#0F1E1B]/60">/100</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-800">High Keyword Match</span>
            </div>

            <div className="bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-black uppercase text-[#0F1E1B]">Detected Role</span>
              <div className="text-base font-black font-serif-headline text-[#0F1E1B] truncate">
                {targetRole}
              </div>
              <span className="text-[10px] font-bold text-[#0F1E1B]/70">Primary Career Target</span>
            </div>

            <div className="bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-black uppercase text-[#0F1E1B]">Top Job Match</span>
              <div className="text-3xl font-black font-serif-headline text-emerald-800">
                {recommendedJobs.length > 0 ? `${recommendedJobs[0].matchPercentage}%` : '92%'}
              </div>
              <span className="text-[10px] font-bold text-[#0F1E1B]/70">{recommendedJobs[0]?.company || 'Stripe'}</span>
            </div>

            <div className="bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-black uppercase text-[#0F1E1B]">Matched Positions</span>
              <div className="text-3xl font-black font-serif-headline text-[#0F1E1B]">
                {recommendedJobs.length}
              </div>
              <span className="text-[10px] font-bold text-[#0F1E1B]/70">Active Openings</span>
            </div>

          </div>

          {/* Extracted Skills & Strengths/Weaknesses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            
            {/* Extracted Skills */}
            <div className="bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl p-5 space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#0F1E1B] flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C1440E]" />
                <span>Extracted Skills ({parsed.skills?.length || 8})</span>
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(parsed.skills || ['React', 'Node.js', 'TypeScript', 'MongoDB', 'AWS', 'Docker', 'REST API', 'GraphQL']).map((sk, i) => (
                  <span key={i} className="px-2.5 py-0.5 rounded-lg bg-[#FDFBF3] border border-[#0F1E1B]/20 text-xs font-bold text-[#0F1E1B]">
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div className="bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl p-5 space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#C1440E] flex items-center space-x-1.5">
                <Target className="w-3.5 h-3.5" />
                <span>ATS Strengths & Skill Recommendations</span>
              </span>
              <ul className="space-y-1 text-xs font-bold text-[#0F1E1B]">
                <li className="flex items-start space-x-1.5">
                  <span className="text-emerald-700">✓</span>
                  <span>Strong technical skill density for {targetRole} positions.</span>
                </li>
                <li className="flex items-start space-x-1.5">
                  <span className="text-[#C1440E]">•</span>
                  <span>Add cloud orchestration (Docker, AWS) to boost ATS match by +15%.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      )}

      {/* SECTION 4: Recommended Jobs Preview (First 3 Jobs) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-[#F5D90A] border-2 border-[#0F1E1B] rounded-xl text-[#0F1E1B]">
              <Target className="w-5 h-5 text-[#0F1E1B]" />
            </div>
            <div>
              <h2 className="font-serif-headline text-2xl font-bold text-[#0F1E1B]">
                🎯 Top Recommended Jobs for Your Profile
              </h2>
              <p className="text-xs text-[#0F1E1B]/75 font-medium">
                AI-matched against your extracted skills, experience, and target role.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/career-hub')}
            className="px-4 py-2 rounded-xl bg-[#0F1E1B] text-[#FDFBF3] text-xs font-bold hover:bg-[#1A332E] transition-all flex items-center space-x-1.5 shadow-xs"
          >
            <span>View All Jobs ({recommendedJobs.length})</span>
            <ChevronRight className="w-4 h-4 text-[#F5D90A]" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {recommendedJobs.slice(0, 3).map((job) => {
            const isSaved = savedJobs.some((sj) => sj.jobId === job.id || sj.jobId === job.jobId);
            return (
              <JobCard
                key={job.id || job.jobId}
                job={job}
                isSaved={isSaved}
                onSaveToggle={handleSaveToggle}
                onApply={handleApplyJob}
              />
            );
          })}
        </div>
      </div>

      {/* SECTION 5: Quick Actions Grid */}
      <div className="space-y-4">
        <h2 className="font-serif-headline text-2xl font-bold text-[#0F1E1B] flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-[#C1440E]" />
          <span>Quick Career Actions</span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          <button
            onClick={() => navigate('/cover-letter')}
            className="p-4 rounded-2xl bg-[#FDFBF3] border-2 border-[#0F1E1B] text-left hover:bg-[#F5F2E6] transition-all space-y-2 group shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-[#0F1E1B] text-[#F5D90A] flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black font-serif-headline text-[#0F1E1B] group-hover:text-[#C1440E]">
              Cover Letter
            </h4>
            <span className="text-[10px] text-[#0F1E1B]/70 font-semibold block">AI Studio</span>
          </button>

          <button
            onClick={() => navigate('/new-session')}
            className="p-4 rounded-2xl bg-[#FDFBF3] border-2 border-[#0F1E1B] text-left hover:bg-[#F5F2E6] transition-all space-y-2 group shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-[#0F1E1B] text-[#F5D90A] flex items-center justify-center font-bold">
              <PlayCircle className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black font-serif-headline text-[#0F1E1B] group-hover:text-[#C1440E]">
              Practice Interview
            </h4>
            <span className="text-[10px] text-[#0F1E1B]/70 font-semibold block">Mock Loops</span>
          </button>

          <button
            onClick={() => navigate('/career-hub')}
            className="p-4 rounded-2xl bg-[#FDFBF3] border-2 border-[#0F1E1B] text-left hover:bg-[#F5F2E6] transition-all space-y-2 group shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-[#0F1E1B] text-[#F5D90A] flex items-center justify-center font-bold">
              <Briefcase className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black font-serif-headline text-[#0F1E1B] group-hover:text-[#C1440E]">
              Find More Jobs
            </h4>
            <span className="text-[10px] text-[#0F1E1B]/70 font-semibold block">Job Matching</span>
          </button>

          <button
            onClick={() => navigate('/career-hub')}
            className="p-4 rounded-2xl bg-[#FDFBF3] border-2 border-[#0F1E1B] text-left hover:bg-[#F5F2E6] transition-all space-y-2 group shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-[#0F1E1B] text-[#F5D90A] flex items-center justify-center font-bold">
              <Send className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black font-serif-headline text-[#0F1E1B] group-hover:text-[#C1440E]">
              Application Tracker
            </h4>
            <span className="text-[10px] text-[#0F1E1B]/70 font-semibold block">Pipeline</span>
          </button>

          <button
            onClick={() => navigate('/career-hub')}
            className="p-4 rounded-2xl bg-[#FDFBF3] border-2 border-[#0F1E1B] text-left hover:bg-[#F5F2E6] transition-all space-y-2 group shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-[#0F1E1B] text-[#F5D90A] flex items-center justify-center font-bold">
              <Bookmark className="w-4 h-4 fill-current" />
            </div>
            <h4 className="text-xs font-black font-serif-headline text-[#0F1E1B] group-hover:text-[#C1440E]">
              Saved Jobs
            </h4>
            <span className="text-[10px] text-[#0F1E1B]/70 font-semibold block">Bookmarked</span>
          </button>

          <button
            onClick={() => window.scrollTo({ top: 300, behavior: 'smooth' })}
            className="p-4 rounded-2xl bg-[#FDFBF3] border-2 border-[#0F1E1B] text-left hover:bg-[#F5F2E6] transition-all space-y-2 group shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-[#0F1E1B] text-[#F5D90A] flex items-center justify-center font-bold">
              <FileCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black font-serif-headline text-[#0F1E1B] group-hover:text-[#C1440E]">
              Improve Resume
            </h4>
            <span className="text-[10px] text-[#0F1E1B]/70 font-semibold block">Re-upload</span>
          </button>

        </div>
      </div>

      {/* SECTION 6: Career Progress Tracker Widget */}
      <div className="bg-[#FDFBF3] text-[#0F1E1B] p-6 rounded-3xl border-3 border-[#0F1E1B] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif-headline text-lg font-bold text-[#0F1E1B] flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-emerald-700" />
            <span>AI Career Progress Journey</span>
          </h3>
          <span className="text-xs font-black text-[#C1440E]">
            {progressChecklist.filter((c) => c.completed).length} / {progressChecklist.length} Completed
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {progressChecklist.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-2xl border text-center space-y-1.5 flex flex-col justify-between ${
                item.completed
                  ? 'bg-emerald-500/10 border-emerald-600 text-emerald-900'
                  : 'bg-[#F5F2E6] border-[#0F1E1B]/20 text-[#0F1E1B]/60'
              }`}
            >
              <div className="w-5 h-5 rounded-full mx-auto flex items-center justify-center text-xs font-bold">
                {item.completed ? '✅' : '⏳'}
              </div>
              <span className="text-[11px] font-bold leading-tight block">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 7: AI Career Suggestions */}
      <div className="bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl p-5 space-y-3">
        <div className="flex items-center space-x-2 text-[#0F1E1B]">
          <Lightbulb className="w-5 h-5 text-[#F5D90A]" />
          <h3 className="text-base font-bold font-serif-headline">AI Career Actionable Suggestions</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold text-[#0F1E1B]">
          <div className="p-3 bg-[#FDFBF3] rounded-xl border border-[#0F1E1B]/20 space-y-1">
            <span className="text-[#C1440E] font-black">1. ATS Optimization</span>
            <p className="text-[#0F1E1B]/80 font-normal">Add Docker & AWS keywords to raise resume match by +15%.</p>
          </div>
          <div className="p-3 bg-[#FDFBF3] rounded-xl border border-[#0F1E1B]/20 space-y-1">
            <span className="text-[#C1440E] font-black">2. Application Momentum</span>
            <p className="text-[#0F1E1B]/80 font-normal">Apply to 5 high-match jobs today to build your interview funnel.</p>
          </div>
          <div className="p-3 bg-[#FDFBF3] rounded-xl border border-[#0F1E1B]/20 space-y-1">
            <span className="text-[#C1440E] font-black">3. Practice Technical Loop</span>
            <p className="text-[#0F1E1B]/80 font-normal">Complete a 15-minute AI mock interview for {targetRole}.</p>
          </div>
        </div>
      </div>

      {/* SECTION 8: Navigation CTA Banner */}
      <div className="bg-[#0F1E1B] text-[#FDFBF3] rounded-3xl p-8 text-center space-y-4 editorial-shadow-lg">
        <div className="w-12 h-12 rounded-2xl bg-[#F5D90A] text-[#0F1E1B] flex items-center justify-center font-bold mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black font-serif-headline text-[#FDFBF3]">
          Ready to Explore Your Matched Opportunities?
        </h2>
        <p className="text-xs sm:text-sm text-[#FDFBF3]/80 max-w-xl mx-auto font-sans-body">
          Continue to the full AI Career Hub dashboard to manage saved jobs, generate custom cover letters, and track your application pipeline.
        </p>

        <button
          onClick={() => navigate('/career-hub')}
          className="px-8 py-4 rounded-2xl bg-[#F5D90A] text-[#0F1E1B] font-black text-sm hover:bg-[#e0c609] transition-all inline-flex items-center space-x-2 editorial-shadow"
        >
          <span>Continue to AI Career Hub</span>
          <ArrowRight className="w-5 h-5 text-[#0F1E1B]" />
        </button>
      </div>

      {/* Existing Uploaded Resumes List Section */}
      <div className="bg-[#FDFBF3] text-[#0F1E1B] p-6 sm:p-8 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-6">
        <h2 className="font-serif-headline text-2xl font-bold text-[#0F1E1B] flex items-center space-x-2">
          <FileText className="w-6 h-6 text-[#C1440E]" />
          <span>All Uploaded Resume Versions ({resumes.length})</span>
        </h2>

        {loading ? (
          <div className="p-8 text-center text-[#0F1E1B]/70 font-medium">
            <Loader2 className="w-6 h-6 animate-spin text-[#C1440E] mx-auto mb-2" />
            <span>Loading uploaded documents...</span>
          </div>
        ) : resumes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resumes.map((res) => (
              <div
                key={res._id || res.id}
                className="p-6 bg-[#F5F2E6] rounded-2xl border-2 border-[#0F1E1B] space-y-4 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-[#0F1E1B] text-[#F5D90A] rounded-2xl">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0F1E1B] text-base">{res.fileName}</h3>
                      <span className="text-xs text-[#0F1E1B]/60 font-medium flex items-center space-x-1 mt-0.5">
                        <span>Uploaded: {new Date(res.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-[#FEF9C3] border border-[#0F1E1B] text-[#0F1E1B] text-xs font-bold rounded-xl uppercase">
                    {res.fileType}
                  </span>
                </div>

                {res.parsedData?.targetRole && (
                  <div className="flex items-center space-x-2 text-xs font-bold text-[#C1440E]">
                    <Briefcase className="w-4 h-4" />
                    <span>Target Role: {res.parsedData.targetRole}</span>
                  </div>
                )}

                {/* Skills tags */}
                {res.parsedData?.skills && res.parsedData.skills.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F1E1B]/70">
                      Extracted Technical Skills:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {res.parsedData.skills.slice(0, 8).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 bg-[#FDFBF3] border border-[#0F1E1B] text-[#0F1E1B] text-[11px] font-bold rounded-lg"
                        >
                          {skill}
                        </span>
                      ))}
                      {res.parsedData.skills.length > 8 && (
                        <span className="text-[11px] text-[#0F1E1B]/60 font-bold self-center">
                          +{res.parsedData.skills.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#0F1E1B]/60 italic font-medium">No resumes uploaded yet. Upload a PDF or DOCX file above.</p>
        )}
      </div>

    </div>
  );
}
