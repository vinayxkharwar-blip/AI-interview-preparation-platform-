import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import PreCallPermissionsModal from '../components/PreCallPermissionsModal';
import LiveTranscriptDrawer from '../components/LiveTranscriptDrawer';
import { useLiveAudioVisualizer } from '../hooks/useLiveAudioVisualizer';
import { useLiveKitRoom } from '../hooks/useLiveKitRoom';
import { useInterviewAudio } from '../hooks/useInterviewAudio';
import { STATES } from '../constants/liveInterviewStates';
import LiveHeader from '../components/live/LiveHeader';
import AIAvatarPanel from '../components/live/AIAvatarPanel';
import CandidatePreview from '../components/live/CandidatePreview';
import LiveControlBar from '../components/live/LiveControlBar';
import {
  Loader2, Volume2, CheckCircle2, Type,
  AlertCircle, RefreshCw
} from 'lucide-react';

export default function LiveInterviewSession() {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();

  // Master guard: when true, all background speech, TTS in-flight responses, and question generation are immediately aborted
  const isCallEndedRef = useRef(false);
  const isFinishingRef = useRef(false);

  // Audio Playback & TTS Engine
  const {
    speakLine,
    stopAudio,
    prewarmAudio,
    lastSpokenLineRef,
  } = useInterviewAudio({
    sessionId,
    isCallEndedRef,
    onSpeechStart: (text) => {
      setLiveCaption(text);
      setInterviewState(STATES.SPEAKING);
      setThinkingStage('');
    },
  });

  // Audio Visualizer & Silence Detection
  const {
    micLevel,
    startMonitoring,
    stopMonitoring,
    cleanupMonitoring,
  } = useLiveAudioVisualizer();

  // LiveKit WebRTC Room
  const {
    connectRoom,
    disconnectRoom,
    setMicrophoneEnabled: setLiveKitMicEnabled,
    setCameraEnabled: setLiveKitCameraEnabled,
  } = useLiveKitRoom();

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
  const [liveCaption, setLiveCaption] = useState('Initializing interview session...');
  const [liveTranscriptPreview, setLiveTranscriptPreview] = useState('');
  const [thinkingStage, setThinkingStage] = useState('');

  // Transcript & Drawer states
  const [liveTurns, setLiveTurns] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // References
  const localVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const joinStartTimeRef = useRef(0);
  const ttsPrefetchStartTimeRef = useRef(0);

  // Recording refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const isStoppingRef = useRef(false);

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
  // Cleanup all audio pipeline resources (recorder, analyser, timers)
  // --------------------------------------------------------------------------
  const cleanupRecordingPipeline = useCallback(() => {
    cleanupMonitoring();
  }, [cleanupMonitoring]);

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
  // STT pipeline: start listening with live silence detection via Web Audio API
  // ============================================================================
  const startListening = useCallback(() => {
    if (isCallEndedRef.current) return;
    console.log('[DIAGNOSTIC-STEP 14] onComplete -> startListening() invoked!');
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

      console.log('[DIAGNOSTIC-STEP 15] Transitioning state: SPEAKING -> LISTENING');
      setInterviewState(STATES.LISTENING);
      setLiveCaption('Listening for your answer...');
      setLiveTranscriptPreview('');

      // Silence detection via analyser volume monitoring (using audioOnlyStream)
      startMonitoring(audioOnlyStream, {
        onSilenceDetected: () => {
          stopListening();
        },
      });
    } catch (err) {
      console.error('[Listening Start Error]', err);
      suppressProcessingRef.current = true;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch (e) { }
      }
      enterErrorState('Could not start the microphone recorder. Please retry or switch to text mode.', () => startListening());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enterErrorState, cleanupRecordingPipeline, startMonitoring]);

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
    stopMonitoring();

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
    setThinkingStage('Transcribing your voice with OpenAI...');
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
  // Submit the turn to OpenAI for evaluation + dynamic next question
  // ============================================================================
  const submitTurn = async (transcriptText) => {
    if (isCallEndedRef.current) return;
    console.log('[SUBMIT DEBUG] submitTurn() called');
    console.log('[VOICE DEBUG] submitTurn() called');
    console.log('[VOICE DEBUG] Answer length/audio length:', transcriptText ? transcriptText.length : 0);
    setInterviewState(STATES.EVALUATING);
    setThinkingStage('Alex is evaluating your answer & formulating the next question...');
    setLiveCaption('Alex is evaluating your answer...');

    console.log('[VOICE DEBUG] OpenAI request started');
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

      console.log('[SUBMIT DEBUG] OpenAI response received:', res.data?.interviewerLine);
      console.log('[VOICE DEBUG] OpenAI response received:', res.data);
      console.log('[VOICE DEBUG] OpenAI response content:', res.data?.interviewerLine);

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
      console.log('[VOICE DEBUG] OpenAI error fallback, speaking fallback line');
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
    isCallEndedRef.current = false;
    isFinishingRef.current = false;
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

    // Prime browser SpeechSynthesis and HTMLAudioElement on user click gesture so autoplay policy is unlocked
    prewarmAudio();

    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch((e) => console.warn('[Video Play Notice]', e.message));
    }

    // 1. Determine opening question: prefer pre-generated personalized Q1, fallback gracefully.
    const firstQ = questions[0];
    const openingQuestionText = firstQ?.questionText || `Tell me a bit about your background and experience relevant to the ${session?.targetRole || 'role'}.`;
    const openingCategory = firstQ?.category || 'General';

    setCurrentQuestionText(openingQuestionText);
    setCurrentQuestionCategory(openingCategory);
    setCurrentQuestionNumber(1);

    const greeting = `Hello! I'm Alex, your AI interviewer today. Let's begin: ${openingQuestionText}`;

    // Milestone 0: Record join start
    joinStartTimeRef.current = performance.now();
    console.log('[LiveTiming] Join call initiated at 0ms');

    // Milestone 1 (PARALLEL PRE-FETCH): Synthesize opening speech concurrently with LiveKit room connect!
    ttsPrefetchStartTimeRef.current = performance.now();
    console.log(`[LiveTiming] Pre-fetching opening OpenAI TTS concurrently with LiveKit setup at +${(performance.now() - joinStartTimeRef.current).toFixed(0)}ms`);
    const prefetchTtsPromise = axiosClient.post(`/sessions/${sessionId}/live/tts`, { text: greeting, voice: 'alloy' }, { timeout: 35000 })
      .then((res) => {
        const elapsed = (performance.now() - ttsPrefetchStartTimeRef.current).toFixed(0);
        console.log(`[LiveTiming] Opening OpenAI TTS pre-fetch completed in ${elapsed}ms (server duration: ${res.data?.serverDurationMs || 'n/a'}ms)`);
        return res;
      })
      .catch((err) => {
        console.warn('[LiveTiming] Opening OpenAI TTS pre-fetch warning:', err.message);
        return null;
      });

    // Milestone 2: LiveKit room token & media server connection
    await connectRoom(sessionId, stream, (status) => setLiveCaption(status));

    setLiveCaption('Waking up Alex & initializing voice...');
    console.log(`[DIAGNOSTIC-STEP 1] [LiveTiming] LiveKit setup complete. Handing over to Alex at +${(performance.now() - joinStartTimeRef.current).toFixed(0)}ms total`);

    setInterviewState(STATES.ASKING);
    console.log('[DIAGNOSTIC-STEP 2] Immediately after handover: calling speakLine(greeting)...');
    speakLine(greeting, () => {
      console.log('[DIAGNOSTIC-STEP 13] speakLine onComplete callback fired!');
      if (!isMicMutedRef.current) {
        console.log('[DIAGNOSTIC-STEP 13b] Calling startListening() now...');
        startListening();
      } else {
        console.log('[DIAGNOSTIC-STEP 13b] Mic muted, transitioning to LISTENING directly');
        setInterviewState(STATES.LISTENING);
      }
    }, prefetchTtsPromise);
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
    isCallEndedRef.current = false;
    isFinishingRef.current = false;
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

    setLiveKitMicEnabled(!nextMuted);

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
        setLiveKitCameraEnabled(videoTrack.enabled);
      }
    } else {
      setIsCameraOff(!isCameraOff);
    }
  };

  const handleRepeatQuestion = () => {
    stopAudio();
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
    console.log('[DIAGNOSTIC-END][teardownMedia] Halting audio, media streams, and LiveKit...');

    // 1 & 2: Pause and destroy audio element and cancel browser speech synthesis
    stopAudio();
    console.log('[DIAGNOSTIC-END][teardownMedia] Active audio and speech synthesis cancelled');

    // 3. Stop MediaRecorder and discard
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.stop();
        console.log('[DIAGNOSTIC-END][teardownMedia] MediaRecorder stopped');
      } catch (e) { }
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];

    // 4. Cleanup audio context, analyser, animation frames, timeouts
    cleanupRecordingPipeline();
    console.log('[DIAGNOSTIC-END][teardownMedia] Recording pipeline & AudioContext cleaned up');

    // 5. Disconnect LiveKit room
    disconnectRoom();
    console.log('[DIAGNOSTIC-END][teardownMedia] LiveKit room disconnected');

    // 6. Stop all hardware tracks (camera and mic)
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        console.log('[DIAGNOSTIC-END][teardownMedia] Hardware camera/mic tracks stopped');
      } catch (e) {}
      mediaStreamRef.current = null;
    }
  };

  const finishInterview = async () => {
    console.log(`[DIAGNOSTIC-END][finishInterview] Handler entered. isFinishingRef: ${isFinishingRef.current}, isEndingCall: ${isEndingCall}, state: "${interviewState}"`);
    if (isFinishingRef.current) {
      console.log('[DIAGNOSTIC-END][finishInterview] Already finishing call, skipping redundant invocation.');
      return;
    }
    isFinishingRef.current = true;
    isCallEndedRef.current = true;
    setIsEndingCall(true);

    const startTime = Date.now();
    console.log(`[DIAGNOSTIC-END][finishInterview] Calling teardownMedia at t=0ms...`);
    teardownMedia();
    console.log(`[DIAGNOSTIC-END][finishInterview] Teardown complete at t=${Date.now() - startTime}ms`);

    try {
      console.log(`[DIAGNOSTIC-END][finishInterview] Persisting session with ${liveTurns.length} turn(s) via POST /sessions/${sessionId}/live/complete...`);
      await axiosClient.post(`/sessions/${sessionId}/live/complete`, { liveTurns }, { timeout: 15000 });
      console.log(`[DIAGNOSTIC-END][finishInterview] /live/complete finished in ${Date.now() - startTime}ms`);
    } catch (err) {
      console.error('[DIAGNOSTIC-END][finishInterview] /live/complete notice/error:', err.message);
    } finally {
      teardownMedia();
      setInterviewState(STATES.COMPLETED);
      console.log(`[DIAGNOSTIC-END][finishInterview] Navigating to /interview/${sessionId} at t=${Date.now() - startTime}ms...`);
      navigate(`/interview/${sessionId}`);
    }
  };

  const handleEndInterview = () => {
    console.log(`[DIAGNOSTIC-END][handleEndInterview] End button clicked! Current state: "${interviewState}", isCallEndedRef: ${isCallEndedRef.current}, isEndingCall: ${isEndingCall}`);
    finishInterview();
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
          <LiveHeader
            targetRole={session?.targetRole}
            currentQuestionNumber={currentQuestionNumber}
            totalQuestions={totalQuestions}
            callDuration={callDuration}
          />

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
            <AIAvatarPanel
              interviewState={interviewState}
              liveCaption={liveCaption}
              isMicMuted={isMicMuted}
            />

            {/* RIGHT — CANDIDATE PREVIEW + QUESTION CARD (5 COLS) */}
            <CandidatePreview
              localVideoRef={localVideoRef}
              isCameraOff={isCameraOff}
              isMicMuted={isMicMuted}
              interviewState={interviewState}
              micLevel={micLevel}
              currentQuestionNumber={currentQuestionNumber}
              totalQuestions={totalQuestions}
              currentQuestionCategory={currentQuestionCategory}
              currentQuestionText={currentQuestionText}
            />
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
          <LiveControlBar
            isMicMuted={isMicMuted}
            toggleMic={toggleMic}
            isCameraOff={isCameraOff}
            toggleCamera={toggleCamera}
            handleRepeatQuestion={handleRepeatQuestion}
            handleManualStopRecording={handleManualStopRecording}
            handleSwitchToTextMode={handleSwitchToTextMode}
            setIsDrawerOpen={setIsDrawerOpen}
            liveTurnsCount={liveTurns.length}
            handleEndInterview={handleEndInterview}
            isEndingCall={isEndingCall}
            interviewState={interviewState}
          />
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