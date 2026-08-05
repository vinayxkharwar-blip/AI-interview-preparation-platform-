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
  FileCheck
} from 'lucide-react';

export default function CareerDashboard({ 
  atsScore = 88, 
  jobsFoundCount = 6, 
  savedJobsCount = 0, 
  applications = [], 
  topSkills = ['React', 'Node.js', 'TypeScript', 'MongoDB', 'AWS', 'Docker'] 
}) {
  const interviewCallsCount = applications.filter((a) => a.status === 'interview').length;
  const offersCount = applications.filter((a) => a.status === 'offer').length;
  const totalApps = applications.length;

  const avgMatch = 89;

  return (
    <div className="space-y-6">
      
      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* ATS Resume Score Card */}
        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-4 space-y-1 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#C1440E]">
            <FileCheck className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-wider">ATS Score</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-serif-headline text-[#0F1E1B]">
            {atsScore}<span className="text-sm font-bold text-[#0F1E1B]/60">/100</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-700">High Match Quality</span>
        </div>

        {/* Jobs Found Card */}
        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-4 space-y-1 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#0F1E1B]">
            <Briefcase className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-wider">Jobs Found</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-serif-headline text-[#0F1E1B]">
            {jobsFoundCount}
          </div>
          <span className="text-[10px] font-bold text-[#0F1E1B]/70">Matched to Profile</span>
        </div>

        {/* Jobs Saved Card */}
        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-4 space-y-1 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-800">
            <Bookmark className="w-4 h-4 fill-current" />
            <span className="text-[10px] font-black uppercase tracking-wider">Saved</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-serif-headline text-[#0F1E1B]">
            {savedJobsCount}
          </div>
          <span className="text-[10px] font-bold text-[#0F1E1B]/70">Bookmarked</span>
        </div>

        {/* Applications Card */}
        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-4 space-y-1 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-700">
            <Send className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-wider">Applied</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-serif-headline text-[#0F1E1B]">
            {totalApps}
          </div>
          <span className="text-[10px] font-bold text-[#0F1E1B]/70">Total Submissions</span>
        </div>

        {/* Interview Calls Card */}
        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-4 space-y-1 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-700">
            <Sparkles className="w-4 h-4 text-[#F5D90A]" />
            <span className="text-[10px] font-black uppercase tracking-wider">Interviews</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-serif-headline text-[#0F1E1B]">
            {interviewCallsCount}
          </div>
          <span className="text-[10px] font-bold text-purple-700">Active Pipeline</span>
        </div>

        {/* Offers Card */}
        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-4 space-y-1 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700">
            <Award className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-wider">Offers</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-serif-headline text-emerald-800">
            {offersCount}
          </div>
          <span className="text-[10px] font-bold text-emerald-700 font-sans-body">Job Offers</span>
        </div>

      </div>

      {/* Analytics & Performance Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Application Velocity & Success Chart Card */}
        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-[#C1440E]" />
              <h3 className="text-base font-bold font-serif-headline text-[#0F1E1B]">
                Application Funnel & Match Rate
              </h3>
            </div>
            <span className="text-xs font-black bg-[#F5D90A] text-[#0F1E1B] px-2.5 py-0.5 rounded-lg border border-[#0F1E1B]">
              Avg {avgMatch}% Match
            </span>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-bold text-[#0F1E1B] mb-1">
                <span>Profile Target Match</span>
                <span>{avgMatch}%</span>
              </div>
              <div className="w-full h-3 bg-[#F5F2E6] rounded-full border border-[#0F1E1B]/20 overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${avgMatch}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-[#0F1E1B] mb-1">
                <span>Interview Conversion Rate</span>
                <span>{totalApps > 0 ? Math.round((interviewCallsCount / totalApps) * 100) : 0}%</span>
              </div>
              <div className="w-full h-3 bg-[#F5F2E6] rounded-full border border-[#0F1E1B]/20 overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: `${totalApps > 0 ? (interviewCallsCount / totalApps) * 100 : 25}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-[#0F1E1B] mb-1">
                <span>ATS Resume Quality</span>
                <span>{atsScore}%</span>
              </div>
              <div className="w-full h-3 bg-[#F5F2E6] rounded-full border border-[#0F1E1B]/20 overflow-hidden">
                <div className="h-full bg-[#C1440E] rounded-full" style={{ width: `${atsScore}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Extracted Candidate Skills */}
        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-5 space-y-4">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-5 h-5 text-[#0F1E1B]" />
            <h3 className="text-base font-bold font-serif-headline text-[#0F1E1B]">
              Top Marketable Skills
            </h3>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {topSkills.map((skill, idx) => (
              <div
                key={idx}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#F5F2E6] border-2 border-[#0F1E1B] text-xs font-extrabold text-[#0F1E1B]"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>{skill}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#0F1E1B]/70 pt-2 border-t border-[#0F1E1B]/10 leading-relaxed">
            💡 <strong>AI Career Tip:</strong> Adding cloud orchestration (Docker, Kubernetes) to your resume increases high-tier fullstack job matches by up to <strong>+22%</strong>.
          </p>
        </div>

      </div>

    </div>
  );
}
