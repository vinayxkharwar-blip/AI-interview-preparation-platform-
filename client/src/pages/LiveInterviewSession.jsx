import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import PreCallPermissionsModal from '../components/PreCallPermissionsModal';
import LiveTranscriptDrawer from '../components/LiveTranscriptDrawer';
import QuestionCard from '../components/QuestionCard';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Lightbulb,
  Sparkles, ShieldCheck, Loader2, Volume2, Target, CheckCircle2,
  ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';

export default function LiveInterviewSession() {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();

  // Permissions & Setup state
  const [showPermissionsModal, setShowPermissionsModal] = useState(true);
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Call & Media states
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isAlexSpeaking, setIsAlexSpeaking] = useState(false);
  const [isCandidateSpeaking, setIsCandidateSpeaking] = useState(false);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [isEndingCall, setIsEndingCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [liveCaption, setLiveCaption] = useState('Connecting to interviewer Alex...');

  // Transcript & Drawer states
  const [liveTurns, setLiveTurns] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentSpeechTranscript, setCurrentSpeechTranscript] = useState('');

  // References
  const localVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  // 1. Fetch Session Data
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await axiosClient.get(`/sessions/${sessionId}`);
        const { session: sessDoc, questions: qList } = res.data;

        setSession(sessDoc);
        setQuestions(qList || []);

        if (sessDoc?.status === 'completed') {
          navigate(`/session/${sessionId}`);
          return;
        }
      } catch (err) {
        console.error('[LiveInterview] Session load error:', err);
        setError('Failed to load session details.');
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId, navigate]);

  // 2. Call Timer
  useEffect(() => {
    if (!showPermissionsModal) {
      timerIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [showPermissionsModal]);

  // 3. Speech Recognition (STT) setup
  useEffect(() => {
    if (showPermissionsModal) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsCandidateSpeaking(true);
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        setCurrentSpeechTranscript(currentText);

        // Auto-trigger turn submit when final transcript reaches a pause
        if (finalTranscript.trim().length > 12 && !isProcessingTurn && !isAlexSpeaking) {
          submitCandidateTurn(finalTranscript.trim());
        }
      };

      recognition.onerror = (err) => {
        console.warn('[Live STT Warning]', err.error);
      };

      recognition.onend = () => {
        setIsCandidateSpeaking(false);
        // Restart STT if call is still active
        if (!isEndingCall && !isMicMuted) {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
      try { recognition.start(); } catch (e) {}
    } else {
      console.warn('[Live STT] Web Speech API SpeechRecognition is not supported in this browser.');
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [showPermissionsModal, isMicMuted, isProcessingTurn, isAlexSpeaking, isEndingCall]);

  // 4. Initial Alex Greeting upon call start
  useEffect(() => {
    if (!showPermissionsModal && questions.length > 0 && liveTurns.length === 0) {
      const firstQ = questions[0];
      const initialLine = `Hello! I'm Alex, your AI technical interviewer today. Let's begin with our first topic for the ${session?.targetRole || 'target'} role: "${firstQ.questionText}"`;

      speakAlexLine(initialLine, () => {
        setLiveTurns([
          {
            questionIndex: 0,
            questionText: firstQ.questionText,
            interviewerLine: initialLine,
            userTranscript: '',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      });
    }
  }, [showPermissionsModal, questions]);

  // 5. Handle Permissions Granted & Local Video Setup
  const handlePermissionsGranted = ({ stream }) => {
    setShowPermissionsModal(false);
    mediaStreamRef.current = stream;

    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
  };

  // 6. Text-To-Speech (TTS) Engine - Drives Equalizer Animation directly
  const speakAlexLine = (text, onComplete) => {
    setLiveCaption(text);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any previous speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setIsAlexSpeaking(true);
      };

      utterance.onend = () => {
        setIsAlexSpeaking(false);
        if (onComplete) onComplete();
      };

      utterance.onerror = (e) => {
        console.error('[TTS Error]', e);
        setIsAlexSpeaking(false);
        if (onComplete) onComplete();
      };

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback timer if SpeechSynthesis unavailable
      setIsAlexSpeaking(true);
      setTimeout(() => {
        setIsAlexSpeaking(false);
        if (onComplete) onComplete();
      }, Math.max(3000, text.length * 50));
    }
  };

  // 7. Submit Turn to Backend AI ("Alex")
  const submitCandidateTurn = async (transcriptText) => {
    if (isProcessingTurn || isAlexSpeaking || !transcriptText.trim()) return;

    setIsProcessingTurn(true);
    const spokenText = transcriptText.trim();
    setCurrentSpeechTranscript('');

    try {
      console.log('[LiveTurn] Submitting turn to backend:', spokenText);

      const res = await axiosClient.post(`/sessions/${sessionId}/live/turn`, {
        userTranscript: spokenText,
        currentQuestionIndex: currentIndex,
        conversationHistory: liveTurns.slice(-4),
      });

      const { interviewerLine, keyPointsCovered, decision, nextQuestionIndex, turnScore } = res.data;

      const newTurn = {
        questionIndex: currentIndex,
        questionText: questions[currentIndex]?.questionText,
        userTranscript: spokenText,
        interviewerLine,
        keyPointsCovered: keyPointsCovered || [],
        turnScore: turnScore || 8,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setLiveTurns((prev) => [...prev, newTurn]);

      // Speak Alex's response line
      speakAlexLine(interviewerLine, () => {
        if (decision === 'next_question' && nextQuestionIndex < questions.length) {
          setCurrentIndex(nextQuestionIndex);
        } else if (decision === 'complete') {
          handleEndInterview();
        }
      });
    } catch (err) {
      console.error('[LiveTurn Error]', err);
      speakAlexLine('Could you please repeat that? I had trouble processing your last response.');
    } finally {
      setIsProcessingTurn(false);
    }
  };

  // 8. Toggle Media Controls
  const toggleMic = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    } else {
      setIsMicMuted(!isMicMuted);
    }
  };

  const toggleCamera = () => {
    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    } else {
      setIsCameraOff(!isCameraOff);
    }
  };

  // 9. End Interview & Teardown
  const handleEndInterview = async () => {
    if (isEndingCall) return;
    setIsEndingCall(true);

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      await axiosClient.post(`/sessions/${sessionId}/live/complete`, {
        liveTurns,
      });
    } catch (err) {
      console.error('[Live complete error]', err);
    } finally {
      navigate(`/interview/${sessionId}`);
    }
  };

  // Format Duration Helper
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-[#12211A] font-medium">
        <Loader2 className="w-10 h-10 animate-spin text-[#C05C33] mb-3" />
        <p className="text-sm font-bold">Initializing Live Video Call Environment...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-[#F5F1E7] text-[#12211A] p-4 sm:p-6 lg:p-8 flex flex-col justify-between font-sans relative">
      
      {/* Pre-Call Permissions Screen */}
      {showPermissionsModal && (
        <PreCallPermissionsModal
          targetRole={session?.targetRole}
          onPermissionsGranted={handlePermissionsGranted}
          onCancel={() => navigate(`/interview/${sessionId}`)}
        />
      )}

      {/* Main Call Container */}
      <div className="max-w-6xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        
        {/* Call Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between bg-[#FBF9F3] p-4 rounded-3xl border-3 border-[#12211A] editorial-shadow-sm gap-4">
          <div className="flex items-center space-x-3">
            <span className="font-serif-headline text-xl font-bold text-[#12211A] tracking-tight">
              PrepPulse.ai
            </span>
            <span className="text-[#12211A]/30">•</span>
            <span className="px-3 py-1 bg-[#12211A] text-[#E7B92E] text-xs font-black rounded-full uppercase tracking-wider">
              Live Video Interview
            </span>
          </div>

          <div className="flex items-center space-x-4 text-xs font-bold">
            <span className="text-[#12211A]/70">
              Role: <strong className="text-[#C05C33]">{session?.targetRole}</strong>
            </span>
            <span className="px-3 py-1 bg-[#E7B92E] text-[#12211A] rounded-full border border-[#12211A] font-mono">
              ⏱ {formatTime(callDuration)}
            </span>
          </div>
        </div>

        {/* Video Grid Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          
          {/* Main AI Interviewer Box (Alex Avatar + Live Captions) */}
          <div className="lg:col-span-2 bg-[#12211A] rounded-3xl border-3 border-[#12211A] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden editorial-shadow-lg min-h-[420px]">
            
            {/* Top Status Bar */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center space-x-2 bg-[#1D3327] px-3.5 py-1.5 rounded-full border border-[#E7B92E]/40 text-xs text-[#FBF9F3]">
                <span className={`w-2.5 h-2.5 rounded-full ${isAlexSpeaking ? 'bg-[#E7B92E] animate-ping' : 'bg-emerald-400'}`}></span>
                <span className="font-bold">Alex (AI Interviewer)</span>
              </div>

              {isProcessingTurn && (
                <div className="flex items-center space-x-2 text-[#E7B92E] text-xs font-bold animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating answer...</span>
                </div>
              )}
            </div>

            {/* AI Avatar Visualizer */}
            <div className="my-auto text-center space-y-6 z-10 py-6">
              
              {/* Glowing Avatar Sphere */}
              <div className="relative inline-block">
                <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-[#1D3327] via-[#12211A] to-[#254233] border-4 ${isAlexSpeaking ? 'border-[#E7B92E] shadow-[0_0_30px_rgba(231,185,46,0.5)]' : 'border-[#E4DDC9]/30'} flex items-center justify-center mx-auto transition-all duration-300`}>
                  <Volume2 className={`w-16 h-16 ${isAlexSpeaking ? 'text-[#E7B92E] scale-110' : 'text-[#DCEEDF]/60'} transition-transform duration-300`} />
                </div>

                {/* Animated Equalizer Bar Mouth (Driven strictly off TTS state + reduced-motion support) */}
                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 flex items-center space-x-1 bg-[#12211A] px-4 py-1.5 rounded-full border-2 border-[#E7B92E]">
                  {[0.4, 0.9, 0.6, 1.0, 0.7, 0.4].map((scale, i) => (
                    <div
                      key={i}
                      className={`w-1.5 bg-[#E7B92E] rounded-full transition-all duration-150 ${isAlexSpeaking ? 'motion-safe:animate-bounce' : 'h-2'}`}
                      style={{
                        height: isAlexSpeaking ? `${scale * 20}px` : '6px',
                        animationDelay: `${i * 100}ms`
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold text-[#FBF9F3]">Alex</h4>
                <p className="text-xs text-[#DCEEDF]/80 font-medium">
                  {isAlexSpeaking ? 'Speaking...' : isCandidateSpeaking ? 'Listening to candidate...' : 'Waiting for response...'}
                </p>
              </div>
            </div>

            {/* Live Caption Strip */}
            <div className="z-10 bg-[#1D3327]/90 backdrop-blur-md p-4 rounded-2xl border border-[#E7B92E]/30 text-center">
              <p className="text-xs font-bold text-[#E7B92E] uppercase tracking-wider mb-1">Live Captions</p>
              <p className="text-sm font-medium text-[#FBF9F3] leading-relaxed italic">
                "{liveCaption}"
              </p>
            </div>
          </div>

          {/* Right Side: Self View PiP & Question Info */}
          <div className="space-y-6 flex flex-col justify-between">
            
            {/* Self View PiP Camera Window */}
            <div className="relative aspect-video bg-[#12211A] rounded-3xl border-3 border-[#12211A] overflow-hidden editorial-shadow flex items-center justify-center">
              {!isCameraOff ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="text-center text-[#FBF9F3]/60 space-y-1 p-4">
                  <VideoOff className="w-8 h-8 mx-auto text-[#C05C33]" />
                  <p className="text-xs font-bold">Camera Turned Off</p>
                </div>
              )}

              {/* Candidate Mic & Speaking Status Overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="bg-[#12211A]/80 backdrop-blur-xs px-2.5 py-1 rounded-xl text-[10px] font-bold text-white border border-white/20">
                  You (Candidate)
                </span>
                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${isMicMuted ? 'bg-rose-900/80 text-rose-200 border-rose-500' : isCandidateSpeaking ? 'bg-[#E7B92E] text-[#12211A] border-[#12211A]' : 'bg-[#12211A]/80 text-white border-white/20'}`}>
                  {isMicMuted ? 'Muted' : isCandidateSpeaking ? 'Speaking...' : 'Mic Active'}
                </span>
              </div>
            </div>

            {/* Embedded Reused Question Component */}
            {currentQuestion && (
              <div className="flex-1 flex flex-col justify-between">
                <QuestionCard
                  question={currentQuestion}
                  currentNumber={currentIndex + 1}
                  totalQuestions={questions.length}
                />
              </div>
            )}
          </div>
        </div>

        {/* Candidate Spoken Transcript Realtime Bar */}
        {currentSpeechTranscript && (
          <div className="p-3.5 bg-[#FBF9F3] border-2 border-[#12211A] rounded-2xl flex items-center justify-between text-xs font-bold text-[#12211A] animate-fadeIn">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E7B92E] animate-ping"></span>
              <span>Hearing you: <strong className="font-normal italic">"{currentSpeechTranscript}"</strong></span>
            </div>
            <button
              onClick={() => submitCandidateTurn(currentSpeechTranscript)}
              disabled={isProcessingTurn}
              className="px-3 py-1 bg-[#12211A] text-[#E7B92E] rounded-xl text-[11px] font-bold border border-[#12211A]"
            >
              Submit Response
            </button>
          </div>
        )}

        {/* Floating Controls Bar */}
        <div className="bg-[#FBF9F3] border-3 border-[#12211A] rounded-3xl p-4 editorial-shadow flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center space-x-3">
            {/* Mic Toggle */}
            <button
              onClick={toggleMic}
              className={`p-3.5 rounded-2xl border-2 border-[#12211A] font-bold flex items-center space-x-2 transition-all ${isMicMuted ? 'bg-rose-100 text-rose-700' : 'bg-[#E7B92E] text-[#12211A]'}`}
            >
              {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span className="text-xs hidden sm:inline">{isMicMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            {/* Camera Toggle */}
            <button
              onClick={toggleCamera}
              className={`p-3.5 rounded-2xl border-2 border-[#12211A] font-bold flex items-center space-x-2 transition-all ${isCameraOff ? 'bg-rose-100 text-rose-700' : 'bg-[#F5F1E7] text-[#12211A]'}`}
            >
              {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              <span className="text-xs hidden sm:inline">{isCameraOff ? 'Start Camera' : 'Stop Camera'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Live Transcript */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-3 bg-[#DCEEDF] text-[#12211A] border-2 border-[#12211A] rounded-2xl text-xs font-bold hover:bg-[#B7D8BE] transition-all flex items-center space-x-2"
            >
              <MessageSquare className="w-4 h-4 text-[#1D3327]" />
              <span>Full Transcript ({liveTurns.length})</span>
            </button>

            {/* End Call Button */}
            <button
              onClick={handleEndInterview}
              disabled={isEndingCall}
              className="px-6 py-3 bg-[#C05C33] text-[#FBF9F3] border-2 border-[#12211A] rounded-2xl text-xs font-bold hover:bg-[#a84d28] transition-all editorial-shadow flex items-center space-x-2"
            >
              <PhoneOff className="w-4 h-4" />
              <span>{isEndingCall ? 'Ending Call...' : 'End Interview'}</span>
            </button>
          </div>

        </div>

      </div>

      {/* Live Transcript Slide-over Drawer */}
      <LiveTranscriptDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        liveTurns={liveTurns}
      />

    </div>
  );
}
