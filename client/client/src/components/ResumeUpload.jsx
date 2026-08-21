import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Briefcase, 
  Cpu, 
  ArrowRight,
  ShieldCheck,
  Target,
  FileCheck,
  Check
} from 'lucide-react';

export default function ResumeUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parsedResume, setParsedResume] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (!['pdf', 'docx', 'doc'].includes(ext)) {
        setError('Invalid file type. Please upload a PDF or DOCX resume.');
        setFile(null);
        return;
      }
      setError('');
      setFile(selectedFile);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF or DOCX file to upload.');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await axiosClient.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { resume } = response.data;
      setParsedResume(resume);
      setUploading(false);
      if (onUploadSuccess) {
        onUploadSuccess(resume);
      }
    } catch (err) {
      console.error('Resume upload error:', err);
      setError(err.response?.data?.message || 'Error uploading and parsing resume file.');
      setUploading(false);
    }
  };

  const featureChecklist = [
    'ATS Resume Score (0-100)',
    'AI Resume Analysis',
    'Skills Extraction',
    'Target Role Detection',
    'Recommended Jobs',
    'Match Percentage',
    'Missing Skills Gap Analysis',
    'AI Cover Letter Generation',
    'AI Interview Preparation',
  ];

  return (
    <div className="bg-[#FDFBF3] text-[#0F1E1B] p-6 sm:p-8 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-[#0F1E1B] text-[#F5D90A] rounded-2xl shadow-md shrink-0">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif-headline text-xl sm:text-2xl font-black text-[#0F1E1B]">
              Upload Resume to Start Your AI Career Journey
            </h2>
            <p className="text-xs sm:text-sm text-[#0F1E1B]/75 font-medium">
              Supported: <span className="font-bold text-[#C1440E]">PDF, DOCX</span> • Maximum Size: <span className="font-bold">15 MB</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-[#F5F2E6] border border-[#0F1E1B]/20 text-xs font-extrabold text-[#0F1E1B] shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>Secure & Confidential</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border-2 border-rose-600 rounded-2xl flex items-center space-x-3 text-rose-800 text-xs font-bold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Drag and Drop & Checklist Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Drag & Drop Zone */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <form onSubmit={handleUpload} className="space-y-4 h-full flex flex-col justify-between">
            <div className="relative border-3 border-dashed border-[#0F1E1B]/30 hover:border-[#0F1E1B] transition-all rounded-2xl p-8 text-center bg-[#F5F2E6] cursor-pointer group flex-1 flex flex-col items-center justify-center">
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-[#0F1E1B] text-[#F5D90A] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  {file ? <FileText className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
                </div>
                <div>
                  <p className="text-sm font-black text-[#0F1E1B]">
                    {file ? file.name : 'Click or drag your resume file here to upload'}
                  </p>
                  <p className="text-xs text-[#0F1E1B]/60 font-semibold mt-1">
                    Instant AI ATS Scoring & Job Recommendations
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full py-3.5 px-4 rounded-2xl text-sm font-bold text-[#FDFBF3] bg-[#0F1E1B] hover:bg-[#1A332E] disabled:opacity-50 disabled:cursor-not-allowed transition-all editorial-shadow flex items-center justify-center space-x-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#F5D90A]" />
                  <span>Parsing Resume & Calculating ATS Score...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-[#F5D90A]" />
                  <span>Process Resume & Launch Career Journey</span>
                  <ArrowRight className="w-4 h-4 text-[#F5D90A]" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Value Checklist */}
        <div className="lg:col-span-5 bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-[#C1440E] flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#F5D90A]" />
              <span>After Upload You Receive:</span>
            </span>
            <h4 className="text-sm font-bold text-[#0F1E1B] font-serif-headline">
              Instant AI Career Intelligence
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {featureChecklist.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-2 text-xs font-bold text-[#0F1E1B]">
                <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#0F1E1B]/15 text-[11px] text-[#0F1E1B]/70 font-semibold flex items-center space-x-1.5">
            <FileCheck className="w-3.5 h-3.5 text-[#C1440E]" />
            <span>Powering over 10,000+ AI interviews & job applications.</span>
          </div>
        </div>

      </div>

      {/* Extracted Structured JSON Preview */}
      {parsedResume && (
        <div className="mt-8 pt-6 border-t-2 border-[#0F1E1B]/15 animate-fadeIn space-y-4">
          <div className="flex items-center space-x-2 text-emerald-800 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            <span>Resume Parsed Successfully! Proceeding to AI Career Hub Dashboard below...</span>
          </div>
        </div>
      )}

    </div>
  );
}
