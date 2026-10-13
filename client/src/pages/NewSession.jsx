import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import { 
  PlayCircle, 
  Briefcase, 
  FileText, 
  Settings2, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  Layers, 
  ArrowRight, 
  Target, 
  CheckCircle2,
  Info,
  Check,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import TargetRoleSelector from '../components/common/TargetRoleSelector';

export default function NewSession() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const focusTopicParam = searchParams.get('focus');
  const prevScoreParam = searchParams.get('prevScore');

  // 1. Target Role State: Prioritize routing state, then localStorage, then user profile
  const [targetRole, setTargetRole] = useState(() => {
    return (
      location.state?.targetRole ||
      localStorage.getItem('preppilot_target_role') ||
      user?.targetRole ||
      'Full Stack Engineer'
    );
  });

  // 2. Resume Selection State
  const [selectedResumeId, setSelectedResumeId] = useState(() => {
    return (
      location.state?.resumeId ||
      localStorage.getItem('preppilot_active_resume_id') ||
      ''
    );
  });
  const [resumes, setResumes] = useState([]);
  const [resumesLoading, setResumesLoading] = useState(true);

  // 3. Interview Configuration State
  const [interviewType, setInterviewType] = useState('technical');
  const [difficulty, setDifficulty] = useState('mid');
  const [count, setCount] = useState(5);

  // 4. UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch authenticated user's resumes
  useEffect(() => {
    let isMounted = true;
    const loadResumes = async () => {
      setResumesLoading(true);
      try {
        const res = await axiosClient.get('/resumes');
        if (!isMounted) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setResumes(list);

        // If no explicit resumeId in state/storage, select first if available
        if (!selectedResumeId && list.length > 0) {
          const defaultId = String(list[0]._id);
          setSelectedResumeId(defaultId);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load resumes for session configuration:', err);
      } finally {
        if (isMounted) setResumesLoading(false);
      }
    };
    loadResumes();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync incoming route state if navigating between pages
  useEffect(() => {
    if (location.state?.targetRole) {
      setTargetRole(location.state.targetRole);
    }
    if (location.state?.resumeId) {
      setSelectedResumeId(String(location.state.resumeId));
    }
  }, [location.state]);

  // Selected Resume Details
  const selectedResume = resumes.find((r) => String(r._id) === String(selectedResumeId)) || null;
  const resumeDetectedRole = selectedResume?.parsedData?.targetRole || null;
  const isRoleMismatched = Boolean(
    resumeDetectedRole &&
    targetRole &&
    resumeDetectedRole.trim().toLowerCase() !== targetRole.trim().toLowerCase()
  );

  const handleRoleChange = (newRole) => {
    const clean = (newRole || '').trim();
    setTargetRole(clean);
    try {
      localStorage.setItem('preppilot_target_role', clean);
    } catch (e) {}
  };

  const handleStartSession = async (e) => {
    e.preventDefault();

    if (!targetRole.trim()) {
      setError('Please select or enter your target engineering role.');
      return;
    }

    if (count < 1 || count > 10) {
      setError('Please select a valid question count between 1 and 10.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axiosClient.post('/sessions/start', {
        resumeId: selectedResumeId || null,
        targetRole: targetRole.trim(),
        interviewType,
        difficulty,
        count: Number(count),
        focusTopic: focusTopicParam || undefined,
        previousScore: prevScoreParam ? Number(prevScoreParam) : undefined,
      });

      const session = response.data?.session;
      if (!session || !session._id) {
        throw new Error('Server did not return a valid session ID. Please try again.');
      }

      // Persist active target role
      localStorage.setItem('preppilot_target_role', targetRole.trim());

      setLoading(false);
      navigate(`/interview/${session._id}`);
    } catch (err) {
      console.error('[Start Session Error]:', err);
      const serverMessage = err.response?.data?.message || err.message || 'Failed to start interview loop.';
      setError(serverMessage);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6 animate-fadeIn">
      {/* ================= 1. COMPACT HEADER ================= */}
      <div className="bg-[#FDFBF3] text-[#10221D] p-4 sm:p-6 rounded-2xl border-2 border-[#10221D] editorial-shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#10221D] text-[#FFC400] flex items-center justify-center font-bold shadow-xs shrink-0">
              <PlayCircle className="w-4 h-4" />
            </div>
            <h1 className="font-serif-headline text-xl sm:text-3xl font-black text-[#10221D]">
              Configure Mock Interview
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#10221D]/70 font-medium">
            Customize target role, interview category, seniority level, and resume context.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-xl bg-[#FAF8F0] border border-[#10221D]/20 text-[11px] font-bold text-[#10221D]/80 flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>AI Feedback Loop</span>
          </span>
        </div>
      </div>

      {focusTopicParam && (
        <div className="p-4 bg-[#FEF9C3] border-2 border-[#10221D] rounded-2xl flex items-center justify-between editorial-shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#10221D] text-[#FFC400] rounded-xl">
              <Target className="w-5 h-5 text-[#FFC400]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#F47721]">
                Targeted Retry Drill
              </span>
              <h4 className="font-serif-headline text-base sm:text-lg font-black text-[#10221D]">
                Focusing on: {focusTopicParam}
              </h4>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-[#10221D] text-[#FAF8F0] text-xs font-bold rounded-lg uppercase tracking-wider">
            Active Drill
          </span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border-2 border-rose-500 rounded-xl flex items-start justify-between text-rose-900 text-xs font-bold space-x-2">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError('')}
            className="text-rose-700 hover:text-rose-900 underline text-[11px] shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ================= 2. CONFIGURATION FORM ================= */}
      <form onSubmit={handleStartSession} className="bg-[#FDFBF3] text-[#10221D] p-4 sm:p-7 rounded-2xl border-2 border-[#10221D] editorial-shadow-sm space-y-5 sm:space-y-6">
        
        {/* Section 1: Target Job Role */}
        <div className="space-y-2 pb-5 border-b border-[#10221D]/10">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-black uppercase tracking-wider text-[#10221D]">
              1. Target Interview Role
            </label>
            <span className="text-[11px] text-[#10221D]/60 font-medium">
              Predefined or Custom
            </span>
          </div>
          
          <TargetRoleSelector
            value={targetRole}
            onChange={handleRoleChange}
            onApply={handleRoleChange}
            helperText="The interview scenario questions will strictly calibrate around this target role."
          />
        </div>

        {/* Section 2: Resume Context Selection */}
        <div className="space-y-3 pb-5 border-b border-[#10221D]/10">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-black uppercase tracking-wider text-[#10221D] flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-[#F47721]" />
              <span>2. Resume Context (Optional)</span>
            </label>
            <span className="text-[11px] text-[#10221D]/60 font-medium">
              {resumes.length} saved {resumes.length === 1 ? 'resume' : 'resumes'}
            </span>
          </div>

          <div className="space-y-2">
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              disabled={resumesLoading}
              className="w-full p-3 bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl text-[#10221D] text-xs sm:text-sm font-bold focus:outline-none focus:bg-[#FDFBF3]"
            >
              <option value="">-- Proceed Without Resume (Generic Role Questions) --</option>
              {resumes.map((r) => (
                <option key={r._id} value={r._id}>
                  📄 {r.fileName} {r.parsedData?.targetRole ? `• Detected: ${r.parsedData.targetRole}` : ''} {typeof r.parsedData?.atsScore === 'number' ? `(${r.parsedData.atsScore} ATS)` : ''}
                </option>
              ))}
            </select>

            {/* Context Explanations & Mismatch Warning */}
            {selectedResume ? (
              <div className="p-3 bg-[#FAF8F0] border border-[#10221D]/15 rounded-xl space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                  <span className="font-bold text-[#10221D] flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Attached File: <strong>{selectedResume.fileName}</strong></span>
                  </span>
                  {resumeDetectedRole && (
                    <span className="text-[#10221D]/70">
                      Inferred Resume Role: <strong>{resumeDetectedRole}</strong>
                    </span>
                  )}
                </div>

                {isRoleMismatched && (
                  <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-[11px] flex items-start space-x-2">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>Role Alignment Notice:</strong> Your selected resume detected <em>"{resumeDetectedRole}"</em>, but you have chosen to interview for <strong>"{targetRole}"</strong>. The questions will strictly evaluate the requirements for <strong>{targetRole}</strong>, while referencing your resume's technical achievements where applicable.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-[#10221D]/60 italic">
                No resume attached. Questions will be generated based on general industry standards for {targetRole}.
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Interview Category / Loop Type */}
        <div className="space-y-3 pb-5 border-b border-[#10221D]/10">
          <label className="block text-xs font-black uppercase tracking-wider text-[#10221D] flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-[#F47721]" />
            <span>3. Interview Category</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'technical',
                title: 'Technical Architecture',
                badge: 'Coding & System Design',
                desc: 'Architecture patterns, algorithms, system design, and hands-on technical concepts.'
              },
              {
                id: 'behavioral',
                title: 'Behavioral & STAR',
                badge: 'Situational & Leadership',
                desc: 'Leadership, conflict resolution, project obstacles, and STAR framework responses.'
              },
              {
                id: 'hr',
                title: 'HR & Cultural Screen',
                badge: 'Culture & Motivation',
                desc: 'Career background, team collaboration, motivation, and company cultural fit.'
              },
            ].map((cat) => {
              const isSelected = interviewType === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setInterviewType(cat.id)}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
                    isSelected
                      ? 'bg-[#FFC400]/25 border-[#10221D] editorial-shadow-sm'
                      : 'bg-[#FAF8F0] border-[#10221D]/20 hover:border-[#10221D]/50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-[#F47721]">
                        {cat.badge}
                      </span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-[#10221D] text-[#FFC400] flex items-center justify-center text-[10px] font-black">
                          ✓
                        </span>
                      )}
                    </div>
                    <h4 className="font-serif-headline text-sm font-bold text-[#10221D]">
                      {cat.title}
                    </h4>
                    <p className="text-[11px] text-[#10221D]/75 leading-relaxed">
                      {cat.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Seniority Level & Question Count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-[#10221D]">
              4. Seniority / Difficulty Level
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full p-3 bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl text-[#10221D] font-bold text-xs sm:text-sm focus:outline-none focus:bg-[#FDFBF3]"
            >
              <option value="junior">Junior (Entry Level • 0-2 yrs)</option>
              <option value="mid">Mid Level (Core Engineering • 3-5 yrs)</option>
              <option value="senior">Senior (Staff / System Lead • 5-8 yrs)</option>
              <option value="lead">Staff / Principal Architect (8+ yrs)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-[#10221D]">
              5. Number of Questions
            </label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full p-3 bg-[#FAF8F0] border-2 border-[#10221D] rounded-xl text-[#10221D] font-bold text-xs sm:text-sm focus:outline-none focus:bg-[#FDFBF3]"
            >
              <option value={5}>5 Questions (Standard 15-min Loop)</option>
              <option value={6}>6 Questions</option>
              <option value={7}>7 Questions</option>
              <option value={8}>8 Questions (Comprehensive Drill)</option>
            </select>
          </div>
        </div>

        {/* Submit Action CTA */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl font-black text-[#10221D] bg-[#FFC400] hover:bg-[#E5B000] border-2 border-[#10221D] disabled:opacity-50 transition-all editorial-shadow-sm flex items-center justify-center space-x-2 text-sm sm:text-base cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#10221D]" />
                <span>Generating Personalized Interview Loop with AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#10221D]" />
                <span>Generate Loop & Begin Interview</span>
                <ArrowRight className="w-4 h-4 text-[#10221D]" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
