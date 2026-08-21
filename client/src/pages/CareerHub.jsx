import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { 
  Briefcase, 
  Sparkles, 
  Bookmark, 
  Send, 
  FileText, 
  LayoutDashboard, 
  Search, 
  Plus, 
  ArrowRight,
  RefreshCw,
  Target,
  Calendar,
  BookOpen
} from 'lucide-react';

import JobCard from '../components/JobCard';
import ApplicationTracker from '../components/ApplicationTracker';
import CareerDashboard from '../components/CareerDashboard';
import ResumeAnalysisView from '../components/ResumeAnalysisView';
import CompanyPrepModal from '../components/CompanyPrepModal';

export default function CareerHub() {
  const navigate = useNavigate();
  const location = useLocation();

  // Check URL search query param (e.g. ?tab=applications)
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'dashboard';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedJobForPrep, setSelectedJobForPrep] = useState(null);

  useEffect(() => {
    const tabParam = new URLSearchParams(location.search).get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  const [jobs, setJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [latestResume, setLatestResume] = useState(null);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [targetRoleFilter, setTargetRoleFilter] = useState('');

  // Fetch initial Career Hub data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Job Recommendations
      const jobsRes = await axiosClient.get('/jobs/recommendations');
      setJobs(jobsRes.data || []);

      // 2. Fetch Saved Jobs
      const savedRes = await axiosClient.get('/jobs/saved');
      setSavedJobs(savedRes.data || []);

      // 3. Fetch Applications
      const appsRes = await axiosClient.get('/applications');
      setApplications(appsRes.data || []);

      // 4. Fetch User's Resumes for ATS Score & breakdown
      const resumeRes = await axiosClient.get('/resumes');
      const resumeData = resumeRes.data || [];
      if (Array.isArray(resumeData) && resumeData.length > 0) {
        setLatestResume(resumeData[0]);
      }
    } catch (err) {
      console.error('[Career Hub Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  // Handle Apply click -> automatically log application
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

  // Handle Application Status Update
  const handleStatusUpdate = async (appId, newStatus) => {
    try {
      await axiosClient.patch(`/applications/${appId}`, { status: newStatus });
      setApplications(
        applications.map((app) => (String(app._id || app.id) === String(appId) ? { ...app, status: newStatus } : app))
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered Job Recommendations
  const filteredJobs = jobs.filter((j) => {
    const matchesSearch =
      j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner Header */}
      <div className="bg-[#0F1E1B] text-[#FDFBF3] rounded-3xl p-6 sm:p-8 space-y-4 editorial-shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xl bg-[#F5D90A] text-[#0F1E1B] text-xs font-black">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Career Hub Module</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black font-serif-headline text-[#FDFBF3] tracking-tight">
              Job Match & Career Accelerator
            </h1>
            <p className="text-xs sm:text-sm text-[#FDFBF3]/80 max-w-2xl font-sans-body">
              Automated ATS Resume Scoring, AI Job Matching Engine, Custom Cover Letter Generation, Application Tracking, and Direct Mock Interview Practice.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => navigate('/cover-letter')}
              className="px-4 py-2.5 rounded-xl bg-[#F5D90A] text-[#0F1E1B] font-bold text-xs hover:bg-[#e0c609] transition-all flex items-center space-x-1.5 shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>Write Cover Letter</span>
            </button>

            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-[#FDFBF3]/10 text-[#FDFBF3] hover:bg-[#FDFBF3]/20 transition-all border border-[#FDFBF3]/20"
              title="Refresh Career Hub"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b-2 border-[#0F1E1B]/10 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border-2 shrink-0 ${
            activeTab === 'dashboard'
              ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B]'
              : 'border-transparent text-[#0F1E1B]/80 hover:bg-[#F5F2E6]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border-2 shrink-0 ${
            activeTab === 'jobs'
              ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B]'
              : 'border-transparent text-[#0F1E1B]/80 hover:bg-[#F5F2E6]'
          }`}
        >
          <Briefcase className="w-4 h-4 text-[#F5D90A]" />
          <span>Recommended Jobs ({jobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border-2 shrink-0 ${
            activeTab === 'applications'
              ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B]'
              : 'border-transparent text-[#0F1E1B]/80 hover:bg-[#F5F2E6]'
          }`}
        >
          <Send className="w-4 h-4 text-blue-400" />
          <span>Application Tracker ({applications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border-2 shrink-0 ${
            activeTab === 'saved'
              ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B]'
              : 'border-transparent text-[#0F1E1B]/80 hover:bg-[#F5F2E6]'
          }`}
        >
          <Bookmark className="w-4 h-4 text-amber-500 fill-current" />
          <span>Saved Jobs ({savedJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('resume')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border-2 shrink-0 ${
            activeTab === 'resume'
              ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B]'
              : 'border-transparent text-[#0F1E1B]/80 hover:bg-[#F5F2E6]'
          }`}
        >
          <FileText className="w-4 h-4 text-[#C1440E]" />
          <span>ATS Resume Breakdown</span>
        </button>
      </div>

      {/* Tab Content Display */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <Sparkles className="w-10 h-10 text-[#F5D90A] animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#0F1E1B]">Loading AI Career Hub intelligence...</p>
        </div>
      ) : (
        <div>
          
          {/* TAB 1: Career Dashboard */}
          {activeTab === 'dashboard' && (
            <CareerDashboard
              atsScore={typeof latestResume?.parsedData?.atsScore === 'number' ? latestResume.parsedData.atsScore : 82}
              jobsFoundCount={jobs.length}
              savedJobsCount={savedJobs.length}
              applications={applications}
              topSkills={latestResume?.parsedData?.skills || ['React', 'Node.js', 'TypeScript', 'MongoDB', 'AWS', 'Docker']}
            />
          )}

          {/* TAB 2: Recommended Jobs */}
          {activeTab === 'jobs' && (
            <div className="space-y-6">
              
              {/* Search bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FDFBF3] p-4 rounded-2xl border-2 border-[#0F1E1B]">
                <div className="relative w-full sm:w-96">
                  <Search className="w-4 h-4 text-[#0F1E1B]/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by job title, company, or skill..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#0F1E1B]/20 text-xs font-bold text-[#0F1E1B] bg-[#F5F2E6] focus:outline-none focus:border-[#0F1E1B]"
                  />
                </div>
                <span className="text-xs font-bold text-[#0F1E1B]/70">
                  Showing {filteredJobs.length} AI-Matched Positions
                </span>
              </div>

              {/* Job Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredJobs.map((job) => {
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
          )}

          {/* TAB 3: Application Tracker */}
          {activeTab === 'applications' && (
            <ApplicationTracker
              applications={applications}
              onStatusUpdate={handleStatusUpdate}
            />
          )}

          {/* TAB 4: Saved Jobs */}
          {activeTab === 'saved' && (
            <div className="space-y-6">
              {savedJobs.length === 0 ? (
                <div className="text-center py-16 bg-[#FDFBF3] rounded-2xl border-2 border-[#0F1E1B] p-6 space-y-3">
                  <Bookmark className="w-10 h-10 text-[#0F1E1B]/30 mx-auto" />
                  <h3 className="text-base font-bold font-serif-headline text-[#0F1E1B]">No Saved Jobs</h3>
                  <p className="text-xs text-[#0F1E1B]/70 max-w-sm mx-auto">
                    Click "Save Job" on any job card to bookmark positions for quick review and application.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {savedJobs.map((savedJob) => (
                    <JobCard
                      key={savedJob._id || savedJob.id}
                      job={savedJob}
                      isSaved={true}
                      onSaveToggle={handleSaveToggle}
                      onApply={handleApplyJob}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Resume ATS Breakdown */}
          {activeTab === 'resume' && (
            <ResumeAnalysisView resume={latestResume} />
          )}

        </div>
      )}

    </div>
  );
}
