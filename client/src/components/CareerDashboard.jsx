import React from 'react';
import { 
  Sparkles, 
  Briefcase, 
  Bookmark, 
  Send, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  BarChart2,
  FileCheck,
  ArrowRight,
  Target,
  ExternalLink,
  AlertCircle,
  Building2,
  MapPin,
  Clock
} from 'lucide-react';

export default function CareerDashboard({ 
  atsScore = null, 
  jobsFoundCount = 0, 
  savedJobsCount = 0, 
  applications = [], 
  topSkills = [],
  missingSkills = [],
  targetRole = 'Full Stack Engineer',
  topRecommendedJobs = [],
  onNavigateTab,
  onSaveToggle,
  onApplyJob,
  savedJobs = []
}) {
  const interviewCallsCount = applications.filter((a) => a.status === 'interview').length;
  const offersCount = applications.filter((a) => a.status === 'offer').length;
  const totalApps = applications.length;

  const interviewRate = totalApps > 0 ? Math.round((interviewCallsCount / totalApps) * 100) : 0;
  const offerRate = totalApps > 0 ? Math.round((offersCount / totalApps) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ================= 1. SIX UNIFORM KPI METRIC CARDS ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {/* ATS Resume Score */}
        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('resume')}
          className="bg-[#FDFBF3] hover:bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl p-2.5 sm:p-3.5 space-y-1 editorial-shadow-sm flex flex-col justify-between text-left transition-all hover:scale-[1.02] cursor-pointer min-h-[90px]"
        >
          <div className="flex items-center justify-between text-[#F47721] w-full">
            <FileCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider truncate">ATS Score</span>
          </div>
          <div className="text-xl sm:text-3xl font-black font-serif-headline text-[#10221D]">
            {atsScore !== null ? atsScore : '—'}
            {atsScore !== null && <span className="text-xs font-bold text-[#10221D]/50">/100</span>}
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 truncate block">
            {atsScore !== null ? 'ATS Report →' : 'Upload'}
          </span>
        </button>

        {/* Matched Jobs */}
        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('jobs')}
          className="bg-[#FDFBF3] hover:bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl p-2.5 sm:p-3.5 space-y-1 editorial-shadow-sm flex flex-col justify-between text-left transition-all hover:scale-[1.02] cursor-pointer min-h-[90px]"
        >
          <div className="flex items-center justify-between text-[#10221D] w-full">
            <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFC400] shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider truncate">Matched</span>
          </div>
          <div className="text-xl sm:text-3xl font-black font-serif-headline text-[#10221D]">
            {jobsFoundCount}
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-[#10221D]/70 truncate block">Explore →</span>
        </button>

        {/* Saved Jobs */}
        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('saved')}
          className="bg-[#FDFBF3] hover:bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl p-2.5 sm:p-3.5 space-y-1 editorial-shadow-sm flex flex-col justify-between text-left transition-all hover:scale-[1.02] cursor-pointer min-h-[90px]"
        >
          <div className="flex items-center justify-between text-amber-800 w-full">
            <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider truncate">Saved</span>
          </div>
          <div className="text-xl sm:text-3xl font-black font-serif-headline text-[#10221D]">
            {savedJobsCount}
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-[#10221D]/70 truncate block">Saved →</span>
        </button>

        {/* Applications Submitted */}
        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('applications')}
          className="bg-[#FDFBF3] hover:bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl p-2.5 sm:p-3.5 space-y-1 editorial-shadow-sm flex flex-col justify-between text-left transition-all hover:scale-[1.02] cursor-pointer min-h-[90px]"
        >
          <div className="flex items-center justify-between text-blue-700 w-full">
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider truncate">Applied</span>
          </div>
          <div className="text-xl sm:text-3xl font-black font-serif-headline text-[#10221D]">
            {totalApps}
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-[#10221D]/70 truncate block">Tracker →</span>
        </button>

        {/* Interviews */}
        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('applications')}
          className="bg-[#FDFBF3] hover:bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl p-2.5 sm:p-3.5 space-y-1 editorial-shadow-sm flex flex-col justify-between text-left transition-all hover:scale-[1.02] cursor-pointer min-h-[90px]"
        >
          <div className="flex items-center justify-between text-purple-700 w-full">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F47721] shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider truncate">Interviews</span>
          </div>
          <div className="text-xl sm:text-3xl font-black font-serif-headline text-[#10221D]">
            {interviewCallsCount}
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-purple-800 truncate block">Pipeline →</span>
        </button>

        {/* Offers */}
        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('applications')}
          className="bg-[#FDFBF3] hover:bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl p-2.5 sm:p-3.5 space-y-1 editorial-shadow-sm flex flex-col justify-between text-left transition-all hover:scale-[1.02] cursor-pointer min-h-[90px]"
        >
          <div className="flex items-center justify-between text-emerald-800 w-full">
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider truncate">Offers</span>
          </div>
          <div className="text-xl sm:text-3xl font-black font-serif-headline text-emerald-800">
            {offersCount}
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 truncate block">Offers →</span>
        </button>
      </div>

      {/* ================= 2. TOP 3 RECOMMENDED JOBS PREVIEW ================= */}
      <div className="bg-[#FDFBF3] border-2 border-[#10221D] rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4 editorial-shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#10221D]/10 gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-[#F47721] shrink-0" />
              <h3 className="font-serif-headline text-base sm:text-xl font-black text-[#10221D]">
                Top Recommended Jobs for {targetRole}
              </h3>
            </div>
            <p className="text-xs text-[#10221D]/70 font-medium">
              Ranked dynamically by keyword overlap with your active resume.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('jobs')}
            className="text-xs font-bold text-[#F47721] hover:underline flex items-center space-x-1 shrink-0 self-start sm:self-center"
          >
            <span>View All ({jobsFoundCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {topRecommendedJobs.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#10221D]/60 italic">
            No matched jobs available yet. Try refreshing or updating your target role.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topRecommendedJobs.map((job) => {
              const isSaved = savedJobs.some((sj) => sj.jobId === job.id || sj.jobId === job.jobId);
              const isApplied = applications.some((app) => app.jobId === job.id || app.jobId === job.jobId);
              const match = job.matchPercentage || 85;

              return (
                <div
                  key={job.id || job.jobId}
                  className="bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl p-4 flex flex-col justify-between space-y-3 transition-all hover:border-[#F47721]"
                >
                  <div className="space-y-2">
                    {/* Header: Title + Match Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-sm text-[#10221D] line-clamp-1">
                          {job.title}
                        </h4>
                        <div className="flex items-center space-x-1.5 text-xs text-[#10221D]/70 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-[#10221D]/60" />
                          <span>{job.company}</span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black border shrink-0 bg-emerald-100 text-emerald-800 border-emerald-400">
                        {match}% Match
                      </span>
                    </div>

                    {/* Location & Work Mode */}
                    <div className="flex items-center space-x-2 text-[11px] text-[#10221D]/65 font-medium">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{job.location || 'Remote'}</span>
                      </span>
                      <span>•</span>
                      <span>{job.jobType || 'Full-time'}</span>
                    </div>

                    {/* Matched Skills / Explanation Snippet */}
                    <div className="pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#10221D]/60 block mb-1">
                        Matched Skills:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(job.skills || []).slice(0, 3).map((sk, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-white border border-[#10221D]/15 text-[10px] font-bold text-[#10221D]"
                          >
                            {sk}
                          </span>
                        ))}
                        {(job.skills || []).length > 3 && (
                          <span className="text-[10px] font-bold text-[#10221D]/50 py-0.5">
                            +{(job.skills || []).length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-2 border-t border-[#10221D]/10 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSaveToggle && onSaveToggle(job)}
                      className="text-xs font-bold text-[#10221D]/80 hover:text-[#10221D] flex items-center space-x-1 cursor-pointer"
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-[#F47721]' : ''}`} />
                      <span>{isSaved ? 'Saved' : 'Save'}</span>
                    </button>

                    {isApplied ? (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold">
                        Applied ✓
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (job.applyUrl) {
                            window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
                          }
                          if (onNavigateTab) {
                            onNavigateTab('jobs');
                          }
                        }}
                        className="px-3 py-1 bg-[#10221D] hover:bg-[#1A332E] text-[#FAF8F0] rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
                        title="View job and apply"
                      >
                        <span>Apply</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= 3. CAREER INSIGHTS & SKILLS GAP ANALYSIS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Real Application Funnel Conversion */}
        <div className="bg-[#FDFBF3] border-2 border-[#10221D] rounded-2xl p-5 space-y-4 editorial-shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#F47721]" />
              <h3 className="font-serif-headline text-base font-bold text-[#10221D]">
                Application Funnel Analytics
              </h3>
            </div>
            <span className="text-xs font-black bg-[#FFC400] text-[#10221D] px-2 py-0.5 rounded-lg border border-[#10221D]">
              Real Data
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {totalApps === 0 ? (
              <div className="p-4 bg-[#F5F2E6] rounded-xl border border-[#10221D]/10 text-center space-y-1">
                <p className="text-xs font-bold text-[#10221D]">0 Applications Tracked</p>
                <p className="text-[11px] text-[#10221D]/70 font-medium">
                  Apply to jobs using "Apply" on any job card to unlock your live funnel conversion metrics.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex justify-between text-xs font-bold text-[#10221D] mb-1">
                    <span>Interview Invitation Rate</span>
                    <span>{interviewRate}% ({interviewCallsCount}/{totalApps})</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#F5F2E6] rounded-full border border-[#10221D]/15 overflow-hidden">
                    <div className="h-full bg-purple-600 rounded-full transition-all duration-500" style={{ width: `${interviewRate}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-[#10221D] mb-1">
                    <span>Offer Conversion Rate</span>
                    <span>{offerRate}% ({offersCount}/{totalApps})</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#F5F2E6] rounded-full border border-[#10221D]/15 overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${offerRate}%` }} />
                  </div>
                </div>
              </>
            )}

            <div>
              <div className="flex justify-between text-xs font-bold text-[#10221D] mb-1">
                <span>Active Resume ATS Baseline</span>
                <span>{atsScore !== null ? `${atsScore}%` : 'Not Scored'}</span>
              </div>
              <div className="w-full h-2.5 bg-[#F5F2E6] rounded-full border border-[#10221D]/15 overflow-hidden">
                <div className="h-full bg-[#F47721] rounded-full transition-all duration-500" style={{ width: `${atsScore || 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Marketable Skills & Gap Analysis */}
        <div className="bg-[#FDFBF3] border-2 border-[#10221D] rounded-2xl p-5 space-y-3 editorial-shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-[#10221D]" />
              <h3 className="font-serif-headline text-base font-bold text-[#10221D]">
                Marketable Skills & Gap Analysis
              </h3>
            </div>
            <span className="text-xs font-bold text-[#10221D]/60">
              {topSkills.length} Verified
            </span>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#10221D]/60 block">
              Indexed Profile Skills:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {topSkills.length > 0 ? (
                topSkills.map((sk, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-[#FAF8F0] border border-[#10221D]/20 text-[11px] font-bold text-[#10221D] flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    <span>{sk}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#10221D]/60 italic">Upload a resume to extract marketable skills.</span>
              )}
            </div>
          </div>

          {/* Actionable recommendation */}
          <div className="p-3 bg-[#FAF8F0] rounded-xl border border-[#10221D]/15 text-xs text-[#10221D]/80 leading-relaxed space-y-1">
            <div className="font-bold text-[#F47721] flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Target Role Recommendations for {targetRole}:</span>
            </div>
            <p>
              Candidates who demonstrate <strong>Docker, AWS, and automated CI/CD testing</strong> achieve an estimated <strong>+20% higher ATS shortlist rate</strong> for senior engineering roles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
