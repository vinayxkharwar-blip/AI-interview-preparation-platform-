import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Mic,
  FileText,
  Award,
  TrendingUp,
  Play,
  CheckCircle2,
  ArrowRight,
  Plus,
  Minus,
  Star,
  Zap,
  Check,
  Globe,
  Twitter,
  Github,
  Linkedin,
  Mail,
  X,
  Volume2,
  ShieldCheck,
  Users,
  Briefcase
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterSubmitted(true);
      setTimeout(() => setNewsletterSubmitted(false), 4000);
      setNewsletterEmail('');
    }
  };

  const faqData = [
    {
      question: 'How realistic are the AI-generated technical & behavioral questions?',
      answer:
        'Our AI models generate role-specific questions benchmarked against real interview loops at top technology companies (FAANG, Unicorn startups). Questions adapt dynamically based on your uploaded resume details, target role, and selected difficulty level.',
    },
    {
      question: 'Can I practice with real voice recording instead of typing?',
      answer:
        'Yes! PrepPulse features real-time speech-to-text recording powered by OpenAI Whisper. You speak directly into your microphone, simulating a live video interview. Our AI analyzes speech pacing, tone, and filler words.',
    },
    {
      question: 'What kind of feedback do I receive after a mock interview session?',
      answer:
        'After completing a session, you get a comprehensive score report broken down by core competencies: STAR method compliance, technical key points covered, strengths, areas for improvement, and a personalized step-by-step study plan.',
    },
    {
      question: 'Is my resume data kept private and confidential?',
      answer:
        '100% confidential. Your uploaded resume and interview audio recordings are encrypted in transit and at rest. We never sell your data or use your private resume for public model training.',
    },
    {
      question: 'Do you support custom job descriptions for recruiters and companies?',
      answer:
        'Yes! Recruiters and hiring managers can upload custom Job Descriptions to generate tailored automated candidate screeners and standardized scoring rubrics.',
    },
  ];

  return (
    <div className="bg-[#E6E4DC] min-h-screen p-3 sm:p-5 lg:p-8 font-sans-body selection:bg-[#F5D90A] selection:text-[#0F1E1B]">
      {/* Outer Rounded Container */}
      <div className="max-w-[1500px] mx-auto bg-[#FDFBF3] text-[#0F1E1B] rounded-3xl sm:rounded-[2.5rem] border-2 border-[#0F1E1B] editorial-shadow-lg overflow-hidden relative">
        
        {/* ================= 1. NAVBAR ================= */}
        <header className="px-3 sm:px-6 lg:px-10 py-3 sm:py-5 border-b border-[#0F1E1B]/10 flex items-center justify-between relative z-20 bg-[#FDFBF3]/90 backdrop-blur-md sticky top-0 gap-2">
          {/* Logo Left */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#0F1E1B] text-[#FDFBF3] flex items-center justify-center font-bold text-lg sm:text-xl group-hover:scale-105 transition-transform shadow-md shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#F5D90A]" />
            </div>
            <span className="font-serif-headline text-lg sm:text-2xl font-black tracking-tight text-[#0F1E1B] whitespace-nowrap">
              PrepPulse<span className="text-[#C1440E]">.ai</span>
            </span>
          </Link>

          {/* Centered Nav Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-[#0F1E1B]/80">
            <a href="#features" className="hover:text-[#0F1E1B] hover:underline decoration-[#F5D90A] decoration-2 underline-offset-4 transition-colors">
              Features
            </a>
            <a href="#businesses" className="hover:text-[#0F1E1B] hover:underline decoration-[#F5D90A] decoration-2 underline-offset-4 transition-colors">
              For Businesses
            </a>
            <a href="#recruiters" className="hover:text-[#0F1E1B] hover:underline decoration-[#F5D90A] decoration-2 underline-offset-4 transition-colors">
              For Recruiters
            </a>
            <a href="#faq" className="hover:text-[#0F1E1B] hover:underline decoration-[#F5D90A] decoration-2 underline-offset-4 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Buttons Right */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            <Link
              to="/login"
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold border-2 border-[#0F1E1B] text-[#0F1E1B] hover:bg-[#0F1E1B] hover:text-[#FDFBF3] transition-all whitespace-nowrap"
            >
              Log In
            </Link>
            <Link
              to="/register"
              className="px-3.5 sm:px-5 py-1.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#0F1E1B] text-[#FDFBF3] hover:bg-[#1A332E] hover:scale-105 transition-all editorial-shadow-sm flex items-center space-x-1 sm:space-x-1.5 whitespace-nowrap"
            >
              <span>Try Free</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F5D90A]" />
            </Link>
          </div>
        </header>

        {/* ================= 2. HERO SECTION ================= */}
        <section className="relative px-6 sm:px-12 pt-12 pb-16 lg:pt-20 lg:pb-24 overflow-hidden">
          
          {/* Floating Doodle Notes - Left */}
          <div className="hidden lg:block absolute left-6 top-24 transform -rotate-6 z-10 hover:rotate-0 transition-transform duration-300 pointer-events-auto">
            <div className="bg-[#FEF08A] border-2 border-[#0F1E1B] p-3.5 rounded-2xl editorial-shadow w-52">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#0F1E1B] mb-1">
                <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                <span>98.4% STAR Accuracy</span>
              </div>
              <p className="text-[11px] text-[#0F1E1B]/80 font-medium">Evaluates Situation, Task, Action & Result automatically.</p>
            </div>
          </div>

          <div className="hidden lg:block absolute left-10 top-72 transform rotate-6 z-10 hover:rotate-0 transition-transform duration-300 pointer-events-auto">
            <div className="bg-[#DCFCE7] border-2 border-[#0F1E1B] p-3.5 rounded-2xl editorial-shadow w-48">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#0F1E1B] mb-1">
                <Mic className="w-4 h-4 text-indigo-700" />
                <span>Whisper Voice Analysis</span>
              </div>
              <p className="text-[11px] text-[#0F1E1B]/80 font-medium">Real-time speech-to-text transcript & tone feedback.</p>
            </div>
          </div>

          {/* Floating Doodle Notes - Right */}
          <div className="hidden lg:block absolute right-8 top-20 transform rotate-3 z-10 hover:rotate-0 transition-transform duration-300 pointer-events-auto">
            <div className="bg-[#FCE7F3] border-2 border-[#0F1E1B] p-3.5 rounded-2xl editorial-shadow w-52">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#0F1E1B] mb-1">
                <FileText className="w-4 h-4 text-rose-700" />
                <span>Resume Match Score</span>
              </div>
              <p className="text-[11px] text-[#0F1E1B]/80 font-medium">Parses PDF/DOCX skills & generates targeted drills.</p>
            </div>
          </div>

          <div className="hidden lg:block absolute right-12 top-68 transform -rotate-6 z-10 hover:rotate-0 transition-transform duration-300 pointer-events-auto">
            <div className="bg-[#F3E8FF] border-2 border-[#0F1E1B] p-3.5 rounded-2xl editorial-shadow w-52">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#0F1E1B] mb-1">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>15,000+ Mock Loops</span>
              </div>
              <p className="text-[11px] text-[#0F1E1B]/80 font-medium">Practiced by engineers at Stripe, Google & Meta.</p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            {/* Top Pill Badge */}
            <div className="inline-flex items-center space-x-2 bg-[#F5F2E6] border-2 border-[#0F1E1B] px-4 py-1.5 rounded-full text-xs font-bold text-[#0F1E1B] mb-8 shadow-sm">
              <Sparkles className="w-4 h-4 text-[#C1440E]" />
              <span>AI-POWERED INTERVIEW INTELLIGENCE</span>
              <span className="bg-[#F5D90A] text-[#0F1E1B] text-[10px] px-2 py-0.5 rounded-full font-black uppercase">v2.4 Live</span>
            </div>

            {/* 2-Line Large Serif Headline with Yellow Highlight */}
            <h1 className="font-serif-headline text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#0F1E1B] leading-[1.12] mb-6">
              Master Technical & HR Interviews with{' '}
              <span className="yellow-highlight px-3 py-0.5 rounded-lg border-2 border-[#0F1E1B] shadow-sm">
                AI Real-Time Feedback
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-xl text-[#0F1E1B]/80 font-medium max-w-2xl mx-auto leading-relaxed mb-10">
              Upload your resume, speak naturally into your microphone, and get instant STAR-method scoring, technical key point checks, and actionable growth roadmaps.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold bg-[#0F1E1B] text-[#FDFBF3] hover:bg-[#1A332E] hover:scale-105 transition-all editorial-shadow flex items-center justify-center space-x-3 group"
              >
                <span>Start Free Mock Interview</span>
                <ArrowRight className="w-5 h-5 text-[#F5D90A] group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={() => setShowVideoModal(true)}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold border-2 border-[#0F1E1B] text-[#0F1E1B] hover:bg-[#0F1E1B]/5 transition-all flex items-center justify-center space-x-2"
              >
                <Play className="w-5 h-5 fill-[#0F1E1B] text-[#0F1E1B]" />
                <span>Watch 2-Min Demo</span>
              </button>
            </div>

            {/* Trusted By Logo Strip */}
            <div className="pt-8 border-t border-[#0F1E1B]/10">
              <p className="text-xs font-bold tracking-widest text-[#0F1E1B]/60 uppercase mb-6">
                Trusted by ambitious candidates at leading tech teams
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-80 grayscale hover:grayscale-0 transition-all">
                <span className="font-serif-headline font-bold text-xl sm:text-2xl text-[#0F1E1B] tracking-tight">Stripe</span>
                <span className="font-sans-body font-black text-lg sm:text-xl text-[#0F1E1B] tracking-wider">GOOGLE</span>
                <span className="font-sans-body font-extrabold text-lg sm:text-xl text-[#0F1E1B] italic">linear</span>
                <span className="font-serif-headline font-semibold text-lg sm:text-xl text-[#0F1E1B]">Notion</span>
                <span className="font-sans-body font-black text-lg sm:text-xl text-[#0F1E1B] tracking-widest">▲ Vercel</span>
                <span className="font-serif-headline font-bold text-lg sm:text-xl text-[#0F1E1B]">Meta</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 3. HERO MEDIA SHOWCASE ================= */}
        <section className="px-6 sm:px-12 pb-16">
          <div className="max-w-5xl mx-auto relative group">
            {/* Colored Border Frame */}
            <div className="bg-[#0F1E1B] p-3 sm:p-4 rounded-3xl sm:rounded-[2.5rem] editorial-shadow-lg relative overflow-hidden">
              {/* Showcase Screen Container */}
              <div className="bg-[#090D16] rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-slate-100 relative overflow-hidden border border-slate-800">
                {/* Header Row */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-mono text-slate-400 ml-2">PrepPulse Session #482 • Full Stack Engineer</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>AI Evaluator Active</span>
                  </div>
                </div>

                {/* Main Session Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Question Card */}
                  <div className="md:col-span-2 bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                      <span>Question 2 of 5 • Technical Architecture</span>
                      <span className="bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full">Mid-Senior</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                      "Explain how memory management and event-loop blocking differ in Node.js vs multi-threaded environments."
                    </h3>

                    {/* Audio Waveform & Speech-to-Text Live Transcript */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center space-x-2">
                          <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
                          <span className="text-emerald-300 font-medium">Candidate Voice Response (Recording...)</span>
                        </div>
                        <span className="font-mono text-slate-300">01:42 / 03:00</span>
                      </div>

                      {/* Simulated Audio Bars */}
                      <div className="flex items-center space-x-1 h-8 px-2 bg-slate-900 rounded-lg overflow-hidden">
                        {[40, 70, 30, 90, 60, 100, 45, 80, 65, 30, 85, 95, 40, 60, 75, 90, 50, 80, 45, 90, 70, 35, 60].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-indigo-500 to-emerald-400 rounded-full transition-all duration-300"
                            style={{ height: `${h}%` }}
                          ></div>
                        ))}
                      </div>

                      <p className="text-xs text-slate-300 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                        "In Node.js, the event loop operates on a single thread using v8 engine heap memory. When asynchronous operations execute, non-blocking callbacks are delegated to the libuv thread pool..."
                      </p>
                    </div>
                  </div>

                  {/* AI Live Feedback Panel */}
                  <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Live AI Analysis</div>
                      <div className="space-y-3">
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <div className="text-xs text-slate-400 mb-1">Overall Match Score</div>
                          <div className="text-2xl font-bold text-emerald-400">88%</div>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between text-slate-300">
                            <span>STAR Method Alignment</span>
                            <span className="text-emerald-400 font-bold">92%</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Technical Depth</span>
                            <span className="text-indigo-400 font-bold">85%</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Speech Clarity & Pacing</span>
                            <span className="text-emerald-400 font-bold">90%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/40 text-xs text-indigo-200">
                      💡 <strong>Tip:</strong> Mention V8 garbage collection generational cycles to boost your score to 95%.
                    </div>
                  </div>
                </div>
              </div>

              {/* Play Overlay Button */}
              <div className="absolute inset-0 bg-[#0F1E1B]/30 backdrop-blur-[2px] flex items-center justify-center group-hover:bg-[#0F1E1B]/20 transition-all">
                <button
                  onClick={() => setShowVideoModal(true)}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#F5D90A] text-[#0F1E1B] border-4 border-[#0F1E1B] flex items-center justify-center shadow-2xl hover:scale-110 transition-transform group-hover:rotate-6"
                >
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-[#0F1E1B] ml-1" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 4. FEATURE SECTION ON BURNT-ORANGE BACKGROUND ================= */}
        <section id="features" className="px-6 sm:px-12 my-12">
          <div className="bg-[#C1440E] text-[#FDFBF3] rounded-3xl sm:rounded-[2.5rem] p-8 sm:p-14 border-4 border-[#0F1E1B] editorial-shadow-lg relative overflow-hidden">
            
            {/* Background Texture Accents */}
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#F5D90A]/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Section Header */}
            <div className="max-w-3xl mb-12">
              <span className="inline-block bg-[#FDFBF3] text-[#C1440E] px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-4 shadow-sm">
                Engineered For Job Candidates & Recruiters
              </span>
              <h2 className="font-serif-headline text-3xl sm:text-5xl font-bold leading-tight mb-4 text-[#FDFBF3]">
                Turn Interview Anxiety into Confident Job Offers.
              </h2>
              <p className="text-base sm:text-lg text-[#FDFBF3]/90 font-medium leading-relaxed">
                Everything you need to practice, refine, and perfect your responses before stepping into high-stakes interviews.
              </p>
            </div>

            {/* 2x2 Grid of Sticky-Note-Style Cards (Rotated Pastels) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              
              {/* Sticky Note 1 - Pink */}
              <div className="bg-[#FCE7F3] text-[#0F1E1B] p-8 rounded-2xl border-3 border-[#0F1E1B] editorial-shadow transform -rotate-1 hover:rotate-0 hover:-translate-y-1 transition-all duration-300 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#0F1E1B] text-[#FCE7F3] flex items-center justify-center font-bold text-xl shadow-md">
                  <FileText className="w-6 h-6 text-[#F5D90A]" />
                </div>
                <h3 className="font-serif-headline text-2xl font-bold text-[#0F1E1B]">
                  Smart Resume Parsing
                </h3>
                <p className="text-sm sm:text-base text-[#0F1E1B]/80 font-medium leading-relaxed">
                  Upload any PDF or DOCX resume. Our parser automatically extracts your tech stack, key projects, and generates custom interview questions matched to your exact seniority level.
                </p>
                <div className="pt-2 flex items-center space-x-2 text-xs font-bold text-[#C1440E]">
                  <span>Supports PDF, DOCX, DOC</span>
                  <span>•</span>
                  <span>Instant Skill Extraction</span>
                </div>
              </div>

              {/* Sticky Note 2 - Lavender */}
              <div className="bg-[#F3E8FF] text-[#0F1E1B] p-8 rounded-2xl border-3 border-[#0F1E1B] editorial-shadow transform rotate-2 hover:rotate-0 hover:-translate-y-1 transition-all duration-300 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#0F1E1B] text-[#F3E8FF] flex items-center justify-center font-bold text-xl shadow-md">
                  <Mic className="w-6 h-6 text-[#F5D90A]" />
                </div>
                <h3 className="font-serif-headline text-2xl font-bold text-[#0F1E1B]">
                  Real-Time Speech & Tone Feedback
                </h3>
                <p className="text-sm sm:text-base text-[#0F1E1B]/80 font-medium leading-relaxed">
                  Speak naturally into your microphone. OpenAI Whisper transcribes your voice in real time, detecting filler words, speech velocity, confidence indicators, and overall response clarity.
                </p>
                <div className="pt-2 flex items-center space-x-2 text-xs font-bold text-[#C1440E]">
                  <span>Whisper STT Engine</span>
                  <span>•</span>
                  <span>Filler Word Counter</span>
                </div>
              </div>

              {/* Sticky Note 3 - Mint */}
              <div className="bg-[#DCFCE7] text-[#0F1E1B] p-8 rounded-2xl border-3 border-[#0F1E1B] editorial-shadow transform -rotate-2 hover:rotate-0 hover:-translate-y-1 transition-all duration-300 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#0F1E1B] text-[#DCFCE7] flex items-center justify-center font-bold text-xl shadow-md">
                  <Award className="w-6 h-6 text-[#F5D90A]" />
                </div>
                <h3 className="font-serif-headline text-2xl font-bold text-[#0F1E1B]">
                  Behavioral & STAR Method Scoring
                </h3>
                <p className="text-sm sm:text-base text-[#0F1E1B]/80 font-medium leading-relaxed">
                  Get instant feedback on your Situation, Task, Action, and Result coverage. Identify missing technical key points and structural gaps before real interviewers notice them.
                </p>
                <div className="pt-2 flex items-center space-x-2 text-xs font-bold text-[#C1440E]">
                  <span>STAR Compliance Report</span>
                  <span>•</span>
                  <span>Key Points Check</span>
                </div>
              </div>

              {/* Sticky Note 4 - Yellow */}
              <div className="bg-[#FEF9C3] text-[#0F1E1B] p-8 rounded-2xl border-3 border-[#0F1E1B] editorial-shadow transform rotate-1 hover:rotate-0 hover:-translate-y-1 transition-all duration-300 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#0F1E1B] text-[#FEF9C3] flex items-center justify-center font-bold text-xl shadow-md">
                  <TrendingUp className="w-6 h-6 text-[#C1440E]" />
                </div>
                <h3 className="font-serif-headline text-2xl font-bold text-[#0F1E1B]">
                  Custom Growth Roadmaps
                </h3>
                <p className="text-sm sm:text-base text-[#0F1E1B]/80 font-medium leading-relaxed">
                  Receive tailored study guides, weak-spot drills, and key topic recommendations to systematically raise your performance score session after session.
                </p>
                <div className="pt-2 flex items-center space-x-2 text-xs font-bold text-[#C1440E]">
                  <span>Personalized Action Plan</span>
                  <span>•</span>
                  <span>Analytics Tracking</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ================= 5. FAQ SECTION ================= */}
        <section id="faq" className="px-6 sm:px-12 py-16">
          <div className="max-w-4xl mx-auto">
            {/* Section Heading */}
            <div className="text-center mb-12">
              <span className="inline-block bg-[#F5D90A] text-[#0F1E1B] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 border border-[#0F1E1B]">
                Got Questions?
              </span>
              <h2 className="font-serif-headline text-3xl sm:text-5xl font-bold text-[#0F1E1B] mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-base sm:text-lg text-[#0F1E1B]/75 font-medium max-w-xl mx-auto">
                Everything you need to know about how our AI interview preparation platform works.
              </p>
            </div>

            {/* Accordion List */}
            <div className="space-y-4">
              {faqData.map((faq, index) => {
                const isExpanded = expandedFaq === index;
                return (
                  <div
                    key={index}
                    onClick={() => toggleFaq(index)}
                    className={`border-2 border-[#0F1E1B] rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden ${
                      isExpanded
                        ? 'bg-[#F3E8FF] editorial-shadow p-6'
                        : 'bg-[#F5F2E6] hover:bg-[#EFEAD8] p-5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif-headline text-lg sm:text-xl font-bold text-[#0F1E1B] pr-4">
                        {faq.question}
                      </h3>
                      <div
                        className={`w-8 h-8 rounded-full border-2 border-[#0F1E1B] flex items-center justify-center shrink-0 transition-transform ${
                          isExpanded ? 'bg-[#0F1E1B] text-[#F5D90A] rotate-180' : 'bg-[#FDFBF3] text-[#0F1E1B]'
                        }`}
                      >
                        {isExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[#0F1E1B]/15 text-sm sm:text-base text-[#0F1E1B]/85 font-medium leading-relaxed animate-fadeIn">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= 6. BOTTOM CTA BANNER ================= */}
        <section className="px-6 sm:px-12 my-12">
          <div className="bg-[#F5D90A] border-4 border-[#0F1E1B] rounded-3xl sm:rounded-[2.5rem] p-8 sm:p-14 text-[#0F1E1B] editorial-shadow-lg relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
            
            {/* Left Column Text & Buttons */}
            <div className="max-w-2xl space-y-6 relative z-10 text-center lg:text-left">
              <h2 className="font-serif-headline text-3xl sm:text-5xl font-bold text-[#0F1E1B] leading-tight">
                Ready to land your dream job offer with confidence?
              </h2>
              <p className="text-base sm:text-lg text-[#0F1E1B]/85 font-medium leading-relaxed">
                Join over 15,000 engineers, product managers, and professionals who practice mock interviews with PrepPulse AI.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold bg-[#0F1E1B] text-[#FDFBF3] hover:bg-[#1A332E] hover:scale-105 transition-all editorial-shadow flex items-center justify-center space-x-2"
                >
                  <span>Start Practice Session Free</span>
                  <ArrowRight className="w-5 h-5 text-[#F5D90A]" />
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold border-2 border-[#0F1E1B] text-[#0F1E1B] hover:bg-[#0F1E1B]/10 transition-all flex items-center justify-center"
                >
                  Schedule Recruiter Demo
                </Link>
              </div>
            </div>

            {/* Right Column Line-Art / Badge Illustration */}
            <div className="relative shrink-0">
              <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border-4 border-[#0F1E1B] bg-[#FDFBF3] p-6 flex flex-col items-center justify-center text-center editorial-shadow transform rotate-3 hover:rotate-0 transition-transform">
                <Star className="w-10 h-10 text-[#C1440E] fill-[#C1440E] mb-2" />
                <span className="font-serif-headline text-2xl font-black text-[#0F1E1B]">100% FREE</span>
                <span className="text-xs font-bold text-[#0F1E1B]/80 uppercase tracking-wider mt-1">No Credit Card Needed</span>
                <span className="text-[10px] text-emerald-700 font-extrabold mt-2 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  Instant Setup
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 7. FOOTER ================= */}
        <footer className="bg-[#0F1E1B] text-[#FDFBF3] pt-16 pb-0 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 sm:px-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
              
              {/* Col 1: Logo & Newsletter */}
              <div className="md:col-span-2 space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F5D90A] text-[#0F1E1B] flex items-center justify-center font-bold text-xl shadow-md">
                    <Sparkles className="w-5 h-5 text-[#0F1E1B]" />
                  </div>
                  <span className="font-serif-headline text-3xl font-black tracking-tight text-[#FDFBF3]">
                    PrepPulse<span className="text-[#F5D90A]">.ai</span>
                  </span>
                </div>
                <p className="text-sm text-[#FDFBF3]/75 font-medium max-w-md leading-relaxed">
                  The warm, editorial AI interview preparation platform designed to turn interview anxiety into confident, offer-winning performances.
                </p>

                {/* Newsletter Form */}
                <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#F5D90A]">
                    Get Weekly Interview Drills & Tips
                  </label>
                  <div className="flex items-center max-w-md">
                    <input
                      type="email"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="Enter your email..."
                      className="w-full px-4 py-3 rounded-l-xl text-sm bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-[#F5D90A]"
                      required
                    />
                    <button
                      type="submit"
                      className="px-5 py-3 rounded-r-xl bg-[#F5D90A] text-[#0F1E1B] font-bold text-sm hover:bg-[#e0c608] transition-colors shrink-0"
                    >
                      Subscribe
                    </button>
                  </div>
                  {newsletterSubmitted && (
                    <p className="text-xs text-emerald-400 font-bold flex items-center space-x-1 mt-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Thank you for subscribing! Check your inbox soon.</span>
                    </p>
                  )}
                </form>
              </div>

              {/* Col 2: Quick Links */}
              <div className="space-y-4">
                <h4 className="font-serif-headline text-lg font-bold text-[#F5D90A]">Platform</h4>
                <ul className="space-y-2.5 text-sm font-medium text-[#FDFBF3]/80">
                  <li><Link to="/register" className="hover:text-[#F5D90A] transition-colors">Mock Interview Loops</Link></li>
                  <li><Link to="/resumes" className="hover:text-[#F5D90A] transition-colors">Resume AI Parser</Link></li>
                  <li><Link to="/analytics" className="hover:text-[#F5D90A] transition-colors">Performance Analytics</Link></li>
                  <li><Link to="/login" className="hover:text-[#F5D90A] transition-colors">Candidate Dashboard</Link></li>
                </ul>
              </div>

              {/* Col 3: Company */}
              <div className="space-y-4">
                <h4 className="font-serif-headline text-lg font-bold text-[#F5D90A]">Company & Social</h4>
                <ul className="space-y-2.5 text-sm font-medium text-[#FDFBF3]/80">
                  <li><a href="#features" className="hover:text-[#F5D90A] transition-colors">Features</a></li>
                  <li><a href="#faq" className="hover:text-[#F5D90A] transition-colors">FAQ & Support</a></li>
                  <li><a href="#businesses" className="hover:text-[#F5D90A] transition-colors">For Businesses</a></li>
                </ul>

                {/* Social Icons */}
                <div className="flex items-center space-x-3 pt-4">
                  <a href="https://twitter.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#F5D90A] hover:text-[#0F1E1B] flex items-center justify-center transition-colors">
                    <Twitter className="w-4 h-4" />
                  </a>
                  <a href="https://github.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#F5D90A] hover:text-[#0F1E1B] flex items-center justify-center transition-colors">
                    <Github className="w-4 h-4" />
                  </a>
                  <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#F5D90A] hover:text-[#0F1E1B] flex items-center justify-center transition-colors">
                    <Linkedin className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Copyright Row */}
            <div className="border-t border-white/10 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#FDFBF3]/60">
              <p>© 2026 PrepPulse AI Inc. All rights reserved.</p>
              <div className="flex space-x-6 mt-4 sm:mt-0">
                <a href="#privacy" className="hover:text-[#F5D90A]">Privacy Policy</a>
                <a href="#terms" className="hover:text-[#F5D90A]">Terms of Service</a>
                <a href="#security" className="hover:text-[#F5D90A]">Security</a>
              </div>
            </div>
          </div>

          {/* Huge Oversized Brand Wordmark Cut off at bottom for dramatic visual impact */}
          <div className="overflow-hidden leading-none pt-4 select-none pointer-events-none opacity-90">
            <h1 className="font-serif-headline font-black text-[13.5vw] text-[#FDFBF3]/20 tracking-tighter text-center whitespace-nowrap uppercase transform translate-y-1/3">
              PREPPULSE AI
            </h1>
          </div>
        </footer>

      </div>

      {/* ================= VIDEO / INTERACTIVE PREVIEW MODAL ================= */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1E1B]/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-[#FDFBF3] text-[#0F1E1B] border-4 border-[#0F1E1B] rounded-3xl p-6 sm:p-8 max-w-2xl w-full editorial-shadow-lg relative">
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full border-2 border-[#0F1E1B] bg-[#F5F2E6] hover:bg-[#0F1E1B] hover:text-[#FDFBF3] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-[#F5D90A] border-2 border-[#0F1E1B] rounded-xl text-[#0F1E1B]">
                <Play className="w-5 h-5 fill-[#0F1E1B]" />
              </div>
              <div>
                <h3 className="font-serif-headline text-2xl font-bold">Live AI Voice Interview Walkthrough</h3>
                <p className="text-xs text-[#0F1E1B]/70 font-medium">Interactive preview of OpenAI Whisper & Gemini evaluation engine.</p>
              </div>
            </div>

            {/* Simulated Interactive Video Screen */}
            <div className="bg-[#090D16] rounded-2xl p-6 border-2 border-[#0F1E1B] text-slate-100 space-y-5 my-4">
              <div className="flex items-center justify-between text-xs text-indigo-400">
                <span>Demo Session: System Design & STAR Feedback</span>
                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">Audio Sample Active</span>
              </div>

              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                <p className="text-sm font-semibold text-white">
                  Q: "Tell me about a time you resolved a major production database bottleneck under high traffic."
                </p>
                <div className="flex items-center space-x-3 bg-slate-950 p-3 rounded-lg">
                  <button
                    onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                    className="p-2.5 rounded-full bg-[#F5D90A] text-[#0F1E1B] font-bold hover:scale-105 transition-transform"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                  <div className="flex-1">
                    <div className="text-xs text-slate-300 font-mono mb-1">
                      {isPlayingAudio ? '▶ Playing Audio Sample...' : 'Click to Play AI Audio Analysis'}
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`bg-[#F5D90A] h-full transition-all duration-500 ${
                          isPlayingAudio ? 'w-3/4 animate-pulse' : 'w-1/4'
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-xl text-xs text-emerald-200 space-y-1">
                <div className="font-bold text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>STAR Coverage Passed (96%)</span>
                </div>
                <p>Action: Implemented Redis caching layer & query indexing, dropping P99 latency by 72%.</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowVideoModal(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold border-2 border-[#0F1E1B]"
              >
                Close Demo
              </button>
              <Link
                to="/register"
                onClick={() => setShowVideoModal(false)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#0F1E1B] text-[#FDFBF3] hover:bg-[#1A332E] editorial-shadow"
              >
                Start Practice Free
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
