import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import { PlayCircle, Briefcase, FileText, Settings2, Sparkles, Loader2, AlertCircle, Layers, ArrowRight } from 'lucide-react';

export default function NewSession() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [targetRole, setTargetRole] = useState(user?.targetRole || 'Full Stack Engineer');
  const [interviewType, setInterviewType] = useState('technical');
  const [difficulty, setDifficulty] = useState('mid');
  const [count, setCount] = useState(5);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadResumes = async () => {
      try {
        const res = await axiosClient.get('/resumes');
        setResumes(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedResumeId(res.data[0]._id);
        }
      } catch (err) {
        console.error('Failed to load resumes for session:', err);
      }
    };
    loadResumes();
  }, []);

  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!targetRole.trim()) {
      setError('Please specify a target role for your interview.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axiosClient.post('/sessions/start', {
        resumeId: selectedResumeId || null,
        targetRole,
        interviewType,
        difficulty,
        count: Number(count),
      });

      const { session } = response.data;
      setLoading(false);
      navigate(`/interview/${session._id}`);
    } catch (err) {
      console.error('Failed to start session:', err);
      setError(err.response?.data?.message || 'Failed to start session and generate questions.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-fadeIn">
      <div className="bg-[#FDFBF3] text-[#0F1E1B] p-8 sm:p-10 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-8">
        
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#0F1E1B] text-[#FDFBF3] items-center justify-center shadow-lg mb-2">
            <PlayCircle className="w-7 h-7 text-[#F5D90A]" />
          </div>
          <h1 className="font-serif-headline text-3xl sm:text-4xl font-bold text-[#0F1E1B]">Configure Mock Interview Loop</h1>
          <p className="text-xs sm:text-sm text-[#0F1E1B]/75 font-medium">
            Customize target role, interview loop type, and seniority level. Our AI will generate structured, context-aware questions.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border-2 border-rose-600 rounded-2xl flex items-center space-x-3 text-rose-800 text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleStartSession} className="space-y-6">
          
          {/* Target Role Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0F1E1B] mb-2 flex items-center space-x-1.5">
              <Briefcase className="w-4 h-4 text-[#C1440E]" />
              <span>Target Job Role / Designation</span>
            </label>
            <input
              type="text"
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Full Stack Engineer, DevOps Lead, Data Scientist"
              className="w-full p-3.5 bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl text-[#0F1E1B] placeholder-[#0F1E1B]/40 focus:outline-none focus:bg-[#FDFBF3] text-sm font-bold"
            />
          </div>

          {/* Select Parsed Resume */}
          {resumes.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0F1E1B] mb-2 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-[#C1440E]" />
                <span>Select Parsed Resume Context (Optional)</span>
              </label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full p-3.5 bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl text-[#0F1E1B] focus:outline-none focus:bg-[#FDFBF3] text-sm font-bold"
              >
                <option value="">-- No Resume (Generic Role Questions) --</option>
                {resumes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.fileName} ({r.parsedData?.targetRole || 'Parsed Profile'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Interview Type Cards */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0F1E1B] mb-3 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-[#C1440E]" />
              <span>Interview Category / Loop Type</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'technical', title: 'Technical Architecture', desc: 'Coding, system design & algorithms' },
                { id: 'behavioral', title: 'Behavioral & STAR', desc: 'STAR format, leadership & situations' },
                { id: 'hr', title: 'HR & Cultural Screen', desc: 'Career background, goals & fit' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setInterviewType(item.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    interviewType === item.id
                      ? 'bg-[#F5D90A] border-[#0F1E1B] text-[#0F1E1B] editorial-shadow-sm font-bold'
                      : 'bg-[#F5F2E6] border-[#0F1E1B]/30 text-[#0F1E1B]/80 hover:border-[#0F1E1B]'
                  }`}
                >
                  <h4 className="font-serif-headline text-base font-bold text-[#0F1E1B] mb-1">{item.title}</h4>
                  <p className="text-xs text-[#0F1E1B]/75 font-medium">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Level & Question Count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0F1E1B] mb-2">
                Seniority / Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full p-3.5 bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl text-[#0F1E1B] focus:outline-none focus:bg-[#FDFBF3] text-sm font-bold"
              >
                <option value="junior">Junior (Entry Level)</option>
                <option value="mid">Mid Level (3+ Years)</option>
                <option value="senior">Senior (5+ Years)</option>
                <option value="lead">Staff / Lead Engineer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0F1E1B] mb-2">
                Number of Questions
              </label>
              <select
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-full p-3.5 bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl text-[#0F1E1B] focus:outline-none focus:bg-[#FDFBF3] text-sm font-bold"
              >
                <option value={5}>5 Questions (Standard Loop)</option>
                <option value={6}>6 Questions</option>
                <option value={7}>7 Questions</option>
                <option value={8}>8 Questions (In-depth Loop)</option>
              </select>
            </div>
          </div>

          {/* Start Session Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl font-bold text-[#FDFBF3] bg-[#0F1E1B] hover:bg-[#1A332E] disabled:opacity-50 transition-all editorial-shadow flex items-center justify-center space-x-2 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-[#F5D90A]" />
                <span>Generating Personalized Loop with AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-[#F5D90A]" />
                <span>Generate Loop & Begin Interview</span>
                <ArrowRight className="w-4 h-4 text-[#F5D90A]" />
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}
