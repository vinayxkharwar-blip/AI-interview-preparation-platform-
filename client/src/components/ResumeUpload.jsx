import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, Briefcase, Cpu, ArrowRight } from 'lucide-react';

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
      setError('Please select a file to upload.');
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

  return (
    <div className="bg-[#FDFBF3] text-[#0F1E1B] p-6 sm:p-8 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-6">
      <div className="flex items-center space-x-3 mb-2">
        <div className="p-3 bg-[#0F1E1B] text-[#F5D90A] rounded-2xl shadow-md">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-serif-headline text-2xl font-bold text-[#0F1E1B]">Upload Your Resume</h2>
          <p className="text-xs sm:text-sm text-[#0F1E1B]/75 font-medium">
            PDF or DOCX supported. Our AI will automatically extract skills & project details.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border-2 border-rose-600 rounded-2xl flex items-center space-x-3 text-rose-800 text-xs font-bold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-4">
        <div className="relative border-3 border-dashed border-[#0F1E1B]/30 hover:border-[#0F1E1B] transition-colors rounded-2xl p-8 text-center bg-[#F5F2E6] cursor-pointer group">
          <input
            type="file"
            accept=".pdf,.docx,.doc"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#0F1E1B] text-[#F5D90A] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F1E1B]">
                {file ? file.name : 'Click or drag resume file here to upload'}
              </p>
              <p className="text-xs text-[#0F1E1B]/60 font-medium mt-1">Maximum file size: 15MB (PDF or DOCX)</p>
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
              <span>Analyzing Document & Extracting Skills...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-[#F5D90A]" />
              <span>Process Resume & Extract Skills</span>
              <ArrowRight className="w-4 h-4 text-[#F5D90A]" />
            </>
          )}
        </button>
      </form>

      {/* Extracted Structured JSON Preview */}
      {parsedResume && (
        <div className="mt-8 pt-6 border-t-2 border-[#0F1E1B]/15 animate-fadeIn space-y-4">
          <div className="flex items-center space-x-2 text-emerald-800 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            <span>Resume Successfully Parsed!</span>
          </div>

          <div className="space-y-4">
            {/* Target Role & Summary */}
            <div className="bg-[#F3E8FF] p-5 rounded-2xl border-2 border-[#0F1E1B]">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#C1440E] uppercase tracking-wider mb-1">
                <Briefcase className="w-4 h-4" />
                <span>Detected Target Role</span>
              </div>
              <p className="font-serif-headline text-xl font-bold text-[#0F1E1B]">
                {parsedResume.parsedData?.targetRole || 'Software Engineer'}
              </p>
              {parsedResume.parsedData?.summary && (
                <p className="text-xs text-[#0F1E1B]/85 mt-2 leading-relaxed font-medium">
                  {parsedResume.parsedData.summary}
                </p>
              )}
            </div>

            {/* Extracted Skills Badges */}
            {parsedResume.parsedData?.skills && parsedResume.parsedData.skills.length > 0 && (
              <div className="bg-[#DCFCE7] p-5 rounded-2xl border-2 border-[#0F1E1B]">
                <div className="flex items-center space-x-2 text-xs font-bold text-[#0F1E1B] uppercase tracking-wider mb-3">
                  <Cpu className="w-4 h-4 text-[#C1440E]" />
                  <span>Extracted Skills ({parsedResume.parsedData.skills.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {parsedResume.parsedData.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-[#FDFBF3] border-2 border-[#0F1E1B] text-[#0F1E1B] rounded-xl text-xs font-bold shadow-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
