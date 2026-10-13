import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  MessageSquare,
  Clock,
  ArrowRight,
  Hand
} from 'lucide-react';
import { sendGDMessage, evaluateGDRound } from '../../api/placementApi';

export const GDSimulationView = ({ driveId, gdData, onComplete, onCancel }) => {
  const [transcript, setTranscript] = useState(gdData?.transcript || []);
  const [candidateInput, setCandidateInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  // Audio / Speech settings
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [raisedHand, setRaisedHand] = useState(false);

  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  // Scroll to bottom when transcript updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, isSending]);

  // Initialize Web Speech API for Speech-to-Text if available
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let transcriptText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcriptText += event.results[i][0].transcript;
        }
        setCandidateInput(transcriptText);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Microphone speech-to-text is not supported in this browser. Please type your message using the text input below.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Recognition start error:', e);
      }
    }
  };

  const speakText = (text, speaker) => {
    if (!ttsEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;

    // Pitch variation per speaker persona
    if (speaker.includes('Priya')) {
      utterance.pitch = 1.15;
    } else if (speaker.includes('Rohan')) {
      utterance.pitch = 0.9;
    } else if (speaker.includes('Sharma')) {
      utterance.pitch = 0.95;
    } else {
      utterance.pitch = 1.05;
    }

    setActiveSpeaker(speaker);
    utterance.onend = () => setActiveSpeaker(null);
    utterance.onerror = () => setActiveSpeaker(null);

    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const textToSend = candidateInput.trim();
    if (!textToSend || isSending || evaluation) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setIsSending(true);
    setCandidateInput('');
    setRaisedHand(false);

    try {
      const res = await sendGDMessage(driveId, textToSend);
      setTranscript(res.transcript || []);

      // Speak latest peer responses if TTS is enabled
      if (res.peerResponses && res.peerResponses.length > 0) {
        const latestPeer = res.peerResponses[0];
        speakText(latestPeer.text, latestPeer.speaker);
      }
    } catch (err) {
      console.error('Error sending GD message:', err);
      alert(err.response?.data?.message || 'Failed to submit discussion message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleEvaluateGD = async () => {
    const candidateInterventions = transcript.filter((m) => m.role === 'candidate');
    if (candidateInterventions.length === 0) {
      alert('Please contribute at least once to the discussion before concluding.');
      return;
    }

    const confirmEnd = window.confirm(
      'Are you ready to conclude the Group Discussion and generate your communication assessment score?'
    );
    if (!confirmEnd) return;

    setIsEvaluating(true);
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    try {
      const res = await evaluateGDRound(driveId);
      setEvaluation(res.evaluation);
      if (onComplete) onComplete(res.drive);
    } catch (err) {
      console.error('Error evaluating GD:', err);
      alert(err.response?.data?.message || 'Failed to evaluate group discussion.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const participants = [
    {
      name: 'Mr. Sharma',
      role: 'AI Moderator',
      avatar: '👨‍💼',
      tag: 'Moderator',
      color: 'bg-amber-100 text-amber-900 border-amber-400',
    },
    {
      name: 'Priya',
      role: 'Tech Optimist',
      avatar: '👩‍💻',
      tag: 'Productivity & AI',
      color: 'bg-emerald-100 text-emerald-900 border-emerald-400',
    },
    {
      name: 'Rohan',
      role: 'Pragmatic Skeptic',
      avatar: '👨‍💻',
      tag: 'Security & Costs',
      color: 'bg-blue-100 text-blue-900 border-blue-400',
    },
    {
      name: 'Ananya',
      role: 'Balanced Strategist',
      avatar: '👩‍💼',
      tag: 'Governance & Culture',
      color: 'bg-purple-100 text-purple-900 border-purple-400',
    },
    {
      name: 'You',
      role: 'Candidate',
      avatar: '🎓',
      tag: raisedHand ? 'Hand Raised ✋' : isListening ? 'Speaking 🎙️' : 'Ready',
      color: 'bg-[#F5D90A]/40 text-[#0F1E1B] border-[#0F1E1B]',
    },
  ];

  return (
    <div className="bg-[#FDFBF3] rounded-2xl border-2 border-[#0F1E1B] editorial-shadow-lg p-3.5 sm:p-8 max-w-5xl mx-auto my-2 sm:my-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[#0F1E1B]/15 pb-3 sm:pb-4 mb-4 sm:mb-6 gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-[#F5D90A] text-[#0F1E1B] px-2.5 py-0.5 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-wider">
              Round 3 of 4
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-[#0F1E1B]/60">Group Discussion Simulation</span>
          </div>
          <h2 className="font-serif-headline text-xl sm:text-3xl font-black text-[#0F1E1B] leading-tight mt-0.5">
            {gdData?.topic || 'AI & Engineering Group Discussion'}
          </h2>
          <p className="text-xs sm:text-sm text-[#0F1E1B]/70 max-w-2xl mt-0.5 font-medium">
            {gdData?.discussionContext ||
              'Evaluate your communication, reasoning depth, collaborative turn-taking, and persuasion in a live multi-agent discussion.'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* TTS Audio toggle */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`p-2 rounded-xl border-2 transition-all ${
              ttsEnabled
                ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B]'
                : 'bg-white text-[#0F1E1B]/60 border-neutral-300'
            }`}
            title={ttsEnabled ? 'Mute AI Voice Responses' : 'Enable AI Voice Responses'}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {!evaluation ? (
            <button
              onClick={handleEvaluateGD}
              disabled={isEvaluating}
              className="bg-[#C1440E] hover:bg-[#A3370B] text-white px-4 py-2 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm transition-all disabled:opacity-50"
            >
              {isEvaluating ? 'Evaluating Rubrics...' : 'Conclude & Evaluate GD'}
            </button>
          ) : (
            <button
              onClick={onCancel}
              className="bg-[#0F1E1B] text-[#FDFBF3] px-4 py-2 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm hover:bg-[#1A332E]"
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>

      {/* EVALUATION RESULTS VIEW */}
      {evaluation ? (
        <div className="space-y-6">
          <div
            className={`p-6 rounded-2xl border-2 border-[#0F1E1B] ${
              evaluation.passed
                ? 'bg-emerald-50 text-emerald-950 editorial-shadow'
                : 'bg-rose-50 text-rose-950 editorial-shadow'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-[#0F1E1B] ${
                    evaluation.passed ? 'bg-emerald-400 text-emerald-950' : 'bg-rose-400 text-rose-950'
                  }`}
                >
                  {evaluation.passed ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black uppercase tracking-wider">
                      {evaluation.passed ? 'Round 3 Passed!' : 'Cutoff Not Cleared'}
                    </span>
                    <span className="text-xs font-bold opacity-75">
                      (Score: {evaluation.score}/100 • Cutoff: 60/100)
                    </span>
                  </div>
                  <h3 className="font-serif-headline text-2xl font-black mt-0.5">
                    {evaluation.passed
                      ? 'Round 4 (Resume-Based Interview) Unlocked'
                      : 'More Active Communication Required'}
                  </h3>
                  <p className="text-xs sm:text-sm mt-1 opacity-90">{evaluation.feedback?.summary}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-3xl font-black font-serif-headline">{evaluation.score} / 100</div>
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">Communication Score</span>
              </div>
            </div>

            {/* Rubrics Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#0F1E1B]/15">
              <div className="bg-white/80 p-3 rounded-xl border border-[#0F1E1B]/20">
                <div className="text-[11px] font-bold text-[#0F1E1B]/70 uppercase">Clarity & Articulation</div>
                <div className="text-lg font-black text-[#0F1E1B]">
                  {evaluation.rubrics?.clarityAndArticulation} / 25
                </div>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-[#0F1E1B]/20">
                <div className="text-[11px] font-bold text-[#0F1E1B]/70 uppercase">Problem Solving & Ideas</div>
                <div className="text-lg font-black text-[#0F1E1B]">
                  {evaluation.rubrics?.problemSolvingAndIdeas} / 25
                </div>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-[#0F1E1B]/20">
                <div className="text-[11px] font-bold text-[#0F1E1B]/70 uppercase">Collaboration & Listening</div>
                <div className="text-lg font-black text-[#0F1E1B]">
                  {evaluation.rubrics?.collaborationAndListening} / 25
                </div>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-[#0F1E1B]/20">
                <div className="text-[11px] font-bold text-[#0F1E1B]/70 uppercase">Persuasion & Confidence</div>
                <div className="text-lg font-black text-[#0F1E1B]">
                  {evaluation.rubrics?.persuasionAndConfidence} / 25
                </div>
              </div>
            </div>
          </div>

          {/* Feedback breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-300">
              <h4 className="font-bold text-sm text-emerald-950 flex items-center space-x-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Demonstrated Strengths</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-emerald-900 list-disc list-inside">
                {evaluation.feedback?.strengths?.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-300">
              <h4 className="font-bold text-sm text-amber-950 flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Growth & Improvement Areas</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-amber-900 list-disc list-inside">
                {evaluation.feedback?.weaknesses?.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* VIRTUAL CONFERENCE ROOM VIEW */
        <div className="space-y-6">
          {/* Virtual Stage: Participants row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {participants.map((p, idx) => {
              const isSpeaking = activeSpeaker && activeSpeaker.toLowerCase().includes(p.name.toLowerCase());

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center text-center ${
                    p.color
                  } ${isSpeaking ? 'ring-4 ring-[#F5D90A] scale-105 editorial-shadow' : 'editorial-shadow-sm'}`}
                >
                  <div className="text-3xl relative">
                    {p.avatar}
                    {isSpeaking && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </div>
                  <div className="font-bold text-xs mt-1 text-[#0F1E1B]">{p.name}</div>
                  <div className="text-[10px] text-[#0F1E1B]/70 font-semibold">{p.role}</div>
                  <span className="mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/5 text-[#0F1E1B]">
                    {p.tag}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Discussion Feed */}
          <div className="bg-[#F5F2E6] rounded-2xl border-2 border-[#0F1E1B] p-4 sm:p-6 h-[400px] overflow-y-auto space-y-4 shadow-inner">
            {transcript.map((msg, idx) => {
              const isCandidate = msg.role === 'candidate';
              const isModerator = msg.role === 'moderator';

              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isCandidate ? 'items-end' : 'items-start'} animate-fadeIn`}
                >
                  <div className="flex items-center space-x-2 text-[11px] font-bold text-[#0F1E1B]/60 mb-1">
                    <span>{msg.speaker}</span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl border-2 text-xs sm:text-sm leading-relaxed ${
                      isCandidate
                        ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B] editorial-shadow-sm rounded-tr-none'
                        : isModerator
                        ? 'bg-amber-100 text-amber-950 border-amber-600 rounded-tl-none font-medium'
                        : 'bg-white text-[#0F1E1B] border-[#0F1E1B]/20 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-center space-x-2 text-xs text-[#0F1E1B]/70 italic animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-[#C1440E]" />
                <span>AI participants are formulating responses...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Interactive Input Toolbar */}
          <form onSubmit={handleSendMessage} className="space-y-3">
            <div className="flex items-center space-x-2">
              {/* Mic STT Button */}
              <button
                type="button"
                onClick={toggleMic}
                className={`p-3 rounded-xl border-2 transition-all flex items-center space-x-1.5 ${
                  isListening
                    ? 'bg-rose-500 text-white border-rose-700 animate-pulse editorial-shadow-sm'
                    : 'bg-white text-[#0F1E1B] border-[#0F1E1B] hover:bg-[#F5F2E6]'
                }`}
                title={isListening ? 'Stop Speaking' : 'Speak via Microphone'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[#C1440E]" />}
                <span className="text-xs font-bold hidden sm:inline">
                  {isListening ? 'Listening...' : 'Mic Input'}
                </span>
              </button>

              {/* Raise Hand Toggle */}
              <button
                type="button"
                onClick={() => setRaisedHand(!raisedHand)}
                className={`p-3 rounded-xl border-2 transition-all flex items-center space-x-1 ${
                  raisedHand
                    ? 'bg-[#F5D90A] text-[#0F1E1B] border-[#0F1E1B] font-bold editorial-shadow-sm'
                    : 'bg-white text-[#0F1E1B]/70 border-[#0F1E1B]/30 hover:border-[#0F1E1B]'
                }`}
                title="Raise Hand to take the floor"
              >
                <Hand className="w-4 h-4" />
                <span className="text-xs font-bold hidden sm:inline">Raise Hand</span>
              </button>

              {/* Text Input Field */}
              <input
                type="text"
                value={candidateInput}
                onChange={(e) => setCandidateInput(e.target.value)}
                placeholder={isListening ? 'Listening to your speech...' : 'Type or speak your perspective...'}
                disabled={isSending}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-[#0F1E1B] bg-white text-xs sm:text-sm text-[#0F1E1B] focus:outline-hidden focus:ring-2 focus:ring-[#C1440E]"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!candidateInput.trim() || isSending}
                className="bg-[#0F1E1B] hover:bg-[#1A332E] text-[#FDFBF3] px-5 py-3 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm transition-all disabled:opacity-40 flex items-center space-x-1.5 shrink-0"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-[#0F1E1B]/60 italic">
              Tip: Engage directly with Rohan or Priya's points. Acknowledge perspectives and support your argument with engineering trade-offs.
            </p>
          </form>
        </div>
      )}
    </div>
  );
};

export default GDSimulationView;
