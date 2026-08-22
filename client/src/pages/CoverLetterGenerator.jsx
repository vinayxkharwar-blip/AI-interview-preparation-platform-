import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { 
  FileText, 
  Sparkles, 
  Copy, 
  Download, 
  Edit3, 
  Check, 
  ArrowLeft, 
  Building2, 
  Briefcase
} from 'lucide-react';

export default function CoverLetterGenerator() {
  const location = useLocation();
  const navigate = useNavigate();

  const [company, setCompany] = useState(location.state?.company || '');
  const [role, setRole] = useState(location.state?.role || '');
  const [jobDescription, setJobDescription] = useState(location.state?.jobDescription || '');

  const [loading, setLoading] = useState(false);
  const [coverLetterContent, setCoverLetterContent] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!company || !role) {
      alert('Please fill in Company Name and Target Role.');
      return;
    }

    setLoading(true);
    try {
      const res = await axiosClient.post('/cover-letter', { company, role, jobDescription });
      if (res.data?.coverLetter) {
        setCoverLetterContent(res.data.coverLetter.content);
      } else {
        alert(res.data?.message || 'Failed to generate cover letter.');
      }
    } catch (err) {
      console.error(err);
      alert('Error generating cover letter: ' + (err.userMessage || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.company && location.state?.role) {
      handleGenerate();
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetterContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([coverLetterContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Cover_Letter_${company.replace(/\s+/g, '_')}_${role.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/career-hub')}
          className="px-3.5 py-1.5 rounded-xl border-2 border-[#0F1E1B] bg-[#FDFBF3] text-xs font-bold text-[#0F1E1B] hover:bg-[#F5F2E6] transition-all flex items-center space-x-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Career Hub</span>
        </button>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-[#0F1E1B] text-[#F5D90A] flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-serif-headline text-[#0F1E1B]">
            AI Cover Letter Writer
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form Inputs */}
        <div className="lg:col-span-5 bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-5 space-y-4 shadow-sm">
          <h2 className="text-base font-bold font-serif-headline text-[#0F1E1B] flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-[#C1440E]" />
            <span>Job Details</span>
          </h2>

          <form onSubmit={handleGenerate} className="space-y-3">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0F1E1B] mb-1">
                Company Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Stripe, Vercel, Google"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-[#0F1E1B]/30 text-xs font-bold text-[#0F1E1B] bg-[#F5F2E6] focus:outline-none focus:border-[#0F1E1B]"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0F1E1B] mb-1">
                Target Role / Job Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Full Stack Engineer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-[#0F1E1B]/30 text-xs font-bold text-[#0F1E1B] bg-[#F5F2E6] focus:outline-none focus:border-[#0F1E1B]"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0F1E1B] mb-1">
                Job Description Overview (Optional)
              </label>
              <textarea
                rows={4}
                placeholder="Paste key responsibilities or tech stack requirements to tailor the cover letter..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#0F1E1B]/30 text-xs font-medium text-[#0F1E1B] bg-[#F5F2E6] focus:outline-none focus:border-[#0F1E1B] font-sans-body"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#0F1E1B] text-[#FDFBF3] font-bold text-xs hover:bg-[#1A332E] transition-all flex items-center justify-center space-x-2 shadow-xs"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 text-[#F5D90A] animate-spin" />
                  <span>Drafting Cover Letter via OpenAI AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#F5D90A]" />
                  <span>Generate AI Cover Letter</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Output Editor */}
        <div className="lg:col-span-7 bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
          
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#0F1E1B]/10 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#C1440E]" />
                <h2 className="text-base font-bold font-serif-headline text-[#0F1E1B]">
                  Tailored Cover Letter
                </h2>
              </div>

              {coverLetterContent && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1 rounded-lg border border-[#0F1E1B]/20 bg-[#F5F2E6] text-xs font-bold text-[#0F1E1B] hover:bg-[#E6E4DC] flex items-center space-x-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleDownload}
                    className="px-2.5 py-1 rounded-lg border border-[#0F1E1B]/20 bg-[#F5F2E6] text-xs font-bold text-[#0F1E1B] hover:bg-[#E6E4DC] flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5 text-[#C1440E]" />
                    <span>Download</span>
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="py-20 text-center space-y-3">
                <Sparkles className="w-10 h-10 text-[#F5D90A] animate-bounce mx-auto" />
                <p className="text-xs font-bold text-[#0F1E1B]">Generating personalized executive cover letter...</p>
              </div>
            ) : coverLetterContent ? (
              <textarea
                value={coverLetterContent}
                onChange={(e) => setCoverLetterContent(e.target.value)}
                rows={14}
                className="w-full p-4 rounded-xl border border-[#0F1E1B]/20 bg-[#F5F2E6] text-xs font-medium text-[#0F1E1B] leading-relaxed focus:outline-none focus:border-[#0F1E1B] font-sans-body resize-y"
              />
            ) : (
              <div className="py-16 text-center space-y-2 border-2 border-dashed border-[#0F1E1B]/20 rounded-xl bg-[#F5F2E6]/50">
                <FileText className="w-8 h-8 text-[#0F1E1B]/30 mx-auto" />
                <p className="text-xs font-bold text-[#0F1E1B]/70">Enter Company and Role on the left to generate your custom cover letter.</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
