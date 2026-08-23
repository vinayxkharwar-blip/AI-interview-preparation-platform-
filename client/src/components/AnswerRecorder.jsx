import React, { useState, useRef, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Mic, Square, RefreshCw, Type, Loader2, Sparkles, AlertCircle, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';

const MAX_RECORDING_DURATION = 300; // 5 minutes in seconds
const WARNING_THRESHOLD = 270; // 30 seconds remaining (4:30)

export default function corder({ onAnswerSubmitted, isSubmitting }) {
  const [mode, setMode] = useState('voice'); // 'voice' or 'text'
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [transcribeLoading, setTranscribeLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const recognitionRef = useRef(null);
  const localTranscriptRef = useRef('');

  // Check MediaRecorder & audio/webm support
  const checkAudioWebmSupport = () => {
    if (typeof window === 'undefined' || !window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    if (typeof MediaRecorder.isTypeSupported === 'function') {
      return MediaRecorder.isTypeSupported('audio/webm');
    }
    return true;
  };

  useEffect(() => {
    const supported = checkAudioWebmSupport();
    setIsSupported(supported);
    if (!supported) {
      setError('Voice recording (audio/webm) is not supported on this browser (e.g. Safari). Switched to text mode.');
      setMode('text');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const handleModeChange = (newMode) => {
    if (newMode === 'voice' && !isSupported) {
      setError('Voice recording (audio/webm) is not supported on this browser (e.g. Safari). Please use text mode.');
      return;
    }
    setMode(newMode);
  };

  const startRecording = async () => {
    if (!isSupported) {
      setError('Audio/webm recording is not supported in this browser. Switched to text input mode.');
      setMode('text');
      return;
    }

    try {
      setError('');
      setAudioBlob(null);
      setAudioUrl('');
      setTranscript('');
      localTranscriptRef.current = '';
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(url);

        stream.getTracks().forEach((track) => track.stop());
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) {}
          recognitionRef.current = null;
        }
        handleTranscribeAudio(audioBlob);
      };

      // Start Browser Speech Recognition for live text feedback
      const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = 0; i < event.results.length; i++) {
              const part = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                final += part + ' ';
              } else {
                interim += part;
              }
            }
            const fullText = (final + interim).trim();
            if (fullText) {
              localTranscriptRef.current = fullText;
              setTranscript(fullText);
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (srErr) {
          console.warn('[SpeechRecognition Notice]', srErr.message);
        }
      }

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          if (next >= MAX_RECORDING_DURATION) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return MAX_RECORDING_DURATION;
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      setError('Microphone permission denied or unsupported browser. Switched to text input mode.');
      setMode('text');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
        recognitionRef.current = null;
      }
    }
  };

  const handleTranscribeAudio = async (blob) => {
    setTranscribeLoading(true);
    setError('');

    const clientTranscript = (localTranscriptRef.current || transcript || '').trim();

    const formData = new FormData();
    formData.append('audio', blob, 'user_answer.webm');

    try {
      const res = await axiosClient.post('/answers/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const serverTranscript = (res.data.transcript || '').trim();
      setTranscript(serverTranscript || clientTranscript);
      setTranscribeLoading(false);
    } catch (err) {
      console.error('Transcription error:', err);
      setTranscript(clientTranscript);
      setTranscribeLoading(false);
    }
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    const answerText = transcript.trim();

    if (!answerText) {
      setError('Please provide or type an answer before submitting.');
      return;
    }

    try {
      onAnswerSubmitted({
        transcript: answerText,
        answerType: mode,
        audioUrl: mode === 'voice' ? audioUrl : '',
      });
    } catch (err) {
      console.error('[corder] Error executing onAnswerSubmitted callback:', err);
      setError(err.message || 'Failed to submit answer.');
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (transcript.trim() && !isSubmitting) {
        handleSubmit(e);
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingSeconds = MAX_RECORDING_DURATION - recordingTime;
  const isNearLimit = isRecording && recordingTime >= WARNING_THRESHOLD;

  return (
    <div className="bg-[#FDFBF3] text-[#0F1E1B] p-6 sm:p-8 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-6">
      {/* Mode Selector Tabs */}
      <div className="flex items-center justify-between border-b-2 border-[#0F1E1B]/15 pb-4">
        <span className="font-serif-headline text-lg font-bold text-[#0F1E1B]">Your Answer Input</span>
        <div className="flex items-center bg-[#F5F2E6] p-1 rounded-2xl border-2 border-[#0F1E1B]">
          <button
            type="button"
            onClick={() => handleModeChange('voice')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${mode === 'voice' ? 'bg-[#0F1E1B] text-[#FDFBF3] editorial-shadow-sm' : 'text-[#0F1E1B]/70 hover:text-[#0F1E1B]'
              }`}
          >
            <Mic className="w-3.5 h-3.5 text-[#F5D90A]" />
            <span>Voice Record (Whisper STT)</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('text')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${mode === 'text' ? 'bg-[#0F1E1B] text-[#FDFBF3] editorial-shadow-sm' : 'text-[#0F1E1B]/70 hover:text-[#0F1E1B]'
              }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type Answer</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border-2 border-rose-600 rounded-2xl flex items-center space-x-3 text-rose-800 text-xs font-bold animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Voice Mode Controls */}
      {mode === 'voice' && (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center p-8 bg-[#F5F2E6] rounded-2xl border-2 border-[#0F1E1B]">
            {isRecording ? (
              <div className="flex flex-col items-center space-y-4 w-full">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-600 flex items-center justify-center animate-ping absolute inset-0"></div>
                  <div className="w-20 h-20 rounded-full bg-[#C1440E] flex items-center justify-center text-white relative z-10 shadow-lg">
                    <Mic className="w-8 h-8 text-[#F5D90A]" />
                  </div>
                </div>
                <div className="text-center">
                  <span className="font-mono text-3xl font-black text-[#C1440E]">{formatTime(recordingTime)}</span>
                  <p className="text-xs text-[#0F1E1B]/80 font-bold mt-1">Recording live voice response... Speak clearly (Max 5:00)</p>
                </div>

                {/* 30-second warning banner */}
                {isNearLimit && (
                  <div className="p-3 bg-[#FEF9C3] border-2 border-[#0F1E1B] rounded-xl flex items-center space-x-2 text-xs font-bold text-[#0F1E1B] animate-bounce">
                    <AlertTriangle className="w-4 h-4 text-[#C1440E]" />
                    <span>⚠️ 30 seconds remaining! Recording will auto-stop at 5:00 ({remainingSeconds}s left).</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={stopRecording}
                  aria-label="Stop recording audio"
                  className="px-6 py-2.5 bg-[#0F1E1B] text-[#FDFBF3] rounded-2xl font-bold text-sm flex items-center space-x-2 editorial-shadow hover:scale-105 transition-transform"
                >
                  <Square className="w-4 h-4 text-[#F5D90A] fill-current" />
                  <span>Stop Recording</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={transcribeLoading || isSubmitting}
                  aria-label="Start recording audio"
                  className="w-20 h-20 rounded-full bg-[#0F1E1B] text-[#FDFBF3] flex items-center justify-center editorial-shadow transition-all hover:scale-110 group disabled:opacity-50"
                >
                  <Mic className="w-8 h-8 text-[#F5D90A] group-hover:scale-110 transition-transform" />
                </button>
                <p className="text-xs text-[#0F1E1B]/75 font-bold">Click microphone to record your audio answer (Max 5 mins)</p>
              </div>
            )}

            {/* Audio Playback Controls */}
            {audioUrl && !isRecording && (
              <div className="mt-4 w-full max-w-md bg-[#FDFBF3] p-3 rounded-2xl border-2 border-[#0F1E1B] flex items-center space-x-3 shadow-xs">
                <audio src={audioUrl} controls className="w-full h-8" />
                <button
                  type="button"
                  onClick={startRecording}
                  className="p-2 text-[#0F1E1B] hover:text-[#C1440E] transition-colors"
                  title="Re-record"
                  aria-label="Re-record audio"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transcription Status or Text Input Confirmation */}
      {transcribeLoading ? (
        <div className="p-6 bg-[#F3E8FF] rounded-2xl border-2 border-[#0F1E1B] flex flex-col items-center justify-center space-y-2 text-[#0F1E1B]">
          <Loader2 className="w-6 h-6 animate-spin text-[#C1440E]" />
          <span className="text-sm font-bold">Transcribing audio via OpenAI Whisper API...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-[#0F1E1B] uppercase tracking-wider">
              {mode === 'voice' ? 'Transcribed Answer (Review & Edit if needed)' : 'Type Candidate Response'}
            </label>
            {transcript.trim() && (
              <span className="text-xs text-emerald-800 font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Ready for AI Evaluation</span>
              </span>
            )}
          </div>

          <textarea
            rows={5}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'voice'
                ? 'Your transcribed response will appear here automatically...'
                : 'Type your comprehensive response to this question here...'
            }
            className="w-full p-4 bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl text-[#0F1E1B] placeholder-[#0F1E1B]/40 focus:outline-none focus:bg-[#FDFBF3] text-sm leading-relaxed font-medium"
          />

          <button
            type="submit"
            disabled={!transcript.trim() || isSubmitting}
            className="w-full py-4 px-6 rounded-2xl font-bold text-[#FDFBF3] bg-[#0F1E1B] hover:bg-[#1A332E] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all editorial-shadow flex items-center justify-center space-x-2 cursor-pointer z-20 relative"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-[#F5D90A]" />
                <span>Evaluating Answer with AI Rubric...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-[#F5D90A]" />
                <span>Submit Answer for AI Grading</span>
                <ArrowRight className="w-4 h-4 text-[#F5D90A]" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
