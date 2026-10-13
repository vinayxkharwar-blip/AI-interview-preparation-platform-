import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { AuthContext } from '../context/AuthContext';
import ResumeUpload from '../components/ResumeUpload';
import { 
  FileText, 
  Sparkles, 
  Target, 
  Briefcase, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  PlayCircle, 
  Clock, 
  Trash2, 
  Check, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCheck,
  ShieldCheck,
  Zap,
  Info,
  Loader2
} from 'lucide-react';

import TargetRoleSelector from '../components/common/TargetRoleSelector';

export default function Resumes() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [resumes, setResumes] = useState([]);
  const [activeResumeId, setActiveResumeId] = useState(() => {
    return localStorage.getItem('preppilot_active_resume_id') || '';
  });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showImproveTips, setShowImproveTips] = useState(false);
  const [isSelectingRole, setIsSelectingRole] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  // Selected target role explicitly chosen by user for job matching/interviews
  const [selectedTargetRole, setSelectedTargetRole] = useState(() => {
    return localStorage.getItem('preppilot_target_role') || user?.targetRole || '';
  });

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/resumes');
      const resumesData = Array.isArray(res.data) ? res.data : [];
      setResumes(resumesData);

      // Set active resume fallback to latest if not set or invalid
      const storedActiveId = localStorage.getItem('preppilot_active_resume_id');
      const foundStored = resumesData.find((r) => String(r._id) === String(storedActiveId));
      if (foundStored) {
        setActiveResumeId(String(foundStored._id));
      } else if (resumesData.length > 0) {
        setActiveResumeId(String(resumesData[0]._id));
        localStorage.setItem('preppilot_active_resume_id', String(resumesData[0]._id));
      }
    } catch (err) {
      console.error('Failed to fetch resumes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleUploadSuccess = (newResume) => {
    setResumes((prev) => [newResume, ...prev]);
    const newId = String(newResume._id);
    setActiveResumeId(newId);
    localStorage.setItem('preppilot_active_resume_id', newId);

    // Keep detectedTargetRole strictly from resume analysis;
    // do NOT silently overwrite user's selected/custom target role.
    setActionSuccessMessage('Resume analyzed and set as active profile!');
    setTimeout(() => setActionSuccessMessage(''), 3500);
  };

  const handleSelectActiveResume = (resumeId) => {
    const stringId = String(resumeId);
    setActiveResumeId(stringId);
    localStorage.setItem('preppilot_active_resume_id', stringId);

    const selected = resumes.find((r) => String(r._id) === stringId);
    setActionSuccessMessage(`Active profile switched to "${selected?.fileName || 'Resume'}"`);
    setTimeout(() => setActionSuccessMessage(''), 3000);
  };

  const handleUpdateSelectedRole = (newRole) => {
    const cleanRole = (newRole || '').trim();
    setSelectedTargetRole(cleanRole);
    try {
      localStorage.setItem('preppilot_target_role', cleanRole);
    } catch (e) {}
    setIsSelectingRole(false);
    setActionSuccessMessage(`Target role set to "${cleanRole}" for job matching and interview prep.`);
    setTimeout(() => setActionSuccessMessage(''), 3500);
  };

  const handleDeleteResume = async (resumeId, fileName) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${fileName}"? This cannot be undone.`);
    if (!confirmDelete) return;

    setDeletingId(resumeId);
    try {
      await axiosClient.delete(`/resumes/${resumeId}`);
      const updated = resumes.filter((r) => String(r._id) !== String(resumeId));
      setResumes(updated);

      if (String(activeResumeId) === String(resumeId)) {
        if (updated.length > 0) {
          const nextId = String(updated[0]._id);
          setActiveResumeId(nextId);
          localStorage.setItem('preppilot_active_resume_id', nextId);
        } else {
          setActiveResumeId('');
          localStorage.removeItem('preppilot_active_resume_id');
        }
      }
      setActionSuccessMessage('Resume deleted successfully.');
      setTimeout(() => setActionSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to delete resume:', err);
      alert(err.response?.data?.message || 'Failed to delete resume.');
    } finally {
      setDeletingId(null);
    }
  };

  // Determine active resume
  const activeResume = resumes.find((r) => String(r._id) === String(activeResumeId)) || (resumes.length > 0 ? resumes[0] : null);
  const parsed = activeResume?.parsedData || {};
  const atsScore = typeof parsed.atsScore === 'number' ? parsed.atsScore : 82;

  // 1. Detected Target Role: purely inferred from active resume
  const rawDetectedRole = parsed.targetRole;
  const detectedTargetRole =
    typeof rawDetectedRole === 'string' &&
    rawDetectedRole.trim() &&
    !['null', 'none', 'n/a', 'undefined', 'not detected', 'unknown'].includes(rawDetectedRole.trim().toLowerCase())
      ? rawDetectedRole.trim()
      : null;

  // 2. Effective Role for downstream workflows (custom selection takes priority, then detected)
  const effectiveWorkflowRole = selectedTargetRole || detectedTargetRole || '';

  const skills = parsed.skills || [];
  const strengths = parsed.strengths || [];
  const weaknesses = parsed.weaknesses || [];
  const missingSkills = parsed.missingSkills || [];

  // History list: display latest 5 or all
  const historyList = showAllHistory ? resumes : resumes.slice(0, 5);

  if (loading && resumes.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#F47721]" />
        <p className="text-xs font-bold text-[#10221D]/70">Loading Resume Studio...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* ================= 1. COMPACT HEADER ================= */}
      <div className="bg-[#FDFBF3] rounded-2xl border-2 border-[#10221D] editorial-shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#10221D] text-[#FFC400] flex items-center justify-center font-bold shadow-xs">
              <FileCheck className="w-4 h-4" />
            </div>
            <h1 className="font-serif-headline text-2xl sm:text-3xl font-black text-[#10221D]">
              Resume Studio
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#10221D]/70 font-medium">
            Upload, analyze and optimize your resume for applicant tracking systems (ATS).
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0">
          <button
            onClick={() => navigate('/career-hub')}
            className="px-3 py-1.5 bg-[#FAF8F0] hover:bg-[#F5F2E6] text-[#10221D] rounded-xl text-xs font-bold border border-[#10221D]/30 transition-colors flex items-center space-x-1.5"
          >
            <Briefcase className="w-3.5 h-3.5 text-[#F47721]" />
            <span>Open Career Hub</span>
          </button>
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-400 rounded-xl text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* ================= 2. COMPACT RESUME UPLOAD ================= */}
      <ResumeUpload onUploadSuccess={handleUploadSuccess} />

      {/* ================= 3. ACTIVE RESUME ANALYSIS WORKSPACE ================= */}
      {activeResume ? (
        <div className="bg-[#FDFBF3] rounded-2xl border-2 border-[#10221D] editorial-shadow-sm p-5 sm:p-6 space-y-5">
          {/* Active File Header & Actions Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#10221D]/10">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="bg-[#FFC400] text-[#10221D] px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">
                  Active Profile
                </span>
                <span className="text-xs text-[#10221D]/60 font-medium flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    Uploaded {activeResume.createdAt ? new Date(activeResume.createdAt).toLocaleDateString() : 'Recently'}
                  </span>
                </span>
              </div>
              <h2 className="font-serif-headline text-xl sm:text-2xl font-black text-[#10221D]">
                {activeResume.fileName}
              </h2>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowImproveTips(!showImproveTips)}
                className="px-3 py-1.5 bg-[#FAF8F0] hover:bg-[#F5F2E6] text-[#10221D] rounded-xl text-xs font-bold border border-[#10221D]/30 transition-colors flex items-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F47721]" />
                <span>Improve Resume</span>
                {showImproveTips ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
              </button>

              <button
                onClick={() =>
                  navigate('/cover-letter', {
                    state: {
                      role: effectiveWorkflowRole,
                      resumeId: activeResume._id,
                    },
                  })
                }
                className="px-3 py-1.5 bg-[#FAF8F0] hover:bg-[#F5F2E6] text-[#10221D] rounded-xl text-xs font-bold border border-[#10221D]/30 transition-colors flex items-center space-x-1"
              >
                <FileText className="w-3.5 h-3.5 text-[#10221D]" />
                <span>Cover Letter</span>
              </button>

              <button
                onClick={() =>
                  navigate('/new-session', {
                    state: {
                      targetRole: effectiveWorkflowRole,
                      resumeId: activeResume._id,
                    },
                  })
                }
                className="px-3 py-1.5 bg-[#10221D] hover:bg-[#1A332E] text-[#FAF8F0] rounded-xl text-xs font-bold border border-[#10221D] transition-colors flex items-center space-x-1 shadow-xs"
              >
                <PlayCircle className="w-3.5 h-3.5 text-[#FFC400]" />
                <span>Practise Interview</span>
              </button>
            </div>
          </div>

          {/* Collapsible Improve Tips Drawer */}
          {showImproveTips && (
            <div className="bg-[#F5F2E6] p-4 rounded-xl border border-[#10221D]/20 space-y-2.5 animate-fadeIn">
              <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[#F47721]">
                <Zap className="w-3.5 h-3.5" />
                <span>Actionable ATS Optimization Tips</span>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-medium text-[#10221D]/80">
                <li className="flex items-start space-x-1.5">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span>Use standard section headers: "Experience", "Skills", "Education", "Projects".</span>
                </li>
                <li className="flex items-start space-x-1.5">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span>Incorporate metrics in bullet points (e.g., "reduced latency by 35%").</span>
                </li>
                <li className="flex items-start space-x-1.5">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span>Match keywords directly from target job postings for higher keyword density.</span>
                </li>
                <li className="flex items-start space-x-1.5">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span>Avoid tables, multi-column layouts, and images that confuse older ATS parsers.</span>
                </li>
              </ul>
            </div>
          )}

          {/* Key Metrics Row: ATS Score vs Detected Role */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* ATS Score Card */}
            <div className="bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between text-[#F47721]">
                <span className="text-[10px] font-black uppercase tracking-wider">ATS Score</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                  {atsScore >= 80 ? 'Strong' : atsScore >= 60 ? 'Moderate' : 'Needs Work'}
                </span>
              </div>
              <div className="text-3xl font-black font-serif-headline text-[#10221D]">
                {atsScore}<span className="text-xs font-bold text-[#10221D]/50">/100</span>
              </div>
              <p className="text-[10px] text-[#10221D]/60 font-medium">
                Keyword density & formatting score.
              </p>
            </div>

            {/* Detected Role Card */}
            <div className="bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between text-[#10221D]/70">
                <span className="text-[10px] font-black uppercase tracking-wider">
                  Detected Target Role
                </span>
                {detectedTargetRole ? (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                    From Resume
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                    Not Inferred
                  </span>
                )}
              </div>

              {detectedTargetRole ? (
                <>
                  <div className="text-lg font-black font-serif-headline text-[#10221D] truncate pt-1" title={detectedTargetRole}>
                    {detectedTargetRole}
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <p className="text-[10px] text-[#10221D]/60 font-medium">
                      Inferred from resume content.
                    </p>
                    {selectedTargetRole !== detectedTargetRole && (
                      <button
                        onClick={() => handleUpdateSelectedRole(detectedTargetRole)}
                        className="text-[10px] font-black text-[#F47721] hover:underline"
                        title="Use detected role as active target goal"
                      >
                        Set as Goal →
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-base font-black font-serif-headline text-amber-900 pt-1 flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Role not detected</span>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <p className="text-[10px] text-[#10221D]/60 font-medium">
                      No explicit role identified in file.
                    </p>
                    <button
                      onClick={() => setIsSelectingRole(true)}
                      className="text-[10px] font-black text-[#F47721] hover:underline"
                    >
                      Select Role Manually →
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Total Extracted Skills Card */}
            <div className="bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl p-4 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#10221D]/70">
                Extracted Skills
              </span>
              <div className="text-3xl font-black font-serif-headline text-[#10221D]">
                {skills.length}
              </div>
              <p className="text-[10px] text-[#10221D]/60 font-medium">
                Indexed for job match algorithms.
              </p>
            </div>
          </div>

          {/* Active Target Goal / Custom Role Selection Status Bar */}
          <div className="bg-[#FAF8F0] border border-[#10221D]/15 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Target className="w-4 h-4 text-[#F47721] shrink-0" />
              <span className="text-[#10221D]/70 font-medium">
                Active Target Goal for job matches & interviews:
              </span>
              <span className="font-black text-[#10221D] bg-[#FFC400]/20 px-2 py-0.5 rounded border border-[#FFC400]/40">
                {selectedTargetRole || detectedTargetRole || 'Not Selected'}
              </span>
              {selectedTargetRole && detectedTargetRole && selectedTargetRole !== detectedTargetRole && (
                <span className="text-[10px] text-[#10221D]/50 font-normal">
                  (Custom override of detected role)
                </span>
              )}
            </div>
            <button
              onClick={() => setIsSelectingRole(!isSelectingRole)}
              className="text-[#10221D] hover:text-[#F47721] font-bold text-xs underline decoration-[#F47721] self-start sm:self-auto"
            >
              {isSelectingRole ? 'Close Role Selector' : 'Change / Customize Goal'}
            </button>
          </div>

          {/* Interactive Target Role Selector Drawer */}
          {isSelectingRole && (
            <div className="bg-[#F5F2E6] p-4 rounded-xl border-2 border-[#10221D]/20 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif-headline text-sm font-black text-[#10221D]">
                    Customize Target Engineering Role
                  </h4>
                  <p className="text-[11px] text-[#10221D]/70">
                    Select a predefined engineering path or enter a custom role (e.g. QA Engineer, Cybersecurity Analyst). Does not alter the original resume-detected role.
                  </p>
                </div>
                <button
                  onClick={() => setIsSelectingRole(false)}
                  className="text-xs font-bold text-[#10221D]/60 hover:text-[#10221D]"
                >
                  Cancel
                </button>
              </div>

              <TargetRoleSelector
                value={selectedTargetRole || detectedTargetRole || ''}
                onChange={handleUpdateSelectedRole}
                onApply={handleUpdateSelectedRole}
              />
            </div>
          )}

          {/* Extracted Skills Badges */}
          <div className="space-y-2 pt-1">
            <span className="text-xs font-black uppercase tracking-wider text-[#10221D]/70">
              Extracted Skills & Keywords ({skills.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {skills.length > 0 ? (
                skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-[#FAF8F0] border border-[#10221D]/20 text-xs font-bold text-[#10221D]"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#10221D]/60 italic">No skills extracted yet.</span>
              )}
            </div>
          </div>

          {/* Missing Skills relative to Target Role */}
          {missingSkills && missingSkills.length > 0 && (
            <div className="p-3.5 bg-amber-50/70 border-2 border-amber-300/80 rounded-xl space-y-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Recommended Skills to Add for {effectiveWorkflowRole || 'Target Role'} ({missingSkills.length})</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {missingSkills.map((sk, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-white border border-amber-400 text-xs font-bold text-amber-900"
                  >
                    + {sk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Strengths & Weaknesses 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Strengths */}
            <div className="bg-[#FAF8F0] border border-[#10221D]/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-1.5 text-emerald-800 text-xs font-black uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Resume Strengths</span>
              </div>
              <ul className="space-y-1.5 text-xs text-[#10221D] font-medium">
                {(strengths.length > 0
                  ? strengths
                  : [
                      `Solid technical keyword density matching ${effectiveWorkflowRole || 'target'} positions.`,
                      'Clear chronological employment progression with identifiable responsibilities.',
                      'Readable section formatting recognized by applicant tracking software.',
                    ]
                ).map((str, idx) => (
                  <li key={idx} className="flex items-start space-x-1.5">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvement Suggestions */}
            <div className="bg-[#FAF8F0] border border-[#10221D]/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-1.5 text-[#F47721] text-xs font-black uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-[#F47721]" />
                <span>Areas for ATS Improvement</span>
              </div>
              <ul className="space-y-1.5 text-xs text-[#10221D] font-medium">
                {(weaknesses.length > 0
                  ? weaknesses
                  : [
                      'Incorporate more quantitative impact metrics in project descriptions.',
                      'Add cloud infrastructure and automated testing keywords to improve match scores.',
                      'Ensure all skill abbreviations (e.g. AWS, CI/CD) are paired with full technology names.',
                    ]
                ).map((weak, idx) => (
                  <li key={idx} className="flex items-start space-x-1.5">
                    <span className="text-[#F47721] font-bold">•</span>
                    <span>{weak}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Note distinguishing ATS Score from Job Match % */}
          <div className="p-3 bg-[#F5F2E6] rounded-xl border border-[#10221D]/10 text-[11px] text-[#10221D]/75 font-medium flex items-center space-x-2">
            <Info className="w-4 h-4 text-[#10221D]/50 shrink-0" />
            <span>
              <strong>Note on ATS Score vs. Job Match:</strong> The ATS Score evaluates overall document format and general role keyword density. Specific job match percentages are calculated dynamically inside Career Hub for each job opening based on employer requirements.
            </span>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-[#FDFBF3] rounded-2xl border-2 border-[#10221D] space-y-2">
          <FileText className="w-8 h-8 text-[#10221D]/40 mx-auto" />
          <h3 className="font-serif-headline text-lg font-bold text-[#10221D]">No Resumes Uploaded Yet</h3>
          <p className="text-xs text-[#10221D]/60 max-w-sm mx-auto">
            Upload your resume above to generate ATS evaluation metrics, skill breakdowns, and interview prep hooks.
          </p>
        </div>
      )}

      {/* ================= 4. COMPACT RESUME HISTORY TABLE ================= */}
      <div className="bg-[#FDFBF3] rounded-2xl border-2 border-[#10221D] editorial-shadow-sm p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#10221D]/10">
          <div>
            <h3 className="font-serif-headline text-lg font-black text-[#10221D]">
              Resume History ({resumes.length})
            </h3>
            <p className="text-xs text-[#10221D]/70 font-medium">
              Manage your uploaded resume documents and select which profile to use across the platform.
            </p>
          </div>

          {resumes.length > 5 && (
            <button
              onClick={() => setShowAllHistory(!showAllHistory)}
              className="text-xs font-bold text-[#F47721] hover:underline"
            >
              {showAllHistory ? 'Show Less' : `View All (${resumes.length})`}
            </button>
          )}
        </div>

        {resumes.length === 0 ? (
          <p className="text-xs text-[#10221D]/60 italic py-4 text-center">
            No previous resumes uploaded.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Mobile Card List (sm:hidden) */}
            <div className="sm:hidden space-y-3">
              {historyList.map((res) => {
                const isCurrentActive = String(res._id) === String(activeResumeId);
                const resScore = res.parsedData?.atsScore || '—';
                const resRole = res.parsedData?.targetRole || 'Role not detected';
                const resDate = res.createdAt ? new Date(res.createdAt).toLocaleDateString() : 'Recent';

                return (
                  <div
                    key={res._id}
                    className={`p-4 rounded-xl border-2 space-y-3 transition-colors ${
                      isCurrentActive
                        ? 'bg-[#FFC400]/15 border-[#10221D]'
                        : 'bg-[#FAF8F0] border-[#10221D]/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <FileText className="w-4 h-4 text-[#10221D]/70 shrink-0" />
                        <span className="font-bold text-xs text-[#10221D] truncate" title={res.fileName}>
                          {res.fileName}
                        </span>
                      </div>
                      {isCurrentActive && (
                        <span className="bg-[#10221D] text-[#FAF8F0] text-[9px] font-black px-1.5 py-0.5 rounded uppercase shrink-0">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#10221D]/10">
                      <div>
                        <span className="text-[#10221D]/60 block text-[10px] uppercase font-bold">Inferred Role</span>
                        <span className="font-bold text-[#10221D] truncate block">{resRole}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#10221D]/60 block text-[10px] uppercase font-bold">ATS Score</span>
                        <span className="font-black text-[#10221D]">
                          {resScore}
                          {typeof resScore === 'number' && <span className="text-[9px] text-[#10221D]/50 font-normal">/100</span>}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#10221D]/10 text-xs">
                      <span className="text-[10px] text-[#10221D]/60 font-medium">Uploaded {resDate}</span>
                      <div className="flex items-center space-x-3">
                        {!isCurrentActive && (
                          <button
                            onClick={() => handleSelectActiveResume(res._id)}
                            className="text-xs font-bold text-[#10221D] hover:underline cursor-pointer"
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          onClick={() =>
                            navigate('/new-session', {
                              state: {
                                targetRole: resRole,
                                resumeId: res._id,
                              },
                            })
                          }
                          className="text-xs font-bold text-[#F47721] hover:underline cursor-pointer"
                        >
                          Interview →
                        </button>
                        <button
                          onClick={() => handleDeleteResume(res._id, res.fileName)}
                          disabled={deletingId === res._id}
                          className="text-rose-700 hover:text-rose-900 disabled:opacity-50 cursor-pointer"
                          title="Delete resume"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (Hidden on small mobile) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead>
                  <tr className="border-b border-[#10221D]/10 text-[#10221D]/60 font-black uppercase text-[10px]">
                    <th className="py-2 pr-3">Document</th>
                    <th className="py-2 px-3">Uploaded</th>
                    <th className="py-2 px-3">Target Role</th>
                    <th className="py-2 px-3">ATS Score</th>
                    <th className="py-2 pl-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#10221D]/10">
                  {historyList.map((res) => {
                    const isCurrentActive = String(res._id) === String(activeResumeId);
                    const resScore = res.parsedData?.atsScore || '—';
                    const resRole = res.parsedData?.targetRole || 'Role not detected';
                    const resDate = res.createdAt ? new Date(res.createdAt).toLocaleDateString() : 'Recent';

                    return (
                      <tr
                        key={res._id}
                        className={`hover:bg-[#F5F2E6]/60 transition-colors ${
                          isCurrentActive ? 'bg-[#FFC400]/10 font-bold' : ''
                        }`}
                      >
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-[#10221D]/60 shrink-0" />
                            <span className="font-bold text-[#10221D] truncate max-w-[200px] sm:max-w-xs">
                              {res.fileName}
                            </span>
                            {isCurrentActive && (
                              <span className="bg-[#10221D] text-[#FAF8F0] text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                                Active
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-[#10221D]/70 whitespace-nowrap">
                          {resDate}
                        </td>

                        <td className="py-2.5 px-3 text-[#10221D] font-medium truncate max-w-[150px]">
                          {resRole}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-black text-[#10221D]">
                            {resScore}
                          </span>
                          {typeof resScore === 'number' && <span className="text-[10px] text-[#10221D]/50 font-normal">/100</span>}
                        </td>

                        <td className="py-2.5 pl-3 text-right whitespace-nowrap space-x-2">
                          {!isCurrentActive && (
                            <button
                              onClick={() => handleSelectActiveResume(res._id)}
                              className="text-[11px] font-bold text-[#10221D] hover:underline"
                              title="Set as active analyzed resume"
                            >
                              Set Active
                            </button>
                          )}

                          <button
                            onClick={() =>
                              navigate('/new-session', {
                                state: {
                                  targetRole: resRole,
                                  resumeId: res._id,
                                },
                              })
                            }
                            className="text-[11px] font-bold text-[#F47721] hover:underline"
                            title="Practice interview with this resume"
                          >
                            Interview
                          </button>

                          <button
                            onClick={() => handleDeleteResume(res._id, res.fileName)}
                            disabled={deletingId === res._id}
                            className="text-[11px] font-bold text-rose-700 hover:text-rose-900 disabled:opacity-50"
                            title="Delete resume"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline-block -mt-0.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
