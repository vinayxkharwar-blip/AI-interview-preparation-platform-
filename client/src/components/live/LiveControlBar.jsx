import React from 'react';
import {
  Mic, MicOff, Video, VideoOff, RotateCcw,
  CheckCircle2, Loader2, Square, Type, MessageSquare, PhoneOff
} from 'lucide-react';
import { STATES } from '../../constants/liveInterviewStates';

export default function LiveControlBar({
  isMicMuted,
  toggleMic,
  isCameraOff,
  toggleCamera,
  handleRepeatQuestion,
  handleManualStopRecording,
  handleSwitchToTextMode,
  setIsDrawerOpen,
  liveTurnsCount = 0,
  handleEndInterview,
  isEndingCall,
  interviewState,
}) {
  const isBusyProcessing = interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING;

  return (
    <div className="bg-[#FBF9F3] border-3 border-[#12211A] rounded-3xl p-4 editorial-shadow flex flex-wrap items-center justify-between gap-3">

      {/* Left Controls: Secondary Mute, Camera, Repeat */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleMic}
          className={`px-4 py-3 rounded-2xl border-2 border-[#12211A] font-bold text-xs flex items-center space-x-2 transition-all ${
            isMicMuted ? 'bg-rose-100 text-rose-700' : 'bg-[#E7B92E] text-[#12211A]'
          }`}
        >
          {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span>{isMicMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          type="button"
          onClick={toggleCamera}
          className={`px-4 py-3 rounded-2xl border-2 border-[#12211A] font-bold text-xs flex items-center space-x-2 transition-all ${
            isCameraOff ? 'bg-rose-100 text-rose-700' : 'bg-[#F5F1E7] text-[#12211A]'
          }`}
        >
          {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          <span>{isCameraOff ? 'Start Camera' : 'Stop Camera'}</span>
        </button>

        <button
          type="button"
          onClick={handleRepeatQuestion}
          disabled={isBusyProcessing}
          className="px-4 py-3 bg-[#DCEEDF] text-[#12211A] border-2 border-[#12211A] rounded-2xl text-xs font-bold hover:bg-[#B7D8BE] transition-all flex items-center space-x-2 disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Repeat</span>
        </button>
      </div>

      {/* Primary Center Action: I'm Done Speaking / Status */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={handleManualStopRecording}
          disabled={isBusyProcessing}
          className={`px-7 py-3.5 rounded-2xl text-xs sm:text-sm font-black flex items-center space-x-2.5 editorial-shadow-lg transition-all cursor-pointer border-3 border-[#12211A] ${
            interviewState === STATES.LISTENING
              ? 'bg-[#1D3327] hover:bg-[#284737] text-[#E7B92E] ring-4 ring-[#E7B92E]/40 animate-pulse scale-105'
              : isBusyProcessing
              ? 'bg-[#C05C33] text-[#FBF9F3] opacity-85 cursor-wait'
              : 'bg-[#C05C33] hover:bg-[#a84d28] text-[#FBF9F3]'
          } disabled:opacity-50`}
        >
          {interviewState === STATES.LISTENING ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-[#E7B92E]" />
              <span>I'm Done Speaking ✓</span>
            </>
          ) : isBusyProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-[#E7B92E]" />
              <span>Alex is Reviewing...</span>
            </>
          ) : (
            <>
              <Square className="w-4 h-4 fill-current text-[#FDFBF3]" />
              <span>🎙 Submit Answer</span>
            </>
          )}
        </button>
      </div>

      {/* Right Controls: Utilities & End Interview */}
      <div className="flex flex-[#12211A] flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={handleSwitchToTextMode}
          className="px-3.5 py-3 bg-[#F5F1E7] text-[#12211A] border-2 border-[#12211A] rounded-2xl text-xs font-bold hover:bg-[#E4DDC9] transition-all flex items-center space-x-1.5"
        >
          <Type className="w-4 h-4" />
          <span className="hidden md:inline">Text Mode</span>
        </button>

        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="px-3.5 py-3 bg-[#DCEEDF] text-[#12211A] border-2 border-[#12211A] rounded-2xl text-xs font-bold hover:bg-[#B7D8BE] transition-all flex items-center space-x-1.5"
        >
          <MessageSquare className="w-4 h-4 text-[#1D3327]" />
          <span>Transcript ({liveTurnsCount})</span>
        </button>

        <button
          type="button"
          onClick={handleEndInterview}
          disabled={isEndingCall}
          className="px-5 py-3 bg-rose-700 text-white border-2 border-[#12211A] rounded-2xl text-xs font-bold hover:bg-rose-800 transition-all editorial-shadow flex items-center space-x-1.5"
        >
          <PhoneOff className="w-4 h-4" />
          <span>{isEndingCall ? 'Ending...' : 'End'}</span>
        </button>
      </div>

    </div>
  );
}
