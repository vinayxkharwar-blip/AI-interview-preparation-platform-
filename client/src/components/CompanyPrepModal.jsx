import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  Briefcase, 
  Sparkles, 
  PlayCircle, 
  X, 
  CheckCircle2, 
  HelpCircle, 
  TrendingUp,
  Award
} from 'lucide-react';

export default function CompanyPrepModal({ job, onClose }) {
  const navigate = useNavigate();

  if (!job) return null;

  const handleStartInterview = () => {
    onClose();
    navigate('/new-session', {
      state: {
        targetRole: job.title,
        focusTopic: `${job.company} - ${job.title}`,
      },
    });
  };

  const sampleQuestions = [
    `How would you design a scalable microservice architecture for ${job.company}'s core business?`,
    `Walk us through a technical challenge you solved using ${job.skills?.[0] || 'React'} or ${job.skills?.[1] || 'Node.js'}.`,
    `Explain how you ensure low latency, high availability, and database transaction integrity under load.`,
    `Why do you want to join ${job.company} as a ${job.title}?`,
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#0F1E1B]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn font-sans-body">
      <div className="bg-[#FDFBF3] text-[#0F1E1B] border-3 border-[#0F1E1B] rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 relative editorial-shadow-lg">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-[#F5F2E6] border border-[#0F1E1B]/20 text-[#0F1E1B] hover:bg-[#E6E4DC] transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Company Header */}
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0F1E1B]/5 border border-[#0F1E1B]/15 overflow-hidden flex items-center justify-center shrink-0">
            {job.logo ? (
              <img src={job.logo} alt={job.company} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-7 h-7 text-[#0F1E1B]/70" />
            )}
          </div>
          <div>
            <span className="text-xs font-black uppercase text-[#C1440E] tracking-wider">
              Company Interview Preparation Studio
            </span>
            <h2 className="text-xl sm:text-2xl font-black font-serif-headline text-[#0F1E1B]">
              {job.company} • {job.title}
            </h2>
            <div className="flex items-center space-x-3 text-xs font-bold text-[#0F1E1B]/70 mt-1">
              <span>📍 {job.location || 'Remote'}</span>
              <span>💵 {job.salary || '$120k - $160k'}</span>
              <span className="text-emerald-800 font-extrabold">⚡ {job.matchPercentage || 92}% Match</span>
            </div>
          </div>
        </div>

        {/* Interview Loop Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase text-[#C1440E]">Interview Process</span>
            <p className="font-bold text-[#0F1E1B]">4 Rounds (Recruiter, Tech Screening, System Design, Culture)</p>
          </div>
          <div className="p-3.5 bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase text-[#C1440E]">Hiring Velocity</span>
            <p className="font-bold text-emerald-800">Fast Track (10-14 Days)</p>
          </div>
          <div className="p-3.5 bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase text-[#C1440E]">Target Skills</span>
            <p className="font-bold text-[#0F1E1B]">{(job.skills || ['React', 'Node']).slice(0, 3).join(', ')}</p>
          </div>
        </div>

        {/* Expected Interview Questions */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold font-serif-headline text-[#0F1E1B] flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-[#C1440E]" />
            <span>Top Predicted Interview Questions for {job.company}</span>
          </h3>
          <div className="space-y-2">
            {sampleQuestions.map((q, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[#F5F2E6] border border-[#0F1E1B]/20 text-xs font-bold text-[#0F1E1B] flex items-start space-x-2">
                <span className="text-[#C1440E] font-black">{idx + 1}.</span>
                <span>{q}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-[#0F1E1B]/15 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#0F1E1B]/70 font-semibold">
            💡 AI will automatically load {job.company}'s tech stack for your mock session.
          </div>

          <button
            onClick={handleStartInterview}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#0F1E1B] text-[#FDFBF3] font-bold text-xs hover:bg-[#1A332E] transition-all flex items-center justify-center space-x-2 editorial-shadow"
          >
            <PlayCircle className="w-4 h-4 text-[#F5D90A]" />
            <span>Start Practice Interview Loop</span>
          </button>
        </div>

      </div>
    </div>
  );
}
