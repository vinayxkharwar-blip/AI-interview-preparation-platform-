import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { AuthContext } from '../context/AuthContext';
import { 
  Briefcase, 
  Sparkles, 
  Bookmark, 
  Send, 
  FileText, 
  LayoutDashboard, 
  Search, 
  ArrowRight,
  RefreshCw,
  Target,
  ExternalLink,
  ChevronRight,
  FileCheck
} from 'lucide-react';

import JobCard from '../components/JobCard';
import ApplicationTracker from '../components/ApplicationTracker';
import CareerDashboard from '../components/CareerDashboard';
import ResumeAnalysisView from '../components/ResumeAnalysisView';

export default function CareerHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  // Check URL search query param (e.g. ?tab=applications)
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'dashboard';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [resumes, setResumes] = useState([]);
  const [activeResumeId, setActiveResumeId] = useState(() => {
    return localStorage.getItem('preppilot_active_resume_id') || '';
  });

  const [jobs, setJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const tabParam = new URLSearchParams(location.search).get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Fetch all initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch User's Resumes
      const resumeRes = await axiosClient.get('/resumes');
      const resumeData = Array.isArray(resumeRes.data) ? resumeRes.data : [];
      setResumes(resumeData);

      // Determine active resume
      let currentActiveId = activeResumeId;
      const foundStored = resumeData.find((r) => String(r._id) === String(currentActiveId));
      if (!foundStored && resumeData.length > 0) {
        currentActiveId = String(resumeData[0]._id);
        setActiveResumeId(currentActiveId);
        localStorage.setItem('preppilot_active_resume_id', currentActiveId);
      }

      const activeResumeDoc = resumeData.find((r) => String(r._id) === String(currentActiveId)) || resumeData[0];
      const manualRole = localStorage.getItem('preppilot_target_role') || user?.targetRole || '';
      const targetRoleToUse =
        manualRole ||
        activeResumeDoc?.parsedData?.targetRole ||
        '';

      // 2. Fetch Job Recommendations
      const jobsRes = await axiosClient.get('/jobs/recommendations', {
        params: {
          ...(targetRoleToUse ? { targetRole: targetRoleToUse } : {}),
          ...(currentActiveId ? { resumeId: currentActiveId } : {}),
        },
      });
      setJobs(Array.isArray(jobsRes.data) ? jobsRes.data : []);

      // 3. Fetch Saved Jobs
      const savedRes = await axiosClient.get('/jobs/saved');
      setSavedJobs(Array.isArray(savedRes.data) ? savedRes.data : []);

      // 4. Fetch Applications
      const appsRes = await axiosClient.get('/applications');
      setApplications(Array.isArray(appsRes.data) ? appsRes.data : []);
    } catch (err) {
      console.error('[Career Hub Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeResumeId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleResumeSwitch = (newResumeId) => {
    setActiveResumeId(String(newResumeId));
    localStorage.setItem('preppilot_active_resume_id', String(newResumeId));
    const selected = resumes.find((r) => String(r._id) === String(newResumeId));
    if (selected?.parsedData?.targetRole) {
      localStorage.setItem('preppilot_target_role', selected.parsedData.targetRole);
    }
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

        if (res.data?.savedJob) {
          setSavedJobs([res.data.savedJob, ...savedJobs]);
        }
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

      if (res.data?.application) {
        setApplications([res.data.application, ...applications]);
      }
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

  const activeResume =
    resumes.find((r) => String(r._id) === String(activeResumeId)) || (resumes.length > 0 ? resumes[0] : null);

  const activeTargetRole =
    activeResume?.parsedData?.targetRole ||
    localStorage.getItem('preppilot_target_role') ||
    user?.targetRole ||
    'Full Stack Engineer';

  // Filtered Job Recommendations
  const filteredJobs = jobs.filter((j) => {
    const matchesSearch =
      j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.skills && j.skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase())));
    return matchesSearch;
  });

  const topThreeJobs = jobs.slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* ================= 1. COMPACT HEADER ================= */}
      <div className="bg-[#FDFBF3] rounded-2xl border-2 border-[#10221D] editorial-shadow-sm p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#10221D] text-[#FFC400] flex items-center justify-center font-bold shadow-xs">
              <Briefcase className="w-4 h-4" />
            </div>
            <h1 className="font-serif-headline text-2xl sm:text-3xl font-black text-[#10221D]">
              Your AI Career Hub
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#10221D]/70 font-medium">
            Discover opportunities and manage your career journey.
          </p>
        </div>

        {/* Primary and Secondary Action Buttons */}
        <div className="flex items-center space-x-2.5 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            className="px-3.5 py-2 rounded-xl bg-[#10221D] hover:bg-[#1A332E] text-[#FAF8F0] font-bold text-xs border border-[#10221D] transition-colors flex items-center space-x-1.5 shadow-xs"
          >
            <Target className="w-3.5 h-3.5 text-[#FFC400]" />
            <span>Explore Matched Jobs</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/cover-letter')}
            className="px-3.5 py-2 rounded-xl bg-[#FAF8F0] hover:bg-[#F5F2E6] text-[#10221D] font-bold text-xs border border-[#10221D]/30 transition-colors flex items-center space-x-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-[#F47721]" />
            <span>Generate Cover Letter</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-[#FAF8F0] hover:bg-[#F5F2E6] text-[#10221D] border border-[#10221D]/30 transition-colors"
            title="Refresh Career Hub data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ================= 2. ACTIVE RESUME SELECTOR BAR ================= */}
      <div className="bg-[#FAF8F0] rounded-xl border border-[#10221D]/20 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <FileCheck className="w-4 h-4 text-[#F47721] shrink-0" />
          <span className="font-bold text-[#10221D]">Active Baseline Resume:</span>
          {activeResume ? (
            <span className="font-medium text-[#10221D]/80 truncate max-w-[200px] sm:max-w-xs">
              <strong>{activeResume.fileName}</strong> (Role: {activeTargetRole})
            </span>
          ) : (
            <span className="text-[#10221D]/60 italic">No resume uploaded.</span>
          )}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {resumes.length > 1 && (
            <select
              value={activeResumeId}
              onChange={(e) => handleResumeSwitch(e.target.value)}
              className="px-2.5 py-1 bg-white border border-[#10221D]/30 rounded-lg text-xs font-bold text-[#10221D] focus:outline-hidden cursor-pointer"
            >
              {resumes.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.fileName}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => navigate('/resumes')}
            className="text-xs font-bold text-[#F47721] hover:underline"
          >
            Manage Resumes →
          </button>
        </div>
      </div>

      {/* ================= 3. INTERNAL CAREER HUB NAVIGATION ================= */}
      <div className="flex items-center space-x-2 border-b-2 border-[#10221D]/10 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border shrink-0 ${
            activeTab === 'dashboard'
              ? 'bg-[#10221D] text-[#FAF8F0] border-[#10221D] shadow-xs'
              : 'border-transparent text-[#10221D]/75 hover:bg-[#FAF8F0]'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('jobs')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border shrink-0 ${
            activeTab === 'jobs'
              ? 'bg-[#10221D] text-[#FAF8F0] border-[#10221D] shadow-xs'
              : 'border-transparent text-[#10221D]/75 hover:bg-[#FAF8F0]'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5 text-[#FFC400]" />
          <span>Recommended Jobs ({jobs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border shrink-0 ${
            activeTab === 'applications'
              ? 'bg-[#10221D] text-[#FAF8F0] border-[#10221D] shadow-xs'
              : 'border-transparent text-[#10221D]/75 hover:bg-[#FAF8F0]'
          }`}
        >
          <Send className="w-3.5 h-3.5 text-blue-500" />
          <span>Application Tracker ({applications.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border shrink-0 ${
            activeTab === 'saved'
              ? 'bg-[#10221D] text-[#FAF8F0] border-[#10221D] shadow-xs'
              : 'border-transparent text-[#10221D]/75 hover:bg-[#FAF8F0]'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 text-amber-600 fill-current" />
          <span>Saved Jobs ({savedJobs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('resume')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border shrink-0 ${
            activeTab === 'resume'
              ? 'bg-[#10221D] text-[#FAF8F0] border-[#10221D] shadow-xs'
              : 'border-transparent text-[#10221D]/75 hover:bg-[#FAF8F0]'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-[#F47721]" />
          <span>ATS Resume Breakdown</span>
        </button>
      </div>

      {/* ================= 4. TAB CONTENT ================= */}
      {loading ? (
        <div className="py-20 text-center space-y-2">
          <RefreshCw className="w-8 h-8 text-[#F47721] animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#10221D]/70">Loading Career Hub intelligence...</p>
        </div>
      ) : (
        <div>
          {/* TAB 1: Dashboard Overview */}
          {activeTab === 'dashboard' && (
            <CareerDashboard
              atsScore={typeof activeResume?.parsedData?.atsScore === 'number' ? activeResume.parsedData.atsScore : null}
              jobsFoundCount={jobs.length}
              savedJobsCount={savedJobs.length}
              applications={applications}
              topSkills={activeResume?.parsedData?.skills || []}
              targetRole={activeTargetRole}
              topRecommendedJobs={topThreeJobs}
              onNavigateTab={setActiveTab}
              onSaveToggle={handleSaveToggle}
              onApplyJob={handleApplyJob}
              savedJobs={savedJobs}
            />
          )}

          {/* TAB 2: Recommended Jobs Full View */}
          {activeTab === 'jobs' && (
            <div className="space-y-4">
              {/* Search Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FDFBF3] p-3.5 rounded-xl border-2 border-[#10221D] editorial-shadow-sm">
                <div className="relative w-full sm:w-80">
                  <Search className="w-3.5 h-3.5 text-[#10221D]/50 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by role, company, or keyword..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#10221D]/20 text-xs font-medium text-[#10221D] bg-[#FAF8F0] focus:outline-hidden focus:border-[#10221D]"
                  />
                </div>
                <span className="text-xs font-bold text-[#10221D]/70">
                  Showing {filteredJobs.length} Matched Openings
                </span>
              </div>

              {filteredJobs.length === 0 ? (
                <div className="text-center py-16 bg-[#FDFBF3] rounded-2xl border-2 border-[#10221D] p-6 space-y-2">
                  <Briefcase className="w-8 h-8 text-[#10221D]/30 mx-auto" />
                  <h3 className="font-serif-headline text-base font-bold text-[#10221D]">No Jobs Matched</h3>
                  <p className="text-xs text-[#10221D]/60 max-w-sm mx-auto">
                    Try refining your search keyword or updating your target engineering role.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredJobs.map((job) => {
                    const isSaved = savedJobs.some((sj) => sj.jobId === job.id || sj.jobId === job.jobId);
                    const isApplied = applications.some((app) => app.jobId === job.id || app.jobId === job.jobId);
                    return (
                      <JobCard
                        key={job.id || job.jobId}
                        job={job}
                        isSaved={isSaved}
                        isApplied={isApplied}
                        onSaveToggle={handleSaveToggle}
                        onApply={handleApplyJob}
                      />
                    );
                  })}
                </div>
              )}
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
            <div className="space-y-4">
              {savedJobs.length === 0 ? (
                <div className="text-center py-16 bg-[#FDFBF3] rounded-2xl border-2 border-[#10221D] p-6 space-y-2">
                  <Bookmark className="w-8 h-8 text-[#10221D]/30 mx-auto" />
                  <h3 className="font-serif-headline text-base font-bold text-[#10221D]">No Saved Jobs</h3>
                  <p className="text-xs text-[#10221D]/60 max-w-sm mx-auto">
                    Bookmark interesting job positions to review and apply to later.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedJobs.map((savedJob) => {
                    const isApplied = applications.some(
                      (app) => app.jobId === (savedJob.jobId || savedJob.id)
                    );
                    return (
                      <JobCard
                        key={savedJob._id || savedJob.id}
                        job={savedJob}
                        isSaved={true}
                        isApplied={isApplied}
                        onSaveToggle={handleSaveToggle}
                        onApply={handleApplyJob}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Resume ATS Breakdown */}
          {activeTab === 'resume' && (
            <div className="space-y-4">
              <ResumeAnalysisView resume={activeResume} />
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/resumes')}
                  className="text-xs font-bold text-[#F47721] hover:underline"
                >
                  Go to Resume Studio to upload a new resume or manage documents →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
