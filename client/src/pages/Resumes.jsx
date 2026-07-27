import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import ResumeUpload from '../components/ResumeUpload';
import { FileText, Calendar, Loader2, Briefcase, Cpu, Sparkles } from 'lucide-react';

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
      <div className="bg-[#FDFBF3] text-[#0F1E1B] p-8 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2.5 bg-[#F5D90A] border-2 border-[#0F1E1B] rounded-xl text-[#0F1E1B]">
            <Sparkles className="w-5 h-5 text-[#C1440E]" />
          </div>
          <h1 className="font-serif-headline text-3xl sm:text-4xl font-bold text-[#0F1E1B]">Resume Intelligence</h1>
        </div>
        <p className="text-sm text-[#0F1E1B]/80 font-medium">
          Upload PDF or DOCX resumes. Our AI parser automatically extracts structured skills, projects, and target roles to customize mock interview loops.
        </p>
      </div>

      {/* Resume Upload Component */}
      <ResumeUpload onUploadSuccess={handleUploadSuccess} />

      {/* Stored Resumes List */}
      <div className="bg-[#FDFBF3] text-[#0F1E1B] p-6 sm:p-8 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-6">
        <h2 className="font-serif-headline text-2xl font-bold text-[#0F1E1B] flex items-center space-x-2">
          <FileText className="w-6 h-6 text-[#C1440E]" />
          <span>Uploaded Resumes ({resumes.length})</span>
        </h2>

        {loading ? (
          <div className="p-8 text-center text-[#0F1E1B]/70 font-medium">
            <Loader2 className="w-6 h-6 animate-spin text-[#C1440E] mx-auto mb-2" />
            <span>Loading uploaded documents...</span>
          </div>
        ) : resumes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resumes.map((res) => (
              <div
                key={res._id}
                className="p-6 bg-[#F5F2E6] rounded-2xl border-2 border-[#0F1E1B] space-y-4 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-[#0F1E1B] text-[#F5D90A] rounded-2xl">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0F1E1B] text-base">{res.fileName}</h3>
                      <span className="text-xs text-[#0F1E1B]/60 font-medium flex items-center space-x-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Uploaded: {new Date(res.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-[#FEF9C3] border border-[#0F1E1B] text-[#0F1E1B] text-xs font-bold rounded-xl uppercase">
                    {res.fileType}
                  </span>
                </div>

                {res.parsedData?.targetRole && (
                  <div className="flex items-center space-x-2 text-xs font-bold text-[#C1440E]">
                    <Briefcase className="w-4 h-4" />
                    <span>Target Role: {res.parsedData.targetRole}</span>
                  </div>
                )}

                {/* Skills tags */}
                {res.parsedData?.skills && res.parsedData.skills.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F1E1B]/70">
                      Extracted Technical Skills:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {res.parsedData.skills.slice(0, 8).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 bg-[#FDFBF3] border border-[#0F1E1B] text-[#0F1E1B] text-[11px] font-bold rounded-lg"
                        >
                          {skill}
                        </span>
                      ))}
                      {res.parsedData.skills.length > 8 && (
                        <span className="text-[11px] text-[#0F1E1B]/60 font-bold self-center">
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
          <p className="text-xs text-[#0F1E1B]/60 italic font-medium">No resumes uploaded yet. Upload a PDF or DOCX file above.</p>
        )}
      </div>
    </div>
  );
}
