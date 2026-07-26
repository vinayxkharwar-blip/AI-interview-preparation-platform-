import React, { useState, useRef, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Mic, MicOff, Square, Play, RefreshCw, Send, Type, Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AnswerRecorder({ onAnswerSubmitted, isSubmitting }) {
  const [mode, setMode] = useState('voice'); // 'voice' or 'text'
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [transcribeLoading, setTranscribeLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Clean up timer on unmount
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
      setIsConfirmed(false);
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

        // Stop all audio track streams
        stream.getTracks().forEach((track) => track.stop());

        // Trigger automatic speech-to-text transcription via Whisper API backend
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
      setError('Microphone permission denied or not supported by browser. Switch to text input.');
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
      setError(err.response?.data?.message || 'Speech-to-text transcription failed. You can type your response manually.');
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
    <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
      {/* Mode Selector Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <span className="text-sm font-bold text-slate-300">Your Answer Input</span>
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('voice')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              mode === 'voice' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Record (Whisper STT)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              mode === 'text' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type Answer</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Voice Mode Controls */}
      {mode === 'voice' && (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center p-8 bg-slate-900/60 rounded-2xl border border-slate-800">
            {isRecording ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center animate-ping absolute inset-0"></div>
                  <div className="w-20 h-20 rounded-full bg-rose-600 flex items-center justify-center text-white relative z-10 shadow-lg shadow-rose-600/50">
                    <Mic className="w-8 h-8" />
                  </div>
                </div>
                <div className="text-center">
                  <span className="font-mono text-2xl font-bold text-rose-400">{formatTime(recordingTime)}</span>
                  <p className="text-xs text-slate-400 mt-1">Recording your response... Speak clearly.</p>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-sm flex items-center space-x-2 shadow-lg shadow-rose-600/30 transition-all hover:scale-105"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop Recording</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={transcribeLoading || isSubmitting}
                  className="w-20 h-20 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-xl shadow-indigo-600/30 transition-all hover:scale-110 group disabled:opacity-50"
                >
                  <Mic className="w-8 h-8 group-hover:scale-110 transition-transform" />
                </button>
                <p className="text-xs text-slate-400 font-medium">Click microphone to start audio response</p>
              </div>
            )}

            {/* Audio Playback Controls */}
            {audioUrl && !isRecording && (
              <div className="mt-4 w-full max-w-md bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center space-x-3">
                <audio src={audioUrl} controls className="w-full h-8" />
                <button
                  type="button"
                  onClick={startRecording}
                  className="p-2 text-slate-400 hover:text-indigo-400 transition-colors"
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
        <div className="p-6 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col items-center justify-center space-y-2 text-indigo-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm font-medium">Transcribing audio via OpenAI Whisper API...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              {mode === 'voice' ? 'Transcribed Answer (Review & Edit if needed)' : 'Type Candidate Response'}
            </label>
            {transcript.trim() && (
              <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ready for Submission</span>
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
            className="w-full p-4 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm leading-relaxed"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!transcript.trim() || isSubmitting}
            className="w-full py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-indigo-600/25 flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Evaluating Answer with AI Rubric...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Submit Answer for AI Grading</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
