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
    <div className="bg-[#FBF9F3] border-3 border-[#12211A] rounded-2xl sm:rounded-3xl p-3 sm:p-4 editorial-shadow flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">

      {/* Primary Center Action (First on mobile for easy reach) */}
      <div className="order-1 lg:order-2 flex items-center justify-center w-full lg:w-auto">
        <button
          type="button"
          onClick={handleManualStopRecording}
          disabled={isBusyProcessing}
          className={`w-full sm:w-auto px-5 sm:px-7 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center space-x-2.5 editorial-shadow-lg transition-all cursor-pointer border-3 border-[#12211A] min-h-[44px] ${
            interviewState === STATES.LISTENING
              ? 'bg-[#1D3327] hover:bg-[#284737] text-[#E7B92E] ring-4 ring-[#E7B92E]/40 animate-pulse'
              : isBusyProcessing
              ? 'bg-[#C05C33] text-[#FBF9F3] opacity-85 cursor-wait'
              : 'bg-[#C05C33] hover:bg-[#a84d28] text-[#FBF9F3]'
          } disabled:opacity-50`}
        >
          {interviewState === STATES.LISTENING ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-[#E7B92E] shrink-0" />
              <span>I'm Done Speaking ✓</span>
            </>
          ) : isBusyProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-[#E7B92E] shrink-0" />
              <span>Alex is Reviewing...</span>
            </>
          ) : (
            <>
              <Square className="w-4 h-4 fill-current text-[#FDFBF3] shrink-0" />
              <span>🎙 Submit Answer</span>
            </>
          )}
        </button>
      </div>

      {/* Left Controls: Secondary Mute, Camera, Repeat */}
      <div className="order-2 lg:order-1 flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 flex-wrap">
        <button
          type="button"
          onClick={toggleMic}
          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border-2 border-[#12211A] font-bold text-xs flex items-center space-x-1.5 transition-all min-h-[40px] ${
            isMicMuted ? 'bg-rose-100 text-rose-700' : 'bg-[#E7B92E] text-[#12211A]'
          }`}
        >
          {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          <span>{isMicMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          type="button"
          onClick={toggleCamera}
          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border-2 border-[#12211A] font-bold text-xs flex items-center space-x-1.5 transition-all min-h-[40px] ${
            isCameraOff ? 'bg-rose-100 text-rose-700' : 'bg-[#F5F1E7] text-[#12211A]'
          }`}
        >
          {isCameraOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
          <span>{isCameraOff ? 'Camera Off' : 'Camera On'}</span>
        </button>

        <button
          type="button"
          onClick={handleRepeatQuestion}
          disabled={isBusyProcessing}
          className="px-3 sm:px-4 py-2 sm:py-2.5 bg-[#DCEEDF] text-[#12211A] border-2 border-[#12211A] rounded-2xl text-xs font-bold hover:bg-[#B7D8BE] transition-all flex items-center space-x-1.5 disabled:opacity-50 min-h-[40px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Repeat</span>
        </button>
      </div>

      {/* Right Controls: Utilities & End Interview */}
      <div className="order-3 lg:order-3 flex items-center justify-center sm:justify-end gap-1.5 sm:gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleSwitchToTextMode}
          className="px-3 sm:px-3.5 py-2 sm:py-2.5 bg-[#F5F1E7] text-[#12211A] border-2 border-[#12211A] rounded-2xl text-xs font-bold hover:bg-[#E4DDC9] transition-all flex items-center space-x-1.5 min-h-[40px]"
        >
          <Type className="w-3.5 h-3.5" />
          <span className="hidden xs:inline sm:hidden md:inline">Text Mode</span>
        </button>

        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="px-3 sm:px-3.5 py-2 sm:py-2.5 bg-[#DCEEDF] text-[#12211A] border-2 border-[#12211A] rounded-2xl text-xs font-bold hover:bg-[#B7D8BE] transition-all flex items-center space-x-1.5 min-h-[40px]"
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#1D3327]" />
          <span>Chat ({liveTurnsCount})</span>
        </button>

        <button
          type="button"
          onClick={handleEndInterview}
          disabled={isEndingCall}
          className="px-4 sm:px-5 py-2 sm:py-2.5 bg-rose-700 text-white border-2 border-[#12211A] rounded-2xl text-xs font-bold hover:bg-rose-800 transition-all editorial-shadow flex items-center space-x-1.5 min-h-[40px]"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          <span>{isEndingCall ? 'Ending...' : 'End'}</span>
        </button>
      </div>

    </div>
  );
}
