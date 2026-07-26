import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, Briefcase, Cpu } from 'lucide-react';

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
    <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Upload Your Resume</h2>
          <p className="text-sm text-slate-400">PDF or DOCX supported. Our AI will extract skills & project details.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-4">
        <div className="relative border-2 border-dashed border-slate-700 hover:border-indigo-500/60 transition-colors rounded-xl p-8 text-center bg-slate-900/50 cursor-pointer group">
          <input
            type="file"
            accept=".pdf,.docx,.doc"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="flex flex-col items-center justify-center space-y-3">
            <FileText className="w-12 h-12 text-slate-500 group-hover:text-indigo-400 group-hover:scale-110 transition-all" />
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {file ? file.name : 'Click or drag resume here to upload'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Maximum file size: 15MB</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!file || uploading}
          className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing Document with OpenAI...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Process Resume & Extract Skills</span>
            </>
          )}
        </button>
      </form>

      {/* Extracted Structured JSON Preview */}
      {parsedResume && (
        <div className="mt-8 pt-6 border-t border-slate-800 animate-fadeIn">
          <div className="flex items-center space-x-2 text-emerald-400 text-sm font-bold mb-4">
            <CheckCircle2 className="w-5 h-5" />
            <span>Resume Successfully Parsed!</span>
          </div>

          <div className="space-y-4">
            {/* Target Role & Summary */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                <Briefcase className="w-4 h-4" />
                <span>Detected Target Role</span>
              </div>
              <p className="text-base font-bold text-white">
                {parsedResume.parsedData?.targetRole || 'Software Engineer'}
              </p>
              {parsedResume.parsedData?.summary && (
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {parsedResume.parsedData.summary}
                </p>
              )}
            </div>

            {/* Extracted Skills Badges */}
            {parsedResume.parsedData?.skills && (
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">
                  <Cpu className="w-4 h-4" />
                  <span>Extracted Skills ({parsedResume.parsedData.skills.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {parsedResume.parsedData.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg text-xs font-medium"
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
