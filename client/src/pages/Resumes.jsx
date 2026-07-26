import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import ResumeUpload from '../components/ResumeUpload';
import { FileText, CheckCircle2, Calendar, Loader2, Sparkles, Cpu, Briefcase } from 'lucide-react';

export default function Resumes() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchResumes = async () => {
    try {
      const res = await axiosClient.get('/resumes');
      setResumes(res.data || []);
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
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white">Resume Parsing & Profiles</h1>
        <p className="text-sm text-slate-400">
          Upload PDF or DOCX resumes. OpenAI gpt-4o-mini will extract structured skills and projects to tailor interview questions.
        </p>
      </div>

      {/* Resume Upload Component */}
      <ResumeUpload onUploadSuccess={handleUploadSuccess} />

      {/* Stored Resumes List */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <span>Uploaded Resumes ({resumes.length})</span>
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-2" />
            <span>Loading resumes...</span>
          </div>
        ) : resumes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resumes.map((res) => (
              <div
                key={res._id}
                className="p-6 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-4 hover:border-indigo-500/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{res.fileName}</h3>
                      <span className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Uploaded: {new Date(res.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg uppercase">
                    {res.fileType}
                  </span>
                </div>

                {res.parsedData?.targetRole && (
                  <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-300">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Target Role: {res.parsedData.targetRole}</span>
                  </div>
                )}

                {/* Skills tags */}
                {res.parsedData?.skills && res.parsedData.skills.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Extracted Technical Skills:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {res.parsedData.skills.slice(0, 8).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 text-[11px] rounded"
                        >
                          {skill}
                        </span>
                      ))}
                      {res.parsedData.skills.length > 8 && (
                        <span className="text-[11px] text-slate-500 font-semibold self-center">
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
          <p className="text-xs text-slate-400 italic">No resumes uploaded yet. Upload a PDF or DOCX file above.</p>
        )}
      </div>
    </div>
  );
}
