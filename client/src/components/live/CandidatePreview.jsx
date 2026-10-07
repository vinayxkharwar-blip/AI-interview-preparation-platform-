import React from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { STATES } from '../../constants/liveInterviewStates';

export default function CandidatePreview({
  localVideoRef,
  isCameraOff,
  isMicMuted,
  interviewState,
  micLevel,
  currentQuestionNumber,
  totalQuestions,
  currentQuestionCategory,
  currentQuestionText,
}) {
  return (
    <div className="lg:col-span-5 flex flex-col justify-between space-y-6">

      {/* Candidate Camera Window */}
      <div className="relative aspect-video bg-[#12211A] rounded-3xl border-3 border-[#12211A] overflow-hidden editorial-shadow flex items-center justify-center shrink-0">
        {!isCameraOff ? (
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
        ) : (
          <div className="text-center text-[#FBF9F3]/60 space-y-1 p-4">
            <VideoOff className="w-8 h-8 mx-auto text-[#C05C33]" />
            <p className="text-xs font-bold">Camera Turned Off</p>
          </div>
        )}

        {/* YOU Badge + Mic/Camera Badges */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="bg-[#12211A]/90 backdrop-blur-xs px-3 py-1 rounded-xl text-[10px] font-black text-[#F5D90A] border border-[#F5D90A]/30 tracking-wider uppercase">
            YOU
          </span>
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border flex items-center space-x-1 ${isMicMuted ? 'bg-rose-900/90 text-rose-200 border-rose-500' : 'bg-emerald-900/90 text-emerald-200 border-emerald-500'}`}>
              {isMicMuted ? <MicOff className="w-3 h-3 text-rose-400" /> : <Mic className="w-3 h-3 text-emerald-400" />}
              <span>{isMicMuted ? 'Muted' : 'Mic On'}</span>
            </span>
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border flex items-center space-x-1 ${isCameraOff ? 'bg-rose-900/90 text-rose-200 border-rose-500' : 'bg-emerald-900/90 text-emerald-200 border-emerald-500'}`}>
              {isCameraOff ? <VideoOff className="w-3 h-3 text-rose-400" /> : <Video className="w-3 h-3 text-emerald-400" />}
              <span>{isCameraOff ? 'Camera Off' : 'Camera On'}</span>
            </span>
          </div>
        </div>

        {/* Mic level waveform while listening */}
        {interviewState === STATES.LISTENING && !isMicMuted && (
          <div className="absolute top-3 left-3 right-3 bg-[#12211A]/85 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-[#E7B92E]/40 flex items-center justify-between shadow-lg animate-fadeIn">
            <div className="flex items-center space-x-1.5 text-[10px] font-black uppercase text-[#E7B92E] tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Listening...</span>
            </div>
            <div className="flex items-center space-x-1 h-4">
              {[0.3, 0.6, 0.9, 1.0, 0.7, 0.5, 0.8, 1.0, 0.6, 0.4].map((mult, idx) => (
                <div
                  key={idx}
                  className={`w-1 rounded-full transition-all duration-75 ${micLevel > 12 ? 'bg-[#E7B92E]' : 'bg-emerald-400/50'}`}
                  style={{ height: `${Math.max(3, Math.round((micLevel / 100) * 16 * mult))}px` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CLEAN QUESTION CARD */}
      <div className="flex-1 bg-[#FBF9F3] border-3 border-[#12211A] rounded-3xl p-6 editorial-shadow flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#C05C33]">
              QUESTION {currentQuestionNumber} OF {totalQuestions}
            </span>
            <span className="px-3 py-1 rounded-xl bg-[#DCEEDF] border border-[#12211A] text-[10px] font-black text-[#12211A]">
              {currentQuestionCategory || 'General'}
            </span>
          </div>

          <h4 className="font-serif-headline text-lg sm:text-xl font-bold text-[#12211A] leading-snug">
            {currentQuestionText || 'Loading question...'}
          </h4>
        </div>

        <div className="pt-3 border-t-2 border-[#E4DDC9] flex items-center justify-between text-xs text-[#12211A]/70 font-semibold italic">
          <span>Take your time and explain your reasoning.</span>
        </div>
      </div>

    </div>
  );
}
