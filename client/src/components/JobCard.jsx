import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  Briefcase, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Bookmark, 
  FileText, 
  PlayCircle,
  Lightbulb
} from 'lucide-react';

export default function JobCard({ 
  job, 
  isSaved = false, 
  isApplied = false,
  onSaveToggle, 
  onApply 
}) {
  const navigate = useNavigate();
  const [showSkillTips, setShowSkillTips] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [loggingApply, setLoggingApply] = useState(false);

  const handleSaveClick = async () => {
    if (saving) return;
    setSaving(true);
    if (onSaveToggle) {
      await onSaveToggle(job);
    }
    setSaving(false);
  };

  const handleOpenExternalSite = () => {
    if (job.applyUrl) {
      window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
      if (!isApplied) {
        setShowApplyConfirm(true);
      }
    } else {
      setShowApplyConfirm(true);
    }
  };

  const handleConfirmApplication = async () => {
    if (loggingApply) return;
    setLoggingApply(true);
    if (onApply) {
      await onApply(job);
    }
    setLoggingApply(false);
    setShowApplyConfirm(false);
  };

  const handleStartInterview = () => {
    navigate('/new-session', {
      state: {
        targetRole: job.title,
        focusTopic: job.title,
      },
    });
  };

  const handleGenerateCoverLetter = () => {
    navigate('/cover-letter', {
      state: {
        company: job.company,
        role: job.title,
        jobDescription: job.description,
      },
    });
  };

  // Color coding based on Match %
  const matchColor = 
    job.matchPercentage >= 85 
      ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' 
      : job.matchPercentage >= 70 
      ? 'bg-amber-500/10 text-amber-800 border-amber-500/30' 
      : 'bg-[#C1440E]/10 text-[#C1440E] border-[#C1440E]/30';

  return (
    <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between relative overflow-hidden group">
      
      {/* Top Header Row */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3 sm:space-x-3.5 min-w-0 flex-1">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#0F1E1B]/5 border border-[#0F1E1B]/15 overflow-hidden flex items-center justify-center shrink-0">
              {job.logo ? (
                <img src={job.logo} alt={job.company} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#0F1E1B]/70" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-[#C1440E] block truncate">
                {job.company}
              </span>
              <h3 className="text-base sm:text-lg font-bold font-serif-headline text-[#0F1E1B] leading-snug group-hover:text-[#C1440E] transition-colors break-words">
                {job.title}
              </h3>
            </div>
          </div>

          {/* Match % Badge */}
          <div className={`px-2.5 sm:px-3 py-1 rounded-xl border text-[11px] sm:text-xs font-black flex items-center space-x-1.5 shrink-0 ${matchColor}`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>{job.matchPercentage || 85}% Match</span>
          </div>
        </div>

        {/* Job Tags Row */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#0F1E1B]/80 pt-1">
          <span className="flex items-center space-x-1 bg-[#F5F2E6] px-2.5 py-1 rounded-lg border border-[#0F1E1B]/10">
            <MapPin className="w-3.5 h-3.5 text-[#C1440E]" />
            <span>{job.location}</span>
          </span>
          <span className="flex items-center space-x-1 bg-[#F5F2E6] px-2.5 py-1 rounded-lg border border-[#0F1E1B]/10">
            <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
            <span>{job.salary || 'Competitive'}</span>
          </span>
          <span className="flex items-center space-x-1 bg-[#F5F2E6] px-2.5 py-1 rounded-lg border border-[#0F1E1B]/10">
            <Briefcase className="w-3.5 h-3.5 text-[#0F1E1B]" />
            <span>{job.jobType}</span>
          </span>
        </div>

        {/* Job Description Preview */}
        <p className="text-xs text-[#0F1E1B]/80 line-clamp-2 leading-relaxed font-sans-body">
          {job.description}
        </p>
      </div>

      {/* Skills Match Breakdown Section */}
      <div className="space-y-2.5 pt-2 border-t border-[#0F1E1B]/10">
        
        {/* Matched Skills */}
        {job.matchedSkills && job.matchedSkills.length > 0 && (
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Matched Skills ({job.matchedSkills.length})</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {job.matchedSkills.map((skill, i) => (
                <span key={i} className="text-[11px] font-bold bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  ✓ {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing Skills */}
        {job.missingSkills && job.missingSkills.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#C1440E] flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Missing Skills ({job.missingSkills.length})</span>
              </span>
              <button
                type="button"
                onClick={() => setShowSkillTips(!showSkillTips)}
                className="text-[10px] font-bold text-[#0F1E1B]/70 hover:text-[#C1440E] flex items-center space-x-1 underline"
              >
                <Lightbulb className="w-3 h-3 text-[#F5D90A]" />
                <span>{showSkillTips ? 'Hide AI Tips' : 'Improvement Tips'}</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {job.missingSkills.map((skill, i) => (
                <span key={i} className="text-[11px] font-bold bg-[#C1440E]/10 text-[#C1440E] border border-[#C1440E]/20 px-2 py-0.5 rounded-md">
                  + {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Skill Improvement Recommendations Accordion */}
        {showSkillTips && job.skillRecommendations && job.skillRecommendations.length > 0 && (
          <div className="bg-[#F5F2E6] border border-[#0F1E1B]/20 rounded-xl p-3 space-y-2 text-xs text-[#0F1E1B]">
            <p className="font-bold text-[#C1440E] flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Recommendations to Boost Match Score:</span>
            </p>
            <ul className="space-y-1.5 pl-2">
              {job.skillRecommendations.map((rec, idx) => (
                <li key={idx} className="text-[11px] leading-snug">
                  <span className="font-bold text-[#0F1E1B]">• {rec.skill}: </span>
                  <span className="text-[#0F1E1B]/80">{rec.recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Explicit Application Confirmation Drawer */}
      {showApplyConfirm && !isApplied && (
        <div className="bg-[#FAF8F0] border-2 border-emerald-600 rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-center space-x-1.5 font-bold text-emerald-950">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Did you submit your application on the employer portal?</span>
          </div>
          <p className="text-[11px] text-[#0F1E1B]/70 font-medium leading-tight">
            Confirming will record this opening in your verified Application Tracker.
          </p>
          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={handleConfirmApplication}
              disabled={loggingApply}
              className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loggingApply ? 'Recording...' : 'Yes, Log Application'}
            </button>
            <button
              type="button"
              onClick={() => setShowApplyConfirm(false)}
              className="px-2.5 py-1 text-xs font-bold text-[#0F1E1B]/70 hover:text-[#0F1E1B] cursor-pointer"
            >
              Not Yet
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons Grid */}
      <div className="pt-3 border-t border-[#0F1E1B]/10 grid grid-cols-1 xs:grid-cols-2 gap-2">
        {isApplied ? (
          <div className="px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-400 flex items-center justify-center space-x-1.5 shadow-xs min-h-[38px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Applied ✓</span>
          </div>
        ) : (
          <button
            onClick={handleOpenExternalSite}
            className="px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold bg-[#0F1E1B] text-[#FDFBF3] hover:bg-[#1A332E] transition-all flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer min-h-[38px]"
          >
            <span>Apply on Site</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#F5D90A]" />
          </button>
        )}

        <button
          onClick={handleStartInterview}
          className="px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold bg-[#F5D90A] text-[#0F1E1B] hover:bg-[#e0c609] border-2 border-[#0F1E1B] transition-all flex items-center justify-center space-x-1.5 font-sans-body min-h-[38px] cursor-pointer"
        >
          <PlayCircle className="w-3.5 h-3.5 text-[#0F1E1B]" />
          <span>Start Interview</span>
        </button>

        <button
          onClick={handleGenerateCoverLetter}
          className="px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold bg-[#F5F2E6] text-[#0F1E1B] hover:bg-[#E6E4DC] border border-[#0F1E1B]/20 transition-all flex items-center justify-center space-x-1.5 min-h-[38px] cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-[#C1440E]" />
          <span>AI Cover Letter</span>
        </button>

        <button
          onClick={handleSaveClick}
          disabled={saving}
          className={`px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 min-h-[38px] cursor-pointer ${
            isSaved
              ? 'bg-[#C1440E]/10 text-[#C1440E] border-[#C1440E]'
              : 'bg-[#F5F2E6] text-[#0F1E1B] border-[#0F1E1B]/20 hover:border-[#0F1E1B]'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
          <span>{isSaved ? 'Saved' : 'Save Job'}</span>
        </button>
      </div>

    </div>
  );
}
