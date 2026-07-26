import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import { PlayCircle, Briefcase, FileText, Settings2, Sparkles, Loader2, AlertCircle, Layers } from 'lucide-react';

export default function NewSession() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [targetRole, setTargetRole] = useState(user?.targetRole || 'Full Stack Software Engineer');
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
      <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl space-y-8">
        
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 items-center justify-center shadow-xl shadow-indigo-600/30 mb-2">
            <PlayCircle className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white">Configure Interview Practice</h1>
          <p className="text-sm text-slate-400">
            Customize role, type, and difficulty. OpenAI will generate personalized, context-aware interview questions.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-3 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleStartSession} className="space-y-6">
          
          {/* Target Role Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center space-x-1.5">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>Target Job Role / Designation</span>
            </label>
            <input
              type="text"
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior React Developer, DevOps Lead, Data Scientist"
              className="w-full p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm font-semibold"
            />
          </div>

          {/* Select Parsed Resume */}
          {resumes.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Select Parsed Resume Context (Optional)</span>
              </label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-sm font-medium"
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Interview Category / Type</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'technical', title: 'Technical', desc: 'Coding, architecture & system design' },
                { id: 'behavioral', title: 'Behavioral', desc: 'STAR format, teamwork & situational' },
                { id: 'hr', title: 'HR & Cultural', desc: 'Career goals, fit & background' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setInterviewType(item.id)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    interviewType === item.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <h4 className="font-bold text-sm text-white mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Level & Question Count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Seniority / Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-sm font-medium"
              >
                <option value="junior">Junior (Entry Level)</option>
                <option value="mid">Mid Level (3+ Years)</option>
                <option value="senior">Senior (5+ Years)</option>
                <option value="lead">Staff / Lead Engineer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Number of Questions
              </label>
              <select
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-full p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-sm font-medium"
              >
                <option value={5}>5 Questions (Standard)</option>
                <option value={6}>6 Questions</option>
                <option value={7}>7 Questions</option>
                <option value={8}>8 Questions (In-depth)</option>
              </select>
            </div>
          </div>

          {/* Start Session Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Personalized Questions with LLM...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Questions & Begin Interview</span>
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}
