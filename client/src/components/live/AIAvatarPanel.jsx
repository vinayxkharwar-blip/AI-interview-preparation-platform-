import React from 'react';
import { Loader2, Volume2 } from 'lucide-react';
import { STATES } from '../../constants/liveInterviewStates';

export default function AIAvatarPanel({
  interviewState,
  liveCaption,
  isMicMuted,
}) {
  const isSpeaking = interviewState === STATES.SPEAKING || interviewState === STATES.ASKING || interviewState === STATES.NEXT_QUESTION;
  const isEvaluating = interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING;
  const isConnecting = interviewState === STATES.IDLE && liveCaption.includes('...');

  return (
    <div className="lg:col-span-7 bg-[#12211A] text-[#FBF9F3] rounded-3xl border-3 border-[#12211A] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden editorial-shadow-lg min-h-[460px]">

      {/* Header inside AI Panel */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center space-x-2 bg-[#1D3327] px-3.5 py-1.5 rounded-full border border-[#E7B92E]/40 text-xs text-[#FBF9F3]">
          <span className={`w-2.5 h-2.5 rounded-full ${isSpeaking ? 'bg-[#E7B92E] animate-ping' : 'bg-emerald-400'}`}></span>
          <span className="font-bold">Alex (AI Technical Interviewer)</span>
        </div>

        {/* Dynamic Status Pill */}
        <div className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border flex items-center space-x-1.5 bg-[#12211A]/90 border-[#E7B92E] text-[#E7B92E]">
          {isSpeaking && (
            <>
              <span className="w-2 h-2 rounded-full bg-[#E7B92E] animate-ping"></span>
              <span>● AI Speaking</span>
            </>
          )}
          {interviewState === STATES.LISTENING && (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{isMicMuted ? '● Mic Muted' : '● Your Turn'}</span>
            </>
          )}
          {isEvaluating && (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E7B92E]" />
              <span>● AI Thinking</span>
            </>
          )}
          {interviewState === STATES.IDLE && (
            isConnecting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E7B92E]" />
                <span>● Connecting</span>
              </>
            ) : (
              <span>● Ready</span>
            )
          )}
        </div>
      </div>

      {/* AI AVATAR ORB VISUALIZER */}
      <div className="my-auto text-center space-y-5 z-10 py-6 flex flex-col items-center justify-center">
        <div className="relative inline-block">
          {/* Glowing Circular AI Orb */}
          <div className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-[#1D3327] via-[#12211A] to-[#254233] border-4 ${
            isSpeaking
              ? 'border-[#E7B92E] shadow-[0_0_35px_rgba(231,185,46,0.6)] scale-105'
              : (isEvaluating || isConnecting)
              ? 'border-[#E7B92E] shadow-[0_0_30px_rgba(231,185,46,0.4)] animate-pulse'
              : 'border-[#E4DDC9]/30'
          } flex items-center justify-center mx-auto transition-all duration-300`}>
            {isEvaluating || isConnecting ? (
              <Loader2 className="w-16 h-16 text-[#E7B92E] animate-spin" />
            ) : (
              <Volume2 className={`w-16 h-16 ${isSpeaking ? 'text-[#E7B92E] scale-110' : 'text-[#DCEEDF]/60'} transition-transform duration-300`} />
            )}
          </div>

          {/* Equalizer Bar Mouth */}
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 flex items-center space-x-1.5 bg-[#12211A] px-5 py-1.5 rounded-full border-2 border-[#E7B92E] shadow-md">
            {[0.4, 0.9, 0.6, 1.0, 0.7, 0.4].map((scale, i) => (
              <div
                key={i}
                className={`w-1.5 bg-[#E7B92E] rounded-full transition-all duration-150 ${
                  isSpeaking
                    ? 'motion-safe:animate-bounce'
                    : (isEvaluating || isConnecting)
                    ? 'animate-pulse'
                    : 'h-2'
                }`}
                style={{
                  height: isSpeaking ? `${scale * 22}px` : (isEvaluating || isConnecting) ? `${scale * 12}px` : '6px',
                  animationDelay: `${i * 100}ms`
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold font-serif-headline text-[#FBF9F3]">Alex</h3>
          <p className="text-xs text-[#DCEEDF]/80 font-semibold tracking-wide uppercase mt-0.5">AI Interviewer</p>
        </div>
      </div>

      {/* Live AI Caption Strip */}
      <div className="z-10 bg-[#1D3327]/95 backdrop-blur-md p-4 rounded-2xl border border-[#E7B92E]/30 text-center">
        <div className="flex items-center justify-center space-x-1.5 mb-1">
          {liveCaption.includes('...') && <Loader2 className="w-3 h-3 text-[#E7B92E] animate-spin" />}
          <p className="text-[10px] font-extrabold text-[#E7B92E] uppercase tracking-widest">Live AI Captions</p>
        </div>
        <p className="text-xs sm:text-sm font-medium text-[#FBF9F3] leading-relaxed italic">"{liveCaption}"</p>
      </div>

    </div>
  );
}
