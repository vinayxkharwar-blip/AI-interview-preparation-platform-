import React, { useState, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { 
  UploadCloud, 
  FileText, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';

export default function ResumeUpload({ onUploadSuccess, compact = false }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;

    if (selectedFile.size > 15 * 1024 * 1024) {
      setError('File exceeds 15MB limit. Please upload a smaller document.');
      setFile(null);
      return;
    }

    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'doc'].includes(ext)) {
      setError('Invalid file type. Please upload a PDF or DOCX file.');
      setFile(null);
      return;
    }

    setError('');
    setFile(selectedFile);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    validateAndSetFile(selectedFile);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer?.files?.[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e) => {
    if (e) e.preventDefault();
    if (!file) {
      setError('Please select a valid PDF or DOCX resume to upload.');
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
      setUploading(false);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onUploadSuccess) {
        onUploadSuccess(resume);
      }
    } catch (err) {
      console.error('Resume upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload and parse resume.');
      setUploading(false);
    }
  };

  return (
    <div className="bg-[#FDFBF3] text-[#10221D] p-5 sm:p-6 rounded-2xl border-2 border-[#10221D] editorial-shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#10221D]/10">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#10221D] text-[#FFC400] flex items-center justify-center font-bold shadow-xs shrink-0">
            <UploadCloud className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif-headline text-lg sm:text-xl font-black text-[#10221D]">
              Upload Your Resume
            </h3>
            <p className="text-xs text-[#10221D]/70 font-medium">
              Supported formats: <strong className="text-[#F47721]">PDF, DOCX</strong> • Max file size: 15 MB
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-[#F5F2E6] border border-[#10221D]/15 text-[11px] font-bold text-[#10221D]/80 self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>Encrypted & Private</span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between text-rose-800 text-xs font-bold animate-fadeIn">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-rose-100 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <form onSubmit={handleUpload} className="space-y-3">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 ${
            dragActive
              ? 'border-[#F47721] bg-[#FFC400]/10 scale-[1.01]'
              : file
              ? 'border-emerald-600 bg-emerald-50/50'
              : 'border-[#10221D]/30 bg-[#F5F2E6] hover:border-[#10221D]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-xl bg-white border border-[#10221D]/20 text-[#10221D] flex items-center justify-center shadow-xs">
            {file ? (
              <FileText className="w-6 h-6 text-emerald-700" />
            ) : (
              <UploadCloud className="w-6 h-6 text-[#10221D]/70" />
            )}
          </div>

          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-black text-[#10221D]">
              {file ? file.name : 'Click to browse or drop your resume here'}
            </p>
            <p className="text-[11px] text-[#10221D]/60 font-medium">
              {file
                ? `${(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for AI ATS analysis`
                : 'Instant ATS scoring, skills extraction & job alignment'}
            </p>
          </div>

          {file && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-[11px] text-rose-700 font-bold hover:underline flex items-center space-x-1 pt-1"
            >
              <X className="w-3 h-3" />
              <span>Remove file</span>
            </button>
          )}
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={!file || uploading}
          className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-black text-[#FAF8F0] bg-[#10221D] hover:bg-[#1A332E] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 border border-[#10221D] shadow-xs min-h-[44px] cursor-pointer"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#FFC400]" />
              <span>Parsing Resume & Calculating ATS Score...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-[#FFC400]" />
              <span>{file ? 'Analyze Selected Resume' : 'Select a File to Analyze'}</span>
              {file && <ArrowRight className="w-4 h-4 text-[#FFC400]" />}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
