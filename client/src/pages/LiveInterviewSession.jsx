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
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isEndingCall, setIsEndingCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [liveCaption, setLiveCaption] = useState('Connecting to interviewer Alex...');
  const [liveTranscriptPreview, setLiveTranscriptPreview] = useState('');
  const [micLevel, setMicLevel] = useState(0);

  // Transcript & Drawer states
  const [liveTurns, setLiveTurns] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // References
  const localVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const livekitRoomRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const synthRef = useRef(null);

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
  // TTS: speak a line, then invoke callback. Robust across browser autoplay quirks.
  // ============================================================================
  const speakLine = useCallback((text, onComplete) => {
    if (!text) {
      if (onComplete) onComplete();
      return;
    }
    lastSpokenLineRef.current = text;
    setLiveCaption(text);
    setInterviewState(STATES.SPEAKING);

    if (!('speechSynthesis' in window)) {
      enterErrorState('Text-to-speech is not supported in this browser. Please switch to text mode.', null);
      return;
    }

    (async () => {
      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();

        const voices = await getVoicesAsync();
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

        let hasEnded = false;
        const finishSpeech = () => {
          if (hasEnded) return;
          hasEnded = true;
          if (onComplete) onComplete();
        };

        utterance.onend = finishSpeech;
        utterance.onerror = (e) => {
          console.error('[TTS Error]', e.error || e);
          finishSpeech(); // never block the loop on a TTS failure
        };

        synthRef.current = utterance;
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
        window.speechSynthesis.resume();

        // Chrome sometimes pauses long utterances — periodic resume heartbeat
        const expectedDurationMs = Math.max(3500, (text.length / 12) * 1000);
        const heartbeat = setInterval(() => {
          if (!hasEnded && window.speechSynthesis?.speaking) {
            window.speechSynthesis.resume();
          } else {
            clearInterval(heartbeat);
          }
        }, expectedDurationMs / 3);

        // Safety timeout so we never hang indefinitely if onend never fires
        setTimeout(() => {
          clearInterval(heartbeat);
          if (!hasEnded) {
            console.warn('[TTS Notice] Safety timeout reached for speech end.');
            finishSpeech();
          }
        }, expectedDurationMs + 4000);
      } catch (err) {
        console.error('[TTS Exception]', err);
        if (onComplete) onComplete();
      }
    })();
  }, [enterErrorState]);

  // ============================================================================
  // STT pipeline: start listening with live silence detection via Web Audio API
  // ============================================================================
  const startListening = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (!stream) {
      enterErrorState('Microphone stream is unavailable. Please check your microphone and retry.', () => startListening());
      return;
    }
    if (isMicMuted) {
      // Respect mute — wait, UI shows a resume prompt instead of recording silently.
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

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        cleanupRecordingPipeline();
        if (suppressProcessingRef.current) {
          suppressProcessingRef.current = false;
          return;
        }
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleRecordedAnswer(blob);
      };

      recorder.start();
      setInterviewState(STATES.LISTENING);
      setLiveCaption('Listening for your answer...');
      setLiveTranscriptPreview('');

      // Silence detection via analyser volume monitoring
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
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
  }, [isMicMuted, enterErrorState, cleanupRecordingPipeline]);

  const stopListening = () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    if (noSpeechTimeoutRef.current) clearTimeout(noSpeechTimeoutRef.current);
    if (maxDurationTimeoutRef.current) clearTimeout(maxDurationTimeoutRef.current);
    if (silenceAnimFrameRef.current) cancelAnimationFrame(silenceAnimFrameRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupRecordingPipeline();
    }
  };

  // ============================================================================
  // Handle recorded answer: transcribe -> evaluate -> speak next question
  // ============================================================================
  const handleRecordedAnswer = async (blob) => {
    setInterviewState(STATES.PROCESSING);
    setLiveCaption('Transcribing your answer...');

    if (!blob || blob.size < 500) {
      // Effectively empty audio — skip a wasted API call, ask candidate to repeat.
      await submitTurn('');
      return;
    }

    const formData = new FormData();
    formData.append('audio', blob, 'answer.webm');

    try {
      const res = await axiosClient.post('/answers/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      const transcript = (res.data.transcript || '').trim();
      setLiveTranscriptPreview(transcript);
      await submitTurn(transcript);
    } catch (err) {
      console.error('[Transcription Error]', err);
      enterErrorState(
        err.response?.data?.message || 'Failed to transcribe your answer. Check your connection and retry.',
        () => handleRecordedAnswer(blob)
      );
    }
  };

  // ============================================================================
  // Submit the turn to Gemini for evaluation + dynamic next question
  // ============================================================================
  const submitTurn = async (transcriptText) => {
    setInterviewState(STATES.EVALUATING);
    setLiveCaption('Evaluating your answer...');

    try {
      const res = await axiosClient.post(`/sessions/${sessionId}/live/turn`, {
        userTranscript: transcriptText,
        currentQuestionIndex: currentQuestionNumber - 1,
        currentQuestionText,
        conversationHistory: liveTurns.slice(-6),
      }, { timeout: 30000 });

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
          finishInterview();
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
      }

      setInterviewState(STATES.NEXT_QUESTION);
      speakLine(interviewerLine, () => {
        if (!isMicMuted) {
          startListening();
        } else {
          setInterviewState(STATES.LISTENING);
          setLiveCaption('Microphone is muted. Unmute to continue answering.');
        }
      });
    } catch (err) {
      console.error('[Submit Turn Error]', err);
      enterErrorState(
        err.response?.data?.message || 'Failed to reach the AI interviewer. Check your connection and retry.',
        () => submitTurn(transcriptText)
      );
    }
  };

  // --------------------------------------------------------------------------
  // 4. Handle Permissions Granted & kick off the interview loop
  // --------------------------------------------------------------------------
  const handlePermissionsGranted = async ({ stream }) => {
    setShowPermissionsModal(false);
    mediaStreamRef.current = stream;

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
          if (audioTrack) await room.localParticipant.publishTrack(audioTrack, { name: 'mic-track' });
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
      setLiveTurns((prev) => prev.length === 0 ? prev : prev); // no-op, kept for clarity
      startListening();
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
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      suppressProcessingRef.current = true;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch (e) { }
      }
      cleanupRecordingPipeline();
      if (livekitRoomRef.current) {
        try { livekitRoomRef.current.disconnect(); } catch (e) { }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------------------------------
  // Controls
  // --------------------------------------------------------------------------
  const toggleMic = () => {
    const nextMuted = !isMicMuted;
    setIsMicMuted(nextMuted);
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !nextMuted;
      if (livekitRoomRef.current?.localParticipant) {
        try { livekitRoomRef.current.localParticipant.setMicrophoneEnabled(!nextMuted); } catch (e) { }
      }
    }
    // If unmuting while we were waiting on mute in LISTENING state (no active recorder),
    // resume listening now.
    if (!nextMuted && interviewState === STATES.LISTENING && mediaRecorderRef.current?.state !== 'recording') {
      startListening();
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
    if (interviewState === STATES.LISTENING && mediaRecorderRef.current?.state === 'recording') {
      suppressProcessingRef.current = true;
      stopListening();
    }
    speakLine(lastSpokenLineRef.current || currentQuestionText, () => {
      if (!isMicMuted) startListening();
    });
  };

  const handleManualStopRecording = () => {
    if (interviewState === STATES.LISTENING) {
      stopListening();
    }
  };

  const handleSwitchToTextMode = () => {
    teardownMedia();
    navigate(`/interview/${sessionId}`);
  };

  const teardownMedia = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    suppressProcessingRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch (e) { }
    }
    cleanupRecordingPipeline();
    if (livekitRoomRef.current) {
      try { livekitRoomRef.current.disconnect(); } catch (e) { }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const finishInterview = async () => {
    if (isEndingCall) return;
    setIsEndingCall(true);
    teardownMedia();

    try {
      await axiosClient.post(`/sessions/${sessionId}/live/complete`, { liveTurns });
    } catch (err) {
      console.error('[Live complete error]', err);
    } finally {
      setInterviewState(STATES.COMPLETED);
      navigate(`/interview/${sessionId}`);
    }
  };

  const handleEndInterview = () => {
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
        <div className="max-w-6xl mx-auto w-full space-y-6 flex-1 flex flex-col">

          {/* Call Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between bg-[#FBF9F3] p-4 rounded-3xl border-3 border-[#12211A] editorial-shadow-sm gap-4">
            <div className="flex items-center space-x-3">
              <span className="font-serif-headline text-xl font-bold text-[#12211A] tracking-tight">
                PrepPulse.ai
              </span>
              <span className="text-[#12211A]/30">•</span>
              <span className="px-3 py-1 bg-[#12211A] text-[#E7B92E] text-xs font-black rounded-full uppercase tracking-wider">
                Live Voice Interview
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

          {/* State Machine Status Strip */}
          <div className="flex items-center justify-between bg-[#12211A] text-[#FBF9F3] px-5 py-3 rounded-2xl border-2 border-[#12211A]">
            <div className="flex items-center space-x-2">
              {(interviewState === STATES.SPEAKING || interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING || interviewState === STATES.NEXT_QUESTION) && (
                <Loader2 className="w-4 h-4 animate-spin text-[#E7B92E]" />
              )}
              {interviewState === STATES.LISTENING && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#E7B92E] animate-ping"></span>
              )}
              <span className="text-xs font-bold">{stateLabel[interviewState] || interviewState}</span>
            </div>
            <span className="text-xs font-mono text-[#E7B92E]">
              Question {currentQuestionNumber} / {totalQuestions}
            </span>
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

          {/* Video Grid Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

            {/* Main AI Interviewer Box */}
            <div className="lg:col-span-2 bg-[#12211A] rounded-3xl border-3 border-[#12211A] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden editorial-shadow-lg min-h-[420px]">

              {/* Top Status Bar */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center space-x-2 bg-[#1D3327] px-3.5 py-1.5 rounded-full border border-[#E7B92E]/40 text-xs text-[#FBF9F3]">
                  <span className={`w-2.5 h-2.5 rounded-full ${interviewState === STATES.SPEAKING ? 'bg-[#E7B92E] animate-ping' : 'bg-emerald-400'}`}></span>
                  <span className="font-bold">Alex (AI Interviewer)</span>
                </div>
              </div>

              {/* Avatar Visualizer */}
              <div className="my-auto text-center space-y-4 z-10 py-4 flex flex-col items-center justify-center">
                <div className="relative inline-block">
                  <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-[#1D3327] via-[#12211A] to-[#254233] border-4 ${interviewState === STATES.SPEAKING ? 'border-[#E7B92E] shadow-[0_0_30px_rgba(231,185,46,0.5)]' : 'border-[#E4DDC9]/30'} flex items-center justify-center mx-auto transition-all duration-300`}>
                    <Volume2 className={`w-16 h-16 ${interviewState === STATES.SPEAKING ? 'text-[#E7B92E] scale-110' : 'text-[#DCEEDF]/60'} transition-transform duration-300`} />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 flex items-center space-x-1 bg-[#12211A] px-4 py-1.5 rounded-full border-2 border-[#E7B92E]">
                    {[0.4, 0.9, 0.6, 1.0, 0.7, 0.4].map((scale, i) => (
                      <div
                        key={i}
                        className={`w-1.5 bg-[#E7B92E] rounded-full transition-all duration-150 ${interviewState === STATES.SPEAKING ? 'motion-safe:animate-bounce' : 'h-2'}`}
                        style={{ height: interviewState === STATES.SPEAKING ? `${scale * 20}px` : '6px', animationDelay: `${i * 100}ms` }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-[#FBF9F3]">Alex</h4>
                  <p className="text-xs text-[#DCEEDF]/80 font-medium">{stateLabel[interviewState]}</p>
                </div>
              </div>

              {/* Live Caption Strip */}
              <div className="z-10 bg-[#1D3327]/90 backdrop-blur-md p-4 rounded-2xl border border-[#E7B92E]/30 text-center">
                <p className="text-xs font-bold text-[#E7B92E] uppercase tracking-wider mb-1">Live Captions</p>
                <p className="text-sm font-medium text-[#FBF9F3] leading-relaxed italic">"{liveCaption}"</p>
              </div>
            </div>

            {/* Right Side: Self View PiP & Question Info */}
            <div className="space-y-6 flex flex-col justify-between">
              <div className="relative aspect-video bg-[#12211A] rounded-3xl border-3 border-[#12211A] overflow-hidden editorial-shadow flex items-center justify-center">
                {!isCameraOff ? (
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                ) : (
                  <div className="text-center text-[#FBF9F3]/60 space-y-1 p-4">
                    <VideoOff className="w-8 h-8 mx-auto text-[#C05C33]" />
                    <p className="text-xs font-bold">Camera Turned Off</p>
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="bg-[#12211A]/80 backdrop-blur-xs px-2.5 py-1 rounded-xl text-[10px] font-bold text-white border border-white/20">
                    You (Candidate)
                  </span>
                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border flex items-center space-x-1 ${isMicMuted ? 'bg-rose-900/80 text-rose-200 border-rose-500' : interviewState === STATES.LISTENING ? 'bg-[#E7B92E] text-[#12211A] border-[#12211A]' : 'bg-[#12211A]/80 text-white border-white/20'}`}>
                    {interviewState === STATES.LISTENING && !isMicMuted && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#12211A] animate-pulse"></span>
                    )}
                    <span>{isMicMuted ? 'Muted' : interviewState === STATES.LISTENING ? 'Listening...' : 'Mic Ready'}</span>
                  </span>
                </div>

                {/* Mic level meter while listening */}
                {interviewState === STATES.LISTENING && !isMicMuted && (
                  <div className="absolute top-3 left-3 right-3 h-1.5 bg-[#12211A]/60 rounded-full overflow-hidden border border-white/20">
                    <div className="h-full bg-[#E7B92E] transition-all duration-75" style={{ width: `${micLevel}%` }}></div>
                  </div>
                )}
              </div>

              {currentQuestionText && (
                <div className="flex-1 flex flex-col justify-between">
                  <QuestionCard
                    question={{ questionText: currentQuestionText, category: currentQuestionCategory }}
                    currentNumber={currentQuestionNumber}
                    totalQuestions={totalQuestions}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Live Transcript Preview Bar */}
          {liveTranscriptPreview && (interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING) && (
            <div className="p-3.5 bg-[#FBF9F3] border-2 border-[#12211A] rounded-2xl flex items-center space-x-2 text-xs font-bold text-[#12211A] animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>You said: <strong className="font-normal italic">"{liveTranscriptPreview}"</strong></span>
            </div>
          )}

          {/* Muted-while-listening prompt */}
          {interviewState === STATES.LISTENING && isMicMuted && (
            <div className="p-4 bg-[#FEF9C3] border-2 border-[#12211A] rounded-2xl flex items-center justify-between text-xs font-bold text-[#12211A]">
              <span>Microphone is muted — unmute to continue answering.</span>
              <button onClick={toggleMic} className="px-4 py-2 bg-[#12211A] text-[#E7B92E] rounded-xl">Unmute</button>
            </div>
          )}

          {/* Floating Controls Bar */}
          <div className="bg-[#FBF9F3] border-3 border-[#12211A] rounded-3xl p-4 editorial-shadow flex flex-wrap items-center justify-between gap-3">

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={toggleMic}
                className={`p-3.5 rounded-2xl border-2 border-[#12211A] font-bold flex items-center space-x-2 transition-all ${isMicMuted ? 'bg-rose-100 text-rose-700' : 'bg-[#E7B92E] text-[#12211A]'}`}
              >
                {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                <span className="text-xs hidden sm:inline">{isMicMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              <button
                onClick={toggleCamera}
                className={`p-3.5 rounded-2xl border-2 border-[#12211A] font-bold flex items-center space-x-2 transition-all ${isCameraOff ? 'bg-rose-100 text-rose-700' : 'bg-[#F5F1E7] text-[#12211A]'}`}
              >
                {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                <span className="text-xs hidden sm:inline">{isCameraOff ? 'Start Camera' : 'Stop Camera'}</span>
              </button>

              {interviewState === STATES.LISTENING && !isMicMuted && (
                <button
                  onClick={handleManualStopRecording}
                  className="px-4 py-3.5 bg-[#C05C33] text-[#FBF9F3] border-2 border-[#12211A] rounded-2xl text-xs font-bold flex items-center space-x-2"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span className="hidden sm:inline">Stop & Submit</span>
                </button>
              )}

              <button
                onClick={handleRepeatQuestion}
                disabled={interviewState === STATES.PROCESSING || interviewState === STATES.EVALUATING}
                className="px-4 py-3.5 bg-[#DCEEDF] text-[#12211A] border-2 border-[#12211A] rounded-2xl text-xs font-bold hover:bg-[#B7D8BE] transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Repeat Question</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSwitchToTextMode}
                className="px-4 py-3 bg-[#F5F1E7] text-[#12211A] border-2 border-[#12211A] rounded-2xl text-xs font-bold hover:bg-[#E4DDC9] transition-all flex items-center space-x-2"
              >
                <Type className="w-4 h-4" />
                <span className="hidden sm:inline">Text Mode</span>
              </button>

              <button
                onClick={() => setIsDrawerOpen(true)}
                className="px-4 py-3 bg-[#DCEEDF] text-[#12211A] border-2 border-[#12211A] rounded-2xl text-xs font-bold hover:bg-[#B7D8BE] transition-all flex items-center space-x-2"
              >
                <MessageSquare className="w-4 h-4 text-[#1D3327]" />
                <span>Transcript ({liveTurns.length})</span>
              </button>

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
      )}

      <LiveTranscriptDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        liveTurns={liveTurns}
      />
    </div>
  );
}