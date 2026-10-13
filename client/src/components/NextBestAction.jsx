import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  UploadCloud, 
  Briefcase, 
  Send, 
  PlayCircle, 
  Trophy,
  Zap,
  Target
} from 'lucide-react';

export default function NextBestAction({ 
  hasResume = false, 
  hasJobs = false, 
  placementDrive = null,
  hasApplications = false, 
  completedInterviewsCount = 0,
  targetRole = 'Full Stack Engineer'
}) {
  const navigate = useNavigate();

  // Dynamic Next Best Action Logic based on actual persisted candidate state
  let action;

  if (!hasResume) {
    action = {
      step: 'Priority: Profile Foundation',
      title: 'Upload & Analyze Your Resume',
      description: 'Upload your resume in PDF/DOCX format to calculate your ATS compatibility score and extract verified skills for matching.',
      buttonText: 'Analyze Resume',
      icon: UploadCloud,
      path: '/resumes',
      bgBadge: 'bg-[#FFC400] text-[#10221D]',
    };
  } else if (hasResume && !hasApplications) {
    action = {
      step: 'Opportunity Discovery',
      title: `Explore AI Matched Jobs for ${targetRole}`,
      description: 'Your resume is analyzed! Discover curated job openings matched to your technical skills and submit applications to start your pipeline.',
      buttonText: 'Explore Career Hub',
      icon: Briefcase,
      path: '/career-hub?tab=jobs',
      bgBadge: 'bg-emerald-700 text-white',
    };
  } else if (!placementDrive || (placementDrive.status === 'in_progress' && (placementDrive.currentRound || 1) <= 4)) {
    const isStarted = placementDrive && placementDrive.status === 'in_progress';
    const roundNumber = placementDrive?.currentRound || 1;
    const roundNames = {
      1: 'Aptitude PYQs',
      2: 'Technical Interview',
      3: 'Group Discussion',
      4: 'Resume Deep-Dive',
    };
    const roundName = roundNames[roundNumber] || `Round ${roundNumber}`;
    action = {
      step: `Placement Drive • Round ${roundNumber} of 4`,
      title: isStarted ? `Continue Placement Arena: ${roundName}` : 'Start Your 4-Round AI Placement Drive',
      description: isStarted
        ? `Advance through your campus hiring gauntlet. Complete ${roundName} to build your placement readiness report.`
        : 'Take the 4-round hiring simulation: Aptitude PYQs, Technical Live Interview, AI Group Discussion, and Resume Evaluation.',
      buttonText: isStarted ? 'Continue Placement Arena' : 'Start Placement Drive',
      icon: Trophy,
      path: '/placement-drive',
      bgBadge: 'bg-[#F47721] text-white',
    };
  } else if (completedInterviewsCount === 0) {
    action = {
      step: 'Interview Loop Practice',
      title: `Practice Your First AI Mock Interview for ${targetRole}`,
      description: 'Simulate a live engineering loop with real-time feedback, STAR framework evaluation, and instant scoring before actual company screens.',
      buttonText: 'Practise Interview',
      icon: PlayCircle,
      path: '/new-session',
      bgBadge: 'bg-[#10221D] text-[#FFC400]',
    };
  } else if (hasApplications) {
    action = {
      step: 'Application Pipeline',
      title: 'Review Applications & Track Next Steps',
      description: 'Monitor your active job applications, scheduled interview rounds, and offer updates in your centralized Career Hub.',
      buttonText: 'Review Application Tracker',
      icon: Send,
      path: '/career-hub?tab=applications',
      bgBadge: 'bg-[#10221D] text-[#FAF8F0]',
    };
  } else {
    action = {
      step: 'Career Momentum',
      title: 'Sharpen Technical Skills & Interview Readiness',
      description: 'Review ATS recommendations, explore new matched opportunities, and run follow-up mock interview drills.',
      buttonText: 'Explore Career Hub',
      icon: Zap,
      path: '/career-hub',
      bgBadge: 'bg-[#FFC400] text-[#10221D]',
    };
  }

  const Icon = action.icon;

  return (
    <div className="bg-[#FDFBF3] text-[#10221D] border-2 border-[#10221D] rounded-2xl p-5 sm:p-6 editorial-shadow-sm relative overflow-hidden space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${action.bgBadge}`}>
              {action.step}
            </span>
            <span className="text-xs font-bold text-[#F47721] flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-[#FFC400]" />
              <span>Next Best Action</span>
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black font-serif-headline text-[#10221D]">
            {action.title}
          </h3>

          <p className="text-xs sm:text-sm text-[#10221D]/75 font-sans-body leading-relaxed">
            {action.description}
          </p>
        </div>

        <button
          onClick={() => navigate(action.path)}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#FFC400] text-[#10221D] hover:bg-[#E5B000] border-2 border-[#10221D] font-black text-xs transition-all flex items-center justify-center space-x-2 shrink-0 editorial-shadow-sm cursor-pointer"
        >
          <Icon className="w-4 h-4 text-[#10221D]" />
          <span>{action.buttonText}</span>
          <ArrowRight className="w-4 h-4 text-[#10221D]" />
        </button>

      </div>
    </div>
  );
}
