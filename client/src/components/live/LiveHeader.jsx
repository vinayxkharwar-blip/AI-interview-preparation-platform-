import React from 'react';

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function LiveHeader({
  targetRole = 'Full Stack & AI Engineer',
  currentQuestionNumber = 1,
  totalQuestions = 5,
  callDuration = 0,
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between bg-[#FBF9F3] px-6 py-4 rounded-3xl border-3 border-[#12211A] editorial-shadow-sm gap-4">
      <div className="flex items-center space-x-3">
        <span className="font-serif-headline text-lg font-black text-[#12211A] uppercase tracking-wider">
          AI INTERVIEW
        </span>
        <span className="text-[#12211A]/30">•</span>
        <span className="text-xs font-bold text-[#C05C33]">
          {targetRole}
        </span>
      </div>

      <div className="flex items-center space-x-2 px-4 py-1.5 bg-[#12211A] text-[#E7B92E] rounded-full border border-[#12211A] text-xs font-extrabold uppercase tracking-widest font-mono">
        QUESTION {currentQuestionNumber} / {totalQuestions}
      </div>

      <div className="flex items-center space-x-3 text-xs font-bold">
        <span className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 rounded-full font-black">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
          <span>LIVE</span>
        </span>
        <span className="px-3 py-1 bg-[#E7B92E] text-[#12211A] rounded-full border border-[#12211A] font-mono">
          ⏱ {formatTime(callDuration)}
        </span>
      </div>
    </div>
  );
}
