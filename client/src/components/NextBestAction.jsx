import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  UploadCloud, 
  FileText, 
  Briefcase, 
  Send, 
  PlayCircle, 
  CheckCircle2,
  Zap
} from 'lucide-react';

export default function NextBestAction({ 
  hasResume = false, 
  hasJobs = false, 
  hasCoverLetter = false, 
  hasApplications = false, 
  hasInterviews = false 
}) {
  const navigate = useNavigate();

  // Dynamic Next Best Action Logic based on candidate user flow state
  let action = {
    step: 'Step 1 of 5',
    title: 'Upload Your Resume to Start Your Career Journey',
    description: 'Our AI will parse your document, calculate your ATS Resume Score, and extract marketable technical skills.',
    buttonText: 'Upload Resume Now',
    icon: UploadCloud,
    path: '/resumes',
    bgBadge: 'bg-[#F5D90A] text-[#0F1E1B]',
  };

  if (hasResume && !hasJobs) {
    action = {
      step: 'Step 2 of 5',
      title: 'Explore Your Top AI Job Recommendations',
      description: 'Your resume has been analyzed! View tailored job openings matched to your target role and skill set.',
      buttonText: 'View Recommended Jobs',
      icon: Briefcase,
      path: '/career-hub?tab=jobs',
      bgBadge: 'bg-emerald-500 text-white',
    };
  } else if (hasResume && hasJobs && !hasCoverLetter) {
    action = {
      step: 'Step 3 of 5',
      title: 'Generate a Tailored AI Cover Letter',
      description: 'Create a personalized executive cover letter for your #1 matched job opening in seconds using OpenAI AI.',
      buttonText: 'Generate Cover Letter',
      icon: FileText,
      path: '/cover-letter',
      bgBadge: 'bg-[#C1440E] text-white',
    };
  } else if (hasResume && hasJobs && hasCoverLetter && !hasApplications) {
    action = {
      step: 'Step 4 of 5',
      title: 'Submit Your First Job Application',
      description: 'Apply to high-match target positions and track your application pipeline status.',
      buttonText: 'Apply & Track Job',
      icon: Send,
      path: '/career-hub?tab=jobs',
      bgBadge: 'bg-blue-600 text-white',
    };
  } else if (hasApplications && !hasInterviews) {
    action = {
      step: 'Step 5 of 5',
      title: 'Practice a 15-Minute AI Mock Interview',
      description: 'Prepare for upcoming technical loops with real-time AI questions, Whisper voice recognition, and Instant feedback.',
      buttonText: 'Start Mock Interview',
      icon: PlayCircle,
      path: '/new-session',
      bgBadge: 'bg-purple-600 text-white',
    };
  } else if (hasInterviews) {
    action = {
      step: 'Career Accelerator Active',
      title: 'Review Your AI Feedback & Practice Next Round',
      description: 'Analyze your technical scores, refine weak areas, and keep applying to reach your job offer goal.',
      buttonText: 'Continue Career Acceleration',
      icon: Zap,
      path: '/career-hub',
      bgBadge: 'bg-emerald-600 text-white',
    };
  }

  const Icon = action.icon;

  return (
    <div className="bg-[#FDFBF3] text-[#0F1E1B] border-3 border-[#0F1E1B] rounded-3xl p-6 sm:p-7 editorial-shadow-lg relative overflow-hidden space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${action.bgBadge}`}>
              {action.step}
            </span>
            <span className="text-xs font-bold text-[#C1440E] flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-[#F5D90A]" />
              <span>Next Recommended Action</span>
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black font-serif-headline text-[#0F1E1B]">
            {action.title}
          </h3>

          <p className="text-xs sm:text-sm text-[#0F1E1B]/80 max-w-xl font-sans-body leading-relaxed">
            {action.description}
          </p>
        </div>

        <button
          onClick={() => navigate(action.path)}
          className="px-6 py-3.5 rounded-2xl bg-[#0F1E1B] text-[#FDFBF3] font-black text-xs hover:bg-[#1A332E] transition-all flex items-center justify-center space-x-2 shrink-0 shadow-sm"
        >
          <Icon className="w-4 h-4 text-[#F5D90A]" />
          <span>{action.buttonText}</span>
          <ArrowRight className="w-4 h-4 text-[#F5D90A]" />
        </button>

      </div>
    </div>
  );
}
