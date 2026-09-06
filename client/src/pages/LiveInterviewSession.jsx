import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import PreCallPermissionsModal from '../components/PreCallPermissionsModal';
import LiveTranscriptDrawer from '../components/LiveTranscriptDrawer';
import QuestionCard from '../components/QuestionCard';
import { Room } from 'livekit-client';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, RotateCcw,
  Loader2, Volume2, CheckCircle2, Type, Square,
  AlertCircle, RefreshCw
} from 'lucide-react';

// ============================================================================
// Interview state machine states
// ============================================================================
const STATES = {
  IDLE: 'idle',
  ASKING: 'asking',       // preparing to speak the question
  SPEAKING: 'speaking',   // AI TTS is playing the question aloud
  LISTENING: 'listening', // mic is live, recording candidate's answer
  PROCESSING: 'processing', // transcribing recorded audio
  EVALUATING: 'evaluating',  // sending transcript to Gemini for scoring + next question
  NEXT_QUESTION: 'next_question', // brief transition before speaking next question
  COMPLETED: 'completed',
  ERROR: 'error',
};

// Silence detection tuning (configurable) — spec: stop ~1.5-2.5s after speech ends
const SILENCE_THRESHOLD_MS = 2000;
const SILENCE_VOLUME_CUTOFF = 6; // 0-100 scale amplitude considered "silence"
const MIN_RECORDING_MS_BEFORE_AUTO_STOP = 800; // grace period, avoids instant cutoff
const NO_SPEECH_TIMEOUT_MS = 15000; // candidate never starts speaking at all
const MAX_ANSWER_DURATION_MS = 120000; // hard safety cap (2 minutes)

export default function LiveInterviewSession() {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();

  // Permissions & Setup state
  const [showPermissionsModal, setShowPermissionsModal] = useState(true);
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]); // pre-generated list; only [0] is used as opener
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voiceUnsupported, setVoiceUnsupported] = useState(false);

  // Interview state machine
  const [interviewState, setInterviewState] = useState(STATES.IDLE);
  const [errorDetail, setErrorDetail] = useState('');
  const [retryAction, setRetryAction] = useState(null); // fn to call on retry

  // Current question / progress
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  const [currentQuestionCategory, setCurrentQuestionCategory] = useState('General');
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(5);

  // Call & Media states
  const [isMicMuted, setIsMicMuted] = useState(false);
  const isMicMutedRef = useRef(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isEndingCall, setIsEndingCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [liveCaption, setLiveCaption] = useState('Connecting to interviewer Alex...');
  const [liveTranscriptPreview, setLiveTranscriptPreview] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const [thinkingStage, setThinkingStage] = useState('');

  // Transcript & Drawer states
  const [liveTurns, setLiveTurns] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // References
  const localVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const livekitRoomRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const synthRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // Recording / silence-detection refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceAnimFrameRef = useRef(null);
  const recordingStartTimeRef = useRef(0);
  const lastLoudTimeRef = useRef(0);
  const hasSpokenRef = useRef(false);
  const noSpeechTimeoutRef = useRef(null);
  const maxDurationTimeoutRef = useRef(null);
  const isStoppingRef = useRef(false);

  // Last spoken line, kept for "Repeat question" control
  const lastSpokenLineRef = useRef('');
  // When true, the next recorder.onstop should discard audio instead of processing it
  // (used when we cancel a recording ourselves — repeat question, teardown, etc.)
  const suppressProcessingRef = useRef(false);
  // Master guard: when true, all background speech, TTS in-flight responses, and question generation are immediately aborted
  const isCallEndedRef = useRef(false);

  const isInterviewActive = !showPermissionsModal && interviewState !== STATES.COMPLETED;

  // --------------------------------------------------------------------------
  // Browser capability checks
  // --------------------------------------------------------------------------
  const checkVoiceSupport = () => {
    const hasMediaRecorder = typeof window !== 'undefined' && !!window.MediaRecorder && !!navigator.mediaDevices?.getUserMedia;
    const hasWebmSupport = hasMediaRecorder && typeof MediaRecorder.isTypeSupported === 'function'
      ? MediaRecorder.isTypeSupported('audio/webm')
      : hasMediaRecorder;
    const hasTTS = 'speechSynthesis' in window;
    return hasMediaRecorder && hasWebmSupport && hasTTS;
  };

  useEffect(() => {
    if (!checkVoiceSupport()) {
      setVoiceUnsupported(true);
    }
  }, []);

  // --------------------------------------------------------------------------
  // 1. Fetch Session Data
  // --------------------------------------------------------------------------
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await axiosClient.get(`/sessions/${sessionId}`);
        const { session: sessDoc, questions: qList } = res.data;

        setSession(sessDoc);
        setQuestions(qList || []);
        setTotalQuestions(Number(sessDoc?.totalQuestions) || (qList?.length || 5));

        if (sessDoc?.status === 'completed') {
          navigate(`/interview/${sessionId}`);
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

  // --------------------------------------------------------------------------
  // 2. Call Timer
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (isInterviewActive) {
      timerIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isInterviewActive]);

  // --------------------------------------------------------------------------
  // 3. Warn before accidental page refresh / close mid-interview
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isInterviewActive) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isInterviewActive]);

  // --------------------------------------------------------------------------
  // Voices helper for TTS (async-safe across browsers)
  // --------------------------------------------------------------------------
  const getVoicesAsync = () => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) return resolve([]);
      let voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) return resolve(voices);

      const timer = setTimeout(() => {
        if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
        resolve(window.speechSynthesis ? window.speechSynthesis.getVoices() || [] : []);
      }, 500);

      window.speechSynthesis.onvoiceschanged = () => {
        clearTimeout(timer);
        window.speechSynthesis.onvoiceschanged = null;
        resolve(window.speechSynthesis.getVoices() || []);
      };
    });
  };

  // --------------------------------------------------------------------------
  // Cleanup all audio pipeline resources (recorder, analyser, timers)
  // --------------------------------------------------------------------------
  const cleanupRecordingPipeline = useCallback(() => {
    if (silenceAnimFrameRef.current) cancelAnimationFrame(silenceAnimFrameRef.current);
    if (noSpeechTimeoutRef.current) clearTimeout(noSpeechTimeoutRef.current);
    if (maxDurationTimeoutRef.current) clearTimeout(maxDurationTimeoutRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) { }
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    setMicLevel(0);
  }, []);

  // --------------------------------------------------------------------------
  // Enter an error state with an optional retry callback — never leaves the UI
  // permanently stuck on a loading state.
  // --------------------------------------------------------------------------
  const enterErrorState = useCallback((message, onRetry = null) => {
    console.error('[LiveInterview Error]', message);
    cleanupRecordingPipeline();
    setErrorDetail(message);
    setRetryAction(() => onRetry);
    setInterviewState(STATES.ERROR);
  }, [cleanupRecordingPipeline]);

  // ============================================================================
  // TTS: speak a line via real Gemini TTS voice (Puck) with browser TTS fallback
  // ============================================================================
  const speakLine = useCallback((text, onComplete) => {
    if (isCallEndedRef.current || !text) {
      if (onComplete && !isCallEndedRef.current) onComplete();
      return;
    }
    console.log('[VOICE DEBUG] AI question started:', text);
    console.log('[VOICE DEBUG] TTS response started:', text);
    lastSpokenLineRef.current = text;
    setLiveCaption(text);
    setInterviewState(STATES.SPEAKING);
    setThinkingStage('');

    // Stop any previously playing audio or speech
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      } catch (e) {}
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    let hasEnded = false;
    let safetyTimer = null;
    let currentBlobUrl = null;

    const finishSpeech = () => {
      if (hasEnded) return;
      hasEnded = true;
      if (safetyTimer) clearTimeout(safetyTimer);
      if (currentBlobUrl) {
        try { URL.revokeObjectURL(currentBlobUrl); } catch (e) {}
        currentBlobUrl = null;
      }
      console.log('[VOICE DEBUG] AI question finished');
      console.log('[VOICE DEBUG] TTS response finished');
      if (onComplete) onComplete();
    };

    const fallbackToBrowserTTS = async (reason = 'Unknown') => {
      if (isCallEndedRef.current) return;
      console.warn(`[TTS Diagnostic] Falling back to browser SpeechSynthesis. Reason: ${reason}`);
      if (!('speechSynthesis' in window)) {
        finishSpeech();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();

        const voices = await getVoicesAsync();
        if (isCallEndedRef.current) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.97;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        if (voices && voices.length > 0) {
          const bestVoice =
            voices.find((v) => v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Guy') || v.name.includes('David') || v.name.includes('Alex'))) ||
            voices.find((v) => v.lang.startsWith('en')) ||
            voices[0];
          if (bestVoice) utterance.voice = bestVoice;
        }

        utterance.onend = () => {
          if (isCallEndedRef.current) return;
          finishSpeech();
        };
        utterance.onerror = (e) => {
          if (isCallEndedRef.current) return;
          console.error('[Browser TTS Error]', e.error || e);
          finishSpeech();
        };

        synthRef.current = utterance;
        if (isCallEndedRef.current) return;
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
        window.speechSynthesis.resume();
      } catch (e) {
        console.warn('[Browser TTS Fallback Error]', e);
        finishSpeech();
      }
    };

    // Primary path: Request natural Gemini TTS voice from backend
    console.log(`[TTS Diagnostic] Requesting Gemini TTS for text (${text.length} chars): "${text.substring(0, 50)}..."`);
    axiosClient.post(`/sessions/${sessionId}/live/tts`, { text, voice: 'Puck' }, { timeout: 35000 })
      .then((res) => {
        // Guard: If the call has ended or unmounted, abort immediately
        if (isCallEndedRef.current) {
          console.log('[TTS Diagnostic] Call has ended — discarding in-flight Gemini audio.');
          return;
        }

        if (res.data?.audioUrl && !res.data?.isFallback) {
          try {
            // Convert base64 data to Blob to ensure seamless browser audio decoding
            const base64Data = res.data.audioUrl.replace(/^data:audio\/\w+;base64,/, '');
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const audioBlob = new Blob([bytes.buffer], { type: 'audio/wav' });
            currentBlobUrl = URL.createObjectURL(audioBlob);

            if (isCallEndedRef.current) {
              try { URL.revokeObjectURL(currentBlobUrl); } catch (e) {}
              return;
            }

            console.log(`[TTS Diagnostic] Received Gemini audio (${Math.round(bytes.length / 1024)} KB). Initializing Audio element with voice: ${res.data.voice || 'Puck'}...`);
            
            const audio = new Audio(currentBlobUrl);
            audioPlayerRef.current = audio;

            audio.onended = () => {
              if (isCallEndedRef.current) return;
              console.log('[TTS Diagnostic] Gemini audio playback completed successfully.');
              finishSpeech();
            };

            audio.onerror = (e) => {
              if (isCallEndedRef.current) return;
              const code = audio.error ? audio.error.code : 'unknown';
              const msg = audio.error ? audio.error.message : (e?.message || 'Decode error');
              console.warn(`[TTS Diagnostic] Audio element error (code: ${code}, msg: ${msg})`);
              fallbackToBrowserTTS(`Audio element error: ${msg}`);
            };

            audio.onloadedmetadata = () => {
              if (isCallEndedRef.current) return;
              console.log(`[TTS Diagnostic] Audio loaded. Duration: ${audio.duration?.toFixed(2)}s`);
              const dynamicTimeoutMs = Math.max(8000, ((audio.duration || 10) + 5) * 1000);
              safetyTimer = setTimeout(() => {
                if (!hasEnded && !isCallEndedRef.current) {
                  console.warn('[TTS Diagnostic] Dynamic safety timeout reached during Gemini audio playback.');
                  finishSpeech();
                }
              }, dynamicTimeoutMs);
            };

            if (isCallEndedRef.current) {
              try { URL.revokeObjectURL(currentBlobUrl); } catch (e) {}
              return;
            }

            audio.play()
              .then(() => {
                if (isCallEndedRef.current) {
                  audio.pause();
                  audio.src = '';
                  return;
                }
                console.log('[TTS Diagnostic] Gemini audio playback started seamlessly.');
              })
              .catch((playErr) => {
                if (isCallEndedRef.current) return;
                console.warn('[TTS Diagnostic] audio.play() promise rejected:', playErr.name, playErr.message);
                fallbackToBrowserTTS(`audio.play() rejected: ${playErr.name} - ${playErr.message}`);
              });
          } catch (blobErr) {
            if (isCallEndedRef.current) return;
            console.warn('[TTS Diagnostic] Failed to parse audio blob:', blobErr);
            fallbackToBrowserTTS(`Blob conversion failed: ${blobErr.message}`);
          }
        } else {
          if (isCallEndedRef.current) return;
          fallbackToBrowserTTS(res.data?.message || 'Backend returned fallback flag');
        }
      })
      .catch((err) => {
        if (isCallEndedRef.current) return;
        console.warn(`[TTS Diagnostic] Network/backend failure: ${err.message}`);
        fallbackToBrowserTTS(`Backend error: ${err.message}`);
      });
  }, [sessionId, getVoicesAsync]);



  // ============================================================================
  // STT pipeline: start listening with live silence detection via Web Audio API
  // ============================================================================
  const startListening = useCallback(() => {
    if (isCallEndedRef.current) return;
    console.log('[VOICE DEBUG] Listening started');
    console.log('[VOICE DEBUG] Microphone enabled:', !isMicMutedRef.current);
    const stream = mediaStreamRef.current;
    if (!stream) {
      enterErrorState('Microphone stream is unavailable. Please check your microphone and retry.', () => startListening());
      return;
    }
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      enterErrorState('Microphone audio track is unavailable. Please check your microphone and retry.', () => startListening());
      return;
    }
    if (isMicMutedRef.current) {
      console.log('[VOICE DEBUG] startListening skipped because microphone is muted.');
      setInterviewState(STATES.LISTENING);
      setLiveCaption('Microphone is muted. Unmute to continue answering.');
      return;
    }

    try {
      audioChunksRef.current = [];
      isStoppingRef.current = false;
      hasSpokenRef.current = false;
      recordingStartTimeRef.current = Date.now();
      lastLoudTimeRef.current = Date.now();

      const audioOnlyStream = new MediaStream(audioTracks);

      let recorder = null;
      try {
        recorder = new MediaRecorder(audioOnlyStream, { mimeType: 'audio/webm' });
      } catch (e1) {
        try {
          recorder = new MediaRecorder(audioOnlyStream);
        } catch (e2) {
          console.error('[MediaRecorder Init Error]', e2);
        }
      }
      mediaRecorderRef.current = recorder;

      if (recorder) {
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          cleanupRecordingPipeline();
          if (suppressProcessingRef.current) {
            suppressProcessingRef.current = false;
            return;
          }
          processCurrentAnswer();
        };

        try {
          recorder.start(250);
        } catch (startErr) {
          console.error('[Recorder Start Error]', startErr);
        }
      }

      setInterviewState(STATES.LISTENING);
      setLiveCaption('Listening for your answer...');
      setLiveTranscriptPreview('');

      // Silence detection via analyser volume monitoring (using audioOnlyStream)
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(audioOnlyStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const monitor = () => {
        if (!analyserRef.current || isStoppingRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((acc, v) => acc + v, 0) / dataArray.length;
        const level = Math.min(100, Math.round((average / 128) * 100));
        setMicLevel(level);

        const now = Date.now();
        if (level > SILENCE_VOLUME_CUTOFF) {
          lastLoudTimeRef.current = now;
          if (!hasSpokenRef.current) {
            hasSpokenRef.current = true;
            console.log('[VOICE DEBUG] User speech started');
            if (noSpeechTimeoutRef.current) clearTimeout(noSpeechTimeoutRef.current);
          }
        }

        const elapsedSinceStart = now - recordingStartTimeRef.current;
        const silenceDuration = now - lastLoudTimeRef.current;

        if (
          hasSpokenRef.current &&
          elapsedSinceStart > MIN_RECORDING_MS_BEFORE_AUTO_STOP &&
          silenceDuration > SILENCE_THRESHOLD_MS
        ) {
          console.log('[VOICE DEBUG] User speech ended');
          console.log('[VOICE DEBUG] Silence detected');
          stopListening();
          return;
        }

        silenceAnimFrameRef.current = requestAnimationFrame(monitor);
      };
      silenceAnimFrameRef.current = requestAnimationFrame(monitor);

      // If candidate never starts speaking at all, stop and treat as empty answer
      noSpeechTimeoutRef.current = setTimeout(() => {
        if (!hasSpokenRef.current) {
          console.warn('[Silence Detection] No speech detected within timeout — auto-stopping.');
          stopListening();
        }
      }, NO_SPEECH_TIMEOUT_MS);

      // Hard safety cap regardless of speech activity
      maxDurationTimeoutRef.current = setTimeout(() => {
        console.warn('[Silence Detection] Max answer duration reached — auto-stopping.');
        stopListening();
      }, MAX_ANSWER_DURATION_MS);
    } catch (err) {
      console.error('[Listening Start Error]', err);
      suppressProcessingRef.current = true;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch (e) { }
      }
      enterErrorState('Could not start the microphone recorder. Please retry or switch to text mode.', () => startListening());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enterErrorState, cleanupRecordingPipeline]);

  const processCurrentAnswer = () => {
    if (isCallEndedRef.current || suppressProcessingRef.current) {
      console.log('[SUBMIT DEBUG] Call ended or processing suppressed — discarding answer.');
      return;
    }
    console.log('[SUBMIT DEBUG] Answer processing started');
    if (audioChunksRef.current && audioChunksRef.current.length > 0) {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('[SUBMIT DEBUG] Answer available: audio blob size', blob.size);
      console.log('[SUBMIT DEBUG] Calling submit handler');
      handleRecordedAnswer(blob);
    } else if (liveTranscriptPreview && liveTranscriptPreview.trim()) {
      console.log('[SUBMIT DEBUG] Answer available: transcript preview');
      console.log('[SUBMIT DEBUG] Calling submit handler');
      submitTurn(liveTranscriptPreview.trim());
    } else {
      console.log('[SUBMIT DEBUG] Answer available: fallback empty turn');
      console.log('[SUBMIT DEBUG] Calling submit handler');
      submitTurn('');
    }
  };

  const stopListening = () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    if (noSpeechTimeoutRef.current) clearTimeout(noSpeechTimeoutRef.current);
    if (maxDurationTimeoutRef.current) clearTimeout(maxDurationTimeoutRef.current);
    if (silenceAnimFrameRef.current) cancelAnimationFrame(silenceAnimFrameRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        cleanupRecordingPipeline();
        processCurrentAnswer();
      }
    } else {
      cleanupRecordingPipeline();
      processCurrentAnswer();
    }
  };

  // ============================================================================
  // Handle recorded answer: transcribe -> evaluate -> speak next question
  // ============================================================================
  const handleRecordedAnswer = async (blob) => {
    if (isCallEndedRef.current) return;
    setInterviewState(STATES.PROCESSING);
    setThinkingStage('Transcribing your voice with Gemini...');
    setLiveCaption('Transcribing your answer...');
    console.log('[VOICE DEBUG] Answer length/audio length:', blob ? blob.size : 0);

    if (!blob || blob.size < 150) {
      if (isCallEndedRef.current) return;
      console.log('[VOICE DEBUG] Audio blob small or empty, continuing with transcript preview fallback');
      await submitTurn(liveTranscriptPreview || '');
      return;
    }

    const formData = new FormData();
    formData.append('audio', blob, 'answer.webm');

    try {
      const res = await axiosClient.post('/answers/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      if (isCallEndedRef.current) return;
      const transcript = (res.data.transcript || '').trim();
      setLiveTranscriptPreview(transcript);
      await submitTurn(transcript);
    } catch (err) {
      if (isCallEndedRef.current) return;
      console.error('[Transcription Error]', err);
      console.log('[VOICE DEBUG] Transcription error fallback, proceeding to submit turn');
      await submitTurn(liveTranscriptPreview || '');
    }
  };

  // ============================================================================
  // Submit the turn to Gemini for evaluation + dynamic next question
  // ============================================================================
  const submitTurn = async (transcriptText) => {
    if (isCallEndedRef.current) return;
    console.log('[SUBMIT DEBUG] submitTurn() called');
    console.log('[VOICE DEBUG] submitTurn() called');
    console.log('[VOICE DEBUG] Answer length/audio length:', transcriptText ? transcriptText.length : 0);
    setInterviewState(STATES.EVALUATING);
    setThinkingStage('Alex is evaluating your answer & formulating the next question...');
    setLiveCaption('Alex is evaluating your answer...');

    console.log('[VOICE DEBUG] Gemini request started');
    try {
      const res = await axiosClient.post(`/sessions/${sessionId}/live/turn`, {
        userTranscript: transcriptText,
        currentQuestionIndex: currentQuestionNumber - 1,
        currentQuestionText,
        conversationHistory: liveTurns.slice(-6),
      }, { timeout: 30000 });

      if (isCallEndedRef.current) {
        console.log('[Turn] Call ended while evaluation was in flight — aborting next question.');
        return;
      }

      console.log('[SUBMIT DEBUG] Gemini response received:', res.data?.interviewerLine);
      console.log('[VOICE DEBUG] Gemini response received:', res.data);
      console.log('[VOICE DEBUG] Gemini response content:', res.data?.interviewerLine);

      const {
        interviewerLine, questionText, nextQuestionText, decision, turnScore,
        keyPointsCovered, category, totalQuestions: serverTotal,
      } = res.data;

      if (serverTotal) setTotalQuestions(serverTotal);

      const newTurn = {
        questionIndex: currentQuestionNumber - 1,
        questionText: questionText || currentQuestionText,
        userTranscript: transcriptText,
        interviewerLine,
        keyPointsCovered: keyPointsCovered || [],
        turnScore: turnScore || 6,
        category: category || currentQuestionCategory,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setLiveTurns((prev) => [...prev, newTurn]);

      if (decision === 'complete') {
        setInterviewState(STATES.NEXT_QUESTION);
        speakLine(interviewerLine, () => {
          if (!isCallEndedRef.current) finishInterview();
        });
        return;
      }

      // followup: same question topic. next_question: move forward.
      if (decision === 'next_question') {
        setCurrentQuestionNumber((prev) => Math.min(prev + 1, totalQuestions));
      }
      if (nextQuestionText) {
        setCurrentQuestionText(nextQuestionText);
        setCurrentQuestionCategory(category || currentQuestionCategory);
        console.log('[SUBMIT DEBUG] Next question triggered:', nextQuestionText);
        console.log('[VOICE DEBUG] Next question triggered:', nextQuestionText);
      } else {
        console.log('[SUBMIT DEBUG] Next question triggered:', currentQuestionText);
        console.log('[VOICE DEBUG] Next question triggered:', currentQuestionText);
      }

      if (isCallEndedRef.current) return;
      setInterviewState(STATES.NEXT_QUESTION);
      speakLine(interviewerLine, () => {
        if (isCallEndedRef.current) return;
        if (!isMicMutedRef.current) {
          startListening();
        } else {
          setInterviewState(STATES.LISTENING);
          setLiveCaption('Microphone is muted. Unmute to continue answering.');
        }
      });
    } catch (err) {
      if (isCallEndedRef.current) return;
      console.error('[Submit Turn Error]', err);
      const fallbackLine = "Thank you for that answer. Let's move on to the next question.";
      console.log('[VOICE DEBUG] Gemini error fallback, speaking fallback line');
      speakLine(fallbackLine, () => {
        if (!isCallEndedRef.current && !isMicMutedRef.current) startListening();
      });
    }
  };


  const handleManualStopRecording = () => {
    console.log('[SUBMIT DEBUG] Button clicked');
    console.log('[SUBMIT DEBUG] isListening:', interviewState === STATES.LISTENING);
    console.log('[SUBMIT DEBUG] isProcessing:', interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING);
    console.log('[SUBMIT DEBUG] isMicMuted:', isMicMutedRef.current);

    if (interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING) {
      console.log('[SUBMIT DEBUG] Already processing/evaluating turn');
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('[SUBMIT DEBUG] Stopping active MediaRecorder to finalize audio turn');
      stopListening();
    } else {
      console.log('[SUBMIT DEBUG] MediaRecorder not actively recording, processing current answer directly');
      processCurrentAnswer();
    }
  };

  // --------------------------------------------------------------------------
  // 4. Handle Permissions Granted & kick off the interview loop
  // --------------------------------------------------------------------------
  const handlePermissionsGranted = async ({ stream, hasCamera, hasMic }) => {
    setShowPermissionsModal(false);
    mediaStreamRef.current = stream;

    if (!hasCamera || !stream || stream.getVideoTracks().length === 0) {
      setIsCameraOff(true);
    }

    if (voiceUnsupported) {
      enterErrorState('Voice recording or speech synthesis is not supported in this browser (e.g. Safari). Please switch to text mode.', null);
      return;
    }

    const hasWorkingAudioTrack = !!stream && stream.getAudioTracks().length > 0;
    if (!hasWorkingAudioTrack) {
      enterErrorState(
        'Microphone access is required for the voice interview. Please allow microphone permissions and retry, or switch to text mode.',
        () => setShowPermissionsModal(true)
      );
      return;
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = true;
      console.log('[Mic Diagnostic] Microphone permission granted. Audio track active:', audioTrack.enabled);
    }
    setIsMicMuted(false);
    isMicMutedRef.current = false;

    // Prime browser SpeechSynthesis on user click gesture so autoplay policy is unlocked
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
        getVoicesAsync();
        const silentUtterance = new SpeechSynthesisUtterance('');
        silentUtterance.volume = 0;
        window.speechSynthesis.speak(silentUtterance);
      } catch (e) {
        console.warn('[Web Speech Pre-warm Notice]', e);
      }
    }

    // Prime HTMLAudioElement on user click gesture so browser Autoplay Policy is unlocked for Gemini TTS
    try {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio();
      }
      audioPlayerRef.current.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      audioPlayerRef.current.play().then(() => {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
          audioPlayerRef.current.currentTime = 0;
        }
      }).catch((e) => console.log('[Audio Autoplay Pre-warm Notice]', e.message));
    } catch (e) {
      console.warn('[Audio Pre-warm Notice]', e);
    }

    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch((e) => console.warn('[Video Play Notice]', e.message));
    }

    // Optional LiveKit room connection (self-view / recording infra); non-blocking on failure
    try {
      const res = await axiosClient.post(`/sessions/${sessionId}/live/token`);
      const { isFallback, token, url } = res.data;
      if (!isFallback && token && url) {
        const room = new Room();
        livekitRoomRef.current = room;
        await room.connect(url, token);
        if (stream) {
          const videoTrack = stream.getVideoTracks()[0];
          const audioTrack = stream.getAudioTracks()[0];
          if (videoTrack) await room.localParticipant.publishTrack(videoTrack, { name: 'camera-track' });
          if (audioTrack) {
            await room.localParticipant.publishTrack(audioTrack, { name: 'mic-track' });
            console.log('[Mic Diagnostic] Microphone track published to LiveKit.');
          }
        }
      }
    } catch (lkErr) {
      console.log('[LiveKit Notice] Falling back to local-only media stream:', lkErr.message);
    }

    // Determine opening question: prefer pre-generated personalized Q1, fallback gracefully.
    const firstQ = questions[0];
    const openingQuestionText = firstQ?.questionText || `Tell me a bit about your background and experience relevant to the ${session?.targetRole || 'role'}.`;
    const openingCategory = firstQ?.category || 'General';

    setCurrentQuestionText(openingQuestionText);
    setCurrentQuestionCategory(openingCategory);
    setCurrentQuestionNumber(1);

    const greeting = `Hello! I'm Alex, your AI interviewer today. Let's begin: ${openingQuestionText}`;

    setInterviewState(STATES.ASKING);
    speakLine(greeting, () => {
      if (!isMicMutedRef.current) startListening();
    });
  };

  // Video self-view attachment (stable, non-flickering)
  useEffect(() => {
    if (!showPermissionsModal && !isCameraOff && localVideoRef.current && mediaStreamRef.current) {
      if (localVideoRef.current.srcObject !== mediaStreamRef.current) {
        localVideoRef.current.srcObject = mediaStreamRef.current;
        localVideoRef.current.play().catch((err) => console.warn('[Video Play Notice]', err.message));
      }
    }
  }, [showPermissionsModal, isCameraOff]);

  // Full teardown on unmount
  useEffect(() => {
    return () => {
      isCallEndedRef.current = true;
      teardownMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // --------------------------------------------------------------------------
  // Controls
  // --------------------------------------------------------------------------
  const toggleMic = () => {
    const nextMuted = !isMicMuted;
    console.log(`[Mic Diagnostic] Mute button clicked. Changing isMicMuted to: ${nextMuted}`);
    setIsMicMuted(nextMuted);
    isMicMutedRef.current = nextMuted;

    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !nextMuted;
        console.log(`[Mic Diagnostic] MediaStream audioTrack.enabled: ${audioTrack.enabled}`);
      }
    }

    if (livekitRoomRef.current?.localParticipant) {
      try {
        livekitRoomRef.current.localParticipant.setMicrophoneEnabled(!nextMuted);
        console.log(`[Mic Diagnostic] LiveKit microphone enabled set to: ${!nextMuted}`);
      } catch (e) {
        console.warn('[Mic Diagnostic] LiveKit mic toggle notice:', e.message);
      }
    }

    if (nextMuted) {
      if (interviewState === STATES.LISTENING) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          suppressProcessingRef.current = true;
          try { mediaRecorderRef.current.stop(); } catch (e) {}
        }
        cleanupRecordingPipeline();
        setLiveCaption('Microphone is muted. Unmute to continue answering.');
      }
    } else {
      if (interviewState === STATES.LISTENING) {
        setLiveCaption('Listening for your answer...');
        startListening();
      }
    }
  };

  const toggleCamera = () => {
    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
        if (livekitRoomRef.current?.localParticipant) {
          try { livekitRoomRef.current.localParticipant.setCameraEnabled(videoTrack.enabled); } catch (e) { }
        }
      }
    } else {
      setIsCameraOff(!isCameraOff);
    }
  };

  const handleRepeatQuestion = () => {
    if (audioPlayerRef.current) {
      try { audioPlayerRef.current.pause(); audioPlayerRef.current.currentTime = 0; } catch (e) {}
    }
    if (interviewState === STATES.LISTENING && mediaRecorderRef.current?.state === 'recording') {
      suppressProcessingRef.current = true;
      stopListening();
    }
    speakLine(lastSpokenLineRef.current || currentQuestionText, () => {
      if (!isMicMutedRef.current) startListening();
    });
  };

  const handleSwitchToTextMode = () => {
    isCallEndedRef.current = true;
    teardownMedia();
    navigate(`/interview/${sessionId}`);
  };

  const teardownMedia = () => {
    isCallEndedRef.current = true;
    suppressProcessingRef.current = true;

    // 1. Immediately pause and destroy HTML5 Audio element
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.onended = null;
        audioPlayerRef.current.onerror = null;
        audioPlayerRef.current.src = '';
        audioPlayerRef.current.load();
      } catch (e) {}
      audioPlayerRef.current = null;
    }

    // 2. Immediately cancel browser speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.pause();
      } catch (e) {}
    }

    // 3. Stop MediaRecorder and discard
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.stop();
      } catch (e) { }
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];

    // 4. Cleanup audio context, analyser, animation frames, timeouts
    cleanupRecordingPipeline();

    // 5. Disconnect LiveKit room
    if (livekitRoomRef.current) {
      try {
        livekitRoomRef.current.disconnect();
      } catch (e) { }
      livekitRoomRef.current = null;
    }

    // 6. Stop all hardware tracks (camera and mic)
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      mediaStreamRef.current = null;
    }
  };

  const finishInterview = async () => {
    if (isCallEndedRef.current || isEndingCall) {
      teardownMedia();
      return;
    }
    isCallEndedRef.current = true;
    setIsEndingCall(true);
    teardownMedia();

    try {
      await axiosClient.post(`/sessions/${sessionId}/live/complete`, { liveTurns });
    } catch (err) {
      console.error('[Live complete error]', err);
    } finally {
      teardownMedia();
      setInterviewState(STATES.COMPLETED);
      navigate(`/interview/${sessionId}`);
    }
  };

  const handleEndInterview = () => {
    isCallEndedRef.current = true;
    finishInterview();
  };


  // Format Duration Helper
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const stateLabel = {
    [STATES.IDLE]: 'Ready',
    [STATES.ASKING]: 'Preparing question...',
    [STATES.SPEAKING]: '🔊 AI Speaking...',
    [STATES.LISTENING]: '🎤 Listening...',
    [STATES.PROCESSING]: '🧠 Processing Answer...',
    [STATES.EVALUATING]: '🧠 Evaluating Answer...',
    [STATES.NEXT_QUESTION]: '⏳ Preparing Next Question...',
    [STATES.COMPLETED]: 'Interview Complete',
    [STATES.ERROR]: 'Something went wrong',
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-[#12211A] font-medium">
        <Loader2 className="w-10 h-10 animate-spin text-[#C05C33] mb-3" />
        <p className="text-sm font-bold">Initializing Live Voice Interview Environment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <AlertCircle className="w-10 h-10 text-rose-600 mb-3" />
        <p className="text-sm font-bold text-[#12211A]">{error}</p>
        <button
          onClick={() => navigate(`/interview/${sessionId}`)}
          className="mt-4 px-5 py-2.5 bg-[#12211A] text-[#E7B92E] rounded-2xl text-xs font-bold"
        >
          Back to Text Interview
        </button>
      </div>
    );
  }

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

      {/* Voice unsupported notice, shown after permissions if this browser can't do voice */}
      {!showPermissionsModal && voiceUnsupported && interviewState !== STATES.ERROR && (
        <div className="max-w-xl mx-auto w-full p-6 bg-rose-50 border-2 border-rose-600 rounded-3xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-sm font-bold text-rose-800">
            Voice recording or speech synthesis isn't supported in this browser (e.g. Safari).
          </p>
          <button
            onClick={handleSwitchToTextMode}
            className="px-5 py-2.5 bg-[#12211A] text-[#E7B92E] rounded-2xl text-xs font-bold inline-flex items-center space-x-2"
          >
            <Type className="w-4 h-4" />
            <span>Switch to Text Mode</span>
          </button>
        </div>
      )}

      {/* Main Call Container */}
      {!showPermissionsModal && !voiceUnsupported && (
        <div className="max-w-7xl mx-auto w-full space-y-5 flex-1 flex flex-col justify-between">

          {/* 1. TOP HEADER */}
          <div className="flex flex-col sm:flex-row items-center justify-between bg-[#FBF9F3] px-6 py-4 rounded-3xl border-3 border-[#12211A] editorial-shadow-sm gap-4">
            <div className="flex items-center space-x-3">
              <span className="font-serif-headline text-lg font-black text-[#12211A] uppercase tracking-wider">
                AI INTERVIEW
              </span>
              <span className="text-[#12211A]/30">•</span>
              <span className="text-xs font-bold text-[#C05C33]">
                {session?.targetRole || 'Full Stack & AI Engineer'}
              </span>
            </div>

            <div className="flex items-center space-x-2 px-4 py-1.5 bg-[#12211A] text-[#E7B92E] rounded-full border border-[#12211A] text-xs font-extrabold uppercase tracking-widest font-mono">
              QUESTION {currentQuestionNumber} / {totalQuestions}
            </div>

            <div className="flex items-center space-x-3 text-xs font-bold">
              <span className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 rounded-full font-black">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>LIVE</span>
              </span>
              <span className="px-3 py-1 bg-[#E7B92E] text-[#12211A] rounded-full border border-[#12211A] font-mono">
                ⏱ {formatTime(callDuration)}
              </span>
            </div>
          </div>

          {/* Error banner with retry */}
          {interviewState === STATES.ERROR && (
            <div className="p-5 bg-rose-50 border-2 border-rose-600 rounded-2xl space-y-3 text-rose-800">
              <div className="flex items-center space-x-2 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorDetail}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {retryAction && (
                  <button
                    onClick={() => { setInterviewState(STATES.ASKING); retryAction(); }}
                    className="px-4 py-2 bg-[#12211A] text-[#E7B92E] rounded-xl text-xs font-bold flex items-center space-x-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                )}
                <button
                  onClick={handleSwitchToTextMode}
                  className="px-4 py-2 bg-[#E4DDC9] text-[#12211A] rounded-xl text-xs font-bold flex items-center space-x-2 border-2 border-[#12211A]"
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Switch to Text Mode</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. MAIN LAYOUT (TWO COLUMNS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch">

            {/* LEFT — AI INTERVIEWER PANEL (7 COLS) */}
            <div className="lg:col-span-7 bg-[#12211A] text-[#FBF9F3] rounded-3xl border-3 border-[#12211A] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden editorial-shadow-lg min-h-[460px]">

              {/* Header inside AI Panel */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center space-x-2 bg-[#1D3327] px-3.5 py-1.5 rounded-full border border-[#E7B92E]/40 text-xs text-[#FBF9F3]">
                  <span className={`w-2.5 h-2.5 rounded-full ${(interviewState === STATES.SPEAKING || interviewState === STATES.ASKING || interviewState === STATES.NEXT_QUESTION) ? 'bg-[#E7B92E] animate-ping' : 'bg-emerald-400'}`}></span>
                  <span className="font-bold">Alex (AI Technical Interviewer)</span>
                </div>

                {/* Dynamic Status Pill */}
                <div className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border flex items-center space-x-1.5 bg-[#12211A]/90 border-[#E7B92E] text-[#E7B92E]">
                  {(interviewState === STATES.SPEAKING || interviewState === STATES.ASKING || interviewState === STATES.NEXT_QUESTION) && (
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
                  {(interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING) && (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E7B92E]" />
                      <span>● AI Thinking</span>
                    </>
                  )}
                  {interviewState === STATES.IDLE && <span>● Ready</span>}
                </div>
              </div>

              {/* 3. AI AVATAR ORB VISUALIZER */}
              <div className="my-auto text-center space-y-5 z-10 py-6 flex flex-col items-center justify-center">
                <div className="relative inline-block">
                  {/* Glowing Circular AI Orb */}
                  <div className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-[#1D3327] via-[#12211A] to-[#254233] border-4 ${(interviewState === STATES.SPEAKING || interviewState === STATES.ASKING) ? 'border-[#E7B92E] shadow-[0_0_35px_rgba(231,185,46,0.6)] scale-105' : (interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING) ? 'border-[#E7B92E] shadow-[0_0_30px_rgba(231,185,46,0.4)] animate-pulse' : 'border-[#E4DDC9]/30'} flex items-center justify-center mx-auto transition-all duration-300`}>
                    {interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING ? (
                      <Loader2 className="w-16 h-16 text-[#E7B92E] animate-spin" />
                    ) : (
                      <Volume2 className={`w-16 h-16 ${(interviewState === STATES.SPEAKING || interviewState === STATES.ASKING) ? 'text-[#E7B92E] scale-110' : 'text-[#DCEEDF]/60'} transition-transform duration-300`} />
                    )}
                  </div>

                  {/* Equalizer Bar Mouth */}
                  <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 flex items-center space-x-1.5 bg-[#12211A] px-5 py-1.5 rounded-full border-2 border-[#E7B92E] shadow-md">
                    {[0.4, 0.9, 0.6, 1.0, 0.7, 0.4].map((scale, i) => (
                      <div
                        key={i}
                        className={`w-1.5 bg-[#E7B92E] rounded-full transition-all duration-150 ${(interviewState === STATES.SPEAKING || interviewState === STATES.ASKING) ? 'motion-safe:animate-bounce' : (interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING) ? 'animate-pulse' : 'h-2'}`}
                        style={{ height: (interviewState === STATES.SPEAKING || interviewState === STATES.ASKING) ? `${scale * 22}px` : (interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING) ? `${scale * 12}px` : '6px', animationDelay: `${i * 100}ms` }}
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
                <p className="text-[10px] font-extrabold text-[#E7B92E] uppercase tracking-widest mb-1">Live AI Captions</p>
                <p className="text-xs sm:text-sm font-medium text-[#FBF9F3] leading-relaxed italic">"{liveCaption}"</p>
              </div>

            </div>

            {/* RIGHT — CANDIDATE PREVIEW + QUESTION CARD (5 COLS) */}
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

              {/* 4. CLEAN QUESTION CARD */}
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

          </div>

          {/* Live Transcript Preview Bar */}
          {liveTranscriptPreview && (interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING) && (
            <div className="p-3.5 bg-[#FBF9F3] border-2 border-[#12211A] rounded-2xl flex items-center space-x-2 text-xs font-bold text-[#12211A] animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>You said: <strong className="font-normal italic">"{liveTranscriptPreview}"</strong></span>
            </div>
          )}

          {/* 7. SINGLE CLEAR STATUS BAR */}
          <div className="bg-[#12211A] text-[#FBF9F3] px-5 py-3.5 rounded-2xl border-2 border-[#12211A] flex items-center justify-center text-center shadow-md">
            {(interviewState === STATES.SPEAKING || interviewState === STATES.ASKING || interviewState === STATES.NEXT_QUESTION) && (
              <span className="text-xs sm:text-sm font-bold text-[#E7B92E] flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-[#E7B92E] animate-pulse shrink-0" />
                <span>🔊 Alex is speaking...</span>
              </span>
            )}
            {interviewState === STATES.LISTENING && (
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm font-bold">
                {isMicMuted ? (
                  <span className="text-rose-300">⚠️ Microphone is muted — unmute below to speak your answer</span>
                ) : (
                  <>
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                      <span>🎙 Your turn — speak your answer</span>
                    </div>
                    <div className="flex items-center space-x-1 h-3.5 px-2 py-0.5 bg-[#1D3327] rounded-lg border border-emerald-500/30">
                      {[0.3, 0.7, 1.0, 0.6, 0.4].map((mult, i) => (
                        <div
                          key={i}
                          className="w-1 bg-[#E7B92E] rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(3, Math.round((micLevel / 100) * 14 * mult))}px` }}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-[#DCEEDF]/70 font-normal hidden sm:inline">
                      Click <strong>"I'm Done Speaking"</strong> when finished
                    </span>
                  </>
                )}
              </div>
            )}
            {(interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING) && (
              <div className="flex items-center space-x-2.5 text-xs sm:text-sm font-bold text-[#E7B92E]">
                <Loader2 className="w-4 h-4 animate-spin text-[#E7B92E] shrink-0" />
                <span>🧠 {thinkingStage || 'Alex is evaluating your answer & formulating the next question...'}</span>
              </div>
            )}
            {interviewState === STATES.IDLE && (
              <span className="text-xs font-bold text-[#DCEEDF]">● Interview Room Ready</span>
            )}
          </div>

          {/* 5. FLOATING CONTROLS BAR */}
          <div className="bg-[#FBF9F3] border-3 border-[#12211A] rounded-3xl p-4 editorial-shadow flex flex-wrap items-center justify-between gap-3">

            {/* Left Controls: Secondary Mute, Camera, Repeat */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={toggleMic}
                className={`px-4 py-3 rounded-2xl border-2 border-[#12211A] font-bold text-xs flex items-center space-x-2 transition-all ${isMicMuted ? 'bg-rose-100 text-rose-700' : 'bg-[#E7B92E] text-[#12211A]'}`}
              >
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isMicMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              <button
                type="button"
                onClick={toggleCamera}
                className={`px-4 py-3 rounded-2xl border-2 border-[#12211A] font-bold text-xs flex items-center space-x-2 transition-all ${isCameraOff ? 'bg-rose-100 text-rose-700' : 'bg-[#F5F1E7] text-[#12211A]'}`}
              >
                {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                <span>{isCameraOff ? 'Start Camera' : 'Stop Camera'}</span>
              </button>

              <button
                type="button"
                onClick={handleRepeatQuestion}
                disabled={interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING}
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
                disabled={interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING}
                className={`px-7 py-3.5 rounded-2xl text-xs sm:text-sm font-black flex items-center space-x-2.5 editorial-shadow-lg transition-all cursor-pointer border-3 border-[#12211A] ${
                  interviewState === STATES.LISTENING
                    ? 'bg-[#1D3327] hover:bg-[#284737] text-[#E7B92E] ring-4 ring-[#E7B92E]/40 animate-pulse scale-105'
                    : interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING
                    ? 'bg-[#C05C33] text-[#FBF9F3] opacity-85 cursor-wait'
                    : 'bg-[#C05C33] hover:bg-[#a84d28] text-[#FBF9F3]'
                } disabled:opacity-50`}
              >
                {interviewState === STATES.LISTENING ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-[#E7B92E]" />
                    <span>I'm Done Speaking ✓</span>
                  </>
                ) : interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING ? (
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
                <span>Transcript ({liveTurns.length})</span>
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
        </div>
      )}

      <LiveTranscriptDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        liveTurns={liveTurns}
      />
    </div>
  );
}