import React, { useState, useRef, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Mic, MicOff, Square, Play, RefreshCw, Send, Type, Loader2, Sparkles, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function AnswerRecorder({ onAnswerSubmitted, isSubmitting }) {
  const [mode, setMode] = useState('voice'); // 'voice' or 'text'
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [transcribeLoading, setTranscribeLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      setError('');
      setAudioBlob(null);
      setAudioUrl('');
      setTranscript('');
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
        handleTranscribeAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
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
    }
  };

  const handleTranscribeAudio = async (blob) => {
    setTranscribeLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('audio', blob, 'user_answer.webm');

    try {
      const res = await axiosClient.post('/answers/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTranscript(res.data.transcript || '');
      setTranscribeLoading(false);
    } catch (err) {
      console.error('Transcription error:', err);
      setError(err.response?.data?.message || 'Speech-to-text transcription fallback. You can type or edit your response manually.');
      setTranscribeLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!transcript.trim()) {
      setError('Please provide or confirm an answer before submitting.');
      return;
    }
    onAnswerSubmitted({
      transcript: transcript.trim(),
      answerType: mode,
      audioUrl,
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#FDFBF3] text-[#0F1E1B] p-6 sm:p-8 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-6">
      {/* Mode Selector Tabs */}
      <div className="flex items-center justify-between border-b-2 border-[#0F1E1B]/15 pb-4">
        <span className="font-serif-headline text-lg font-bold text-[#0F1E1B]">Your Answer Input</span>
        <div className="flex items-center bg-[#F5F2E6] p-1 rounded-2xl border-2 border-[#0F1E1B]">
          <button
            type="button"
            onClick={() => setMode('voice')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              mode === 'voice' ? 'bg-[#0F1E1B] text-[#FDFBF3] editorial-shadow-sm' : 'text-[#0F1E1B]/70 hover:text-[#0F1E1B]'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-[#F5D90A]" />
            <span>Voice Record (Whisper STT)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              mode === 'text' ? 'bg-[#0F1E1B] text-[#FDFBF3] editorial-shadow-sm' : 'text-[#0F1E1B]/70 hover:text-[#0F1E1B]'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type Answer</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border-2 border-rose-600 rounded-2xl flex items-center space-x-3 text-rose-800 text-xs font-bold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Voice Mode Controls */}
      {mode === 'voice' && (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center p-8 bg-[#F5F2E6] rounded-2xl border-2 border-[#0F1E1B]">
            {isRecording ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-600 flex items-center justify-center animate-ping absolute inset-0"></div>
                  <div className="w-20 h-20 rounded-full bg-[#C1440E] flex items-center justify-center text-white relative z-10 shadow-lg">
                    <Mic className="w-8 h-8 text-[#F5D90A]" />
                  </div>
                </div>
                <div className="text-center">
                  <span className="font-mono text-3xl font-black text-[#C1440E]">{formatTime(recordingTime)}</span>
                  <p className="text-xs text-[#0F1E1B]/80 font-bold mt-1">Recording live voice response... Speak clearly.</p>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
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
                  className="w-20 h-20 rounded-full bg-[#0F1E1B] text-[#FDFBF3] flex items-center justify-center editorial-shadow transition-all hover:scale-110 group disabled:opacity-50"
                >
                  <Mic className="w-8 h-8 text-[#F5D90A] group-hover:scale-110 transition-transform" />
                </button>
                <p className="text-xs text-[#0F1E1B]/75 font-bold">Click microphone to record your audio answer</p>
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
        <div className="space-y-4">
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
            placeholder={
              mode === 'voice'
                ? 'Your transcribed response will appear here automatically...'
                : 'Type your comprehensive response to this question here...'
            }
            className="w-full p-4 bg-[#F5F2E6] border-2 border-[#0F1E1B] rounded-2xl text-[#0F1E1B] placeholder-[#0F1E1B]/40 focus:outline-none focus:bg-[#FDFBF3] text-sm leading-relaxed font-medium"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!transcript.trim() || isSubmitting}
            className="w-full py-4 px-6 rounded-2xl font-bold text-[#FDFBF3] bg-[#0F1E1B] hover:bg-[#1A332E] disabled:opacity-50 disabled:cursor-not-allowed transition-all editorial-shadow flex items-center justify-center space-x-2"
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
        </div>
      )}
    </div>
  );
}
