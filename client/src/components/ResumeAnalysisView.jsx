import React from 'react';
import { 
  FileText, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  Briefcase, 
  GraduationCap, 
  FolderGit2, 
  Sparkles, 
  Target
} from 'lucide-react';

export default function ResumeAnalysisView({ resume }) {
  if (!resume || !resume.parsedData) {
    return (
      <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-8 text-center space-y-3">
        <FileText className="w-10 h-10 text-[#0F1E1B]/40 mx-auto" />
        <h3 className="text-base font-bold font-serif-headline text-[#0F1E1B]">No Uploaded Resume Analyzed</h3>
        <p className="text-xs text-[#0F1E1B]/70 max-w-md mx-auto">
          Upload your resume in PDF/DOCX format under <strong>My Resumes</strong> to generate instant ATS score breakdown, strengths, and targeted skill recommendations.
        </p>
      </div>
    );
  }

  const {
    atsScore = 85,
    targetRole = 'Full Stack Engineer',
    skills = [],
    experience = [],
    education = [],
    projects = [],
    certifications = [],
    strengths = [],
    weaknesses = [],
    summary = '',
  } = resume.parsedData;

  return (
    <div className="space-y-6">
      
      {/* ATS Score & Overview Banner */}
      <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-[#F5D90A] text-[#0F1E1B] border border-[#0F1E1B] text-xs font-black">
            <Target className="w-3.5 h-3.5" />
            <span>Target Role: {targetRole}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-serif-headline text-[#0F1E1B]">
            ATS Resume Optimization Analysis
          </h2>
          <p className="text-xs text-[#0F1E1B]/80 max-w-xl leading-relaxed">
            {summary || 'Analyzed resume profile highlighting ATS keyword compatibility, experience density, and skill alignment.'}
          </p>
        </div>

        {/* ATS Score Gauge Badge */}
        <div className="bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl p-5 text-center min-w-[160px] shadow-xs shrink-0">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#C1440E]">
            ATS Score
          </span>
          <div className="text-4xl font-black font-serif-headline text-[#0F1E1B] my-1">
            {atsScore}<span className="text-base text-[#0F1E1B]/60 font-bold">/100</span>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-800 border border-emerald-500/30">
            {atsScore >= 80 ? 'Excellent Match' : atsScore >= 65 ? 'Good Quality' : 'Needs Optimization'}
          </span>
        </div>

      </div>

      {/* Strengths and Weaknesses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Resume Strengths */}
        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold font-serif-headline">Key Strengths</h3>
          </div>
          <ul className="space-y-2">
            {(strengths.length > 0
              ? strengths
              : [
                  'Strong technical skill density for fullstack engineering roles.',
                  'Clear project impact metrics and modern toolchain keywords.',
                  'Solid education credentials matching industry benchmarks.',
                ]
            ).map((str, idx) => (
              <li key={idx} className="flex items-start space-x-2 text-xs font-bold text-[#0F1E1B]">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Resume Weaknesses & Recommendations */}
        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-[#C1440E]">
            <AlertTriangle className="w-5 h-5 text-[#C1440E]" />
            <h3 className="text-base font-bold font-serif-headline">Areas for ATS Improvement</h3>
          </div>
          <ul className="space-y-2">
            {(weaknesses.length > 0
              ? weaknesses
              : [
                  'Include more quantitative achievements (e.g. reduced load times by 40%).',
                  'Add cloud devops keywords (Docker, AWS, Kubernetes) for senior roles.',
                  'Ensure standard section headers for ATS parser readability.',
                ]
            ).map((wk, idx) => (
              <li key={idx} className="flex items-start space-x-2 text-xs font-bold text-[#0F1E1B]">
                <span className="text-[#C1440E] font-bold">•</span>
                <span>{wk}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Extracted Profile Details Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Extracted Skills */}
        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-[#F5D90A]" />
            <h3 className="text-base font-bold font-serif-headline text-[#0F1E1B]">
              Extracted Skills ({skills.length})
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {skills.map((sk, i) => (
              <span key={i} className="px-2.5 py-1 rounded-xl bg-[#F5F2E6] border border-[#0F1E1B]/20 text-xs font-bold text-[#0F1E1B]">
                {sk}
              </span>
            ))}
          </div>
        </div>

        {/* Work Experience Summary */}
        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-[#0F1E1B]" />
            <h3 className="text-base font-bold font-serif-headline text-[#0F1E1B]">
              Work Experience
            </h3>
          </div>
          <div className="space-y-3 pt-1">
            {experience.length > 0 ? (
              experience.map((exp, idx) => (
                <div key={idx} className="border-l-2 border-[#C1440E] pl-3 py-0.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-[#0F1E1B]">{exp.title || 'Software Engineer'}</h4>
                    <span className="text-[10px] font-bold text-[#0F1E1B]/60">{exp.duration || '2022 - Present'}</span>
                  </div>
                  <p className="text-[11px] font-bold text-[#C1440E]">{exp.company || 'Tech Company'}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#0F1E1B]/70 italic">No structured work experience parsed.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
