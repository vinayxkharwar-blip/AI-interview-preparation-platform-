import React from 'react';
import { X, MessageSquare, Bot, User, CheckCircle2 } from 'lucide-react';

export default function LiveTranscriptDrawer({ isOpen, onClose, liveTurns = [] }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#12211A]/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FBF9F3] border-l-3 border-[#12211A] text-[#12211A] shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="p-5 border-b-2 border-[#E4DDC9] flex items-center justify-between bg-[#F5F1E7]">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#12211A] text-[#E7B92E] rounded-xl border border-[#12211A]">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-headline font-bold text-lg text-[#12211A]">Live Call Transcript</h3>
                <p className="text-xs font-bold text-[#12211A]/60">{liveTurns.length} turns recorded</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#12211A] hover:bg-[#E4DDC9] transition-colors border-2 border-[#12211A]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Transcript List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#FBF9F3]">
            {liveTurns.length === 0 ? (
              <div className="text-center py-12 text-[#12211A]/60 space-y-2">
                <MessageSquare className="w-10 h-10 mx-auto text-[#C05C33] opacity-60" />
                <p className="text-xs font-bold">No transcript turns yet.</p>
                <p className="text-xs font-normal">Speak into your mic to begin your live session conversation with Alex.</p>
              </div>
            ) : (
              liveTurns.map((turn, idx) => (
                <div key={idx} className="space-y-3">
                  
                  {/* Question Banner */}
                  {turn.questionText && (
                    <div className="text-center my-2">
                      <span className="px-3 py-1 bg-[#E4DDC9] text-[#12211A] border border-[#12211A] text-xs font-bold rounded-full">
                        Question #{turn.questionIndex + 1}
                      </span>
                    </div>
                  )}

                  {/* Candidate Spoken Turn */}
                  {turn.userTranscript && (
                    <div className="flex items-start space-x-3 justify-end">
                      <div className="bg-[#12211A] text-[#FBF9F3] p-4 rounded-2xl rounded-tr-xs border-2 border-[#12211A] max-w-[85%] text-xs font-medium space-y-1">
                        <div className="flex items-center justify-between text-[#E7B92E] text-[10px] font-black uppercase tracking-wider mb-1">
                          <span>Candidate</span>
                          <span>{turn.timestamp || 'Live'}</span>
                        </div>
                        <p className="leading-relaxed">"{turn.userTranscript}"</p>
                      </div>
                      <div className="p-2 bg-[#E7B92E] text-[#12211A] rounded-xl border-2 border-[#12211A] shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    </div>
                  )}

                  {/* Alex Spoken Turn */}
                  {turn.interviewerLine && (
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-[#12211A] text-[#E7B92E] rounded-xl border-2 border-[#12211A] shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-[#F5F1E7] text-[#12211A] p-4 rounded-2xl rounded-tl-xs border-2 border-[#12211A] max-w-[85%] text-xs space-y-2">
                        <div className="flex items-center justify-between text-[#C05C33] text-[10px] font-black uppercase tracking-wider">
                          <span>Alex (AI Interviewer)</span>
                          <span>{turn.timestamp || 'Live'}</span>
                        </div>
                        <p className="leading-relaxed font-semibold">"{turn.interviewerLine}"</p>

                        {/* Covered Key Points Badge */}
                        {turn.keyPointsCovered && turn.keyPointsCovered.length > 0 && (
                          <div className="pt-2 border-t border-[#E4DDC9] flex flex-wrap gap-1">
                            {turn.keyPointsCovered.map((kp, kpIdx) => (
                              <span
                                key={kpIdx}
                                className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#DCEEDF] text-[#12211A] border border-[#12211A] text-[10px] font-bold rounded-lg"
                              >
                                <CheckCircle2 className="w-3 h-3 text-[#1D3327]" />
                                <span>{kp}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t-2 border-[#E4DDC9] bg-[#F5F1E7] text-center text-xs font-bold text-[#12211A]/70">
            Transcript is automatically saved to your session report.
          </div>

        </div>
      </div>
    </div>
  );
}
