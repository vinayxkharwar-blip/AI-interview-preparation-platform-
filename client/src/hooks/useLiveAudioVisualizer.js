import { useState, useRef, useCallback, useEffect } from 'react';

// Silence detection tuning
const SILENCE_THRESHOLD_MS = 1800; // 1.8s continuous silence after speech to finish turn
const MIN_RECORDING_MS_BEFORE_AUTO_STOP = 1200; // grace period, avoids instant cutoff
const NO_SPEECH_TIMEOUT_MS = 15000; // candidate never starts speaking at all
const MAX_ANSWER_DURATION_MS = 45000; // 45 seconds safety cap (prevents candidate from being stranded)

/**
 * Hook to manage real-time audio volume analysis and silence detection.
 * Encapsulates AudioContext, AnalyserNode, requestAnimationFrame, and silence timers.
 */
export function useLiveAudioVisualizer() {
  const [micLevel, setMicLevel] = useState(0);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceAnimFrameRef = useRef(null);
  const recordingStartTimeRef = useRef(0);
  const lastLoudTimeRef = useRef(0);
  const hasSpokenRef = useRef(false);
  const noSpeechTimeoutRef = useRef(null);
  const maxDurationTimeoutRef = useRef(null);
  const isStoppingRef = useRef(false);

  const cleanupMonitoring = useCallback(() => {
    if (silenceAnimFrameRef.current) {
      cancelAnimationFrame(silenceAnimFrameRef.current);
      silenceAnimFrameRef.current = null;
    }
    if (noSpeechTimeoutRef.current) {
      clearTimeout(noSpeechTimeoutRef.current);
      noSpeechTimeoutRef.current = null;
    }
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // ignore already closed
      }
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    setMicLevel(0);
  }, []);

  const stopMonitoring = useCallback(() => {
    isStoppingRef.current = true;
    cleanupMonitoring();
  }, [cleanupMonitoring]);

  const startMonitoring = useCallback((audioStream, { onSpeechStarted, onSilenceDetected, onNoSpeech, onMaxDuration } = {}) => {
    cleanupMonitoring();
    if (!audioStream) return;

    try {
      isStoppingRef.current = false;
      hasSpokenRef.current = false;
      const now = Date.now();
      recordingStartTimeRef.current = now;
      lastLoudTimeRef.current = now;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(audioStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const timeArray = new Uint8Array(analyser.fftSize);
      let lastMicUpdateTime = 0;
      let baselineNoise = 10;
      let calibrationSamples = 0;
      let calibrationSum = 0;

      const monitor = () => {
        if (!analyserRef.current || isStoppingRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        analyser.getByteTimeDomainData(timeArray);

        // Frequency average
        const freqAverage = dataArray.reduce((acc, v) => acc + v, 0) / dataArray.length;

        // Time-domain RMS (immune to low frequency electrical hum/DC offset)
        let sumSquares = 0;
        for (let i = 0; i < timeArray.length; i++) {
          const dev = timeArray[i] - 128;
          sumSquares += dev * dev;
        }
        const rms = Math.sqrt(sumSquares / timeArray.length);

        // Combined audio energy level (0 - 100 scale)
        const currentLevel = Math.min(100, Math.round((freqAverage * 0.4) + (rms * 1.6)));

        const currentTime = Date.now();
        const elapsedSinceStart = currentTime - recordingStartTimeRef.current;

        // Calibrate ambient noise floor during first 400ms
        if (elapsedSinceStart < 400) {
          calibrationSum += currentLevel;
          calibrationSamples++;
          baselineNoise = Math.max(3, Math.round(calibrationSum / calibrationSamples));
        }

        // Throttle UI React state updates to ~15fps (66ms)
        if (currentTime - lastMicUpdateTime > 66) {
          setMicLevel(currentLevel);
          lastMicUpdateTime = currentTime;
        }

        const speechThreshold = Math.max(14, baselineNoise + 8);
        const silenceThreshold = Math.max(7, baselineNoise + 3);

        if (currentLevel > speechThreshold) {
          lastLoudTimeRef.current = currentTime;
          if (!hasSpokenRef.current) {
            hasSpokenRef.current = true;
            console.log('[VOICE DEBUG] Speech started');
            console.log(`[VOICE DEBUG] User speech started (level=${currentLevel}, baseline=${baselineNoise})`);
            if (noSpeechTimeoutRef.current) {
              clearTimeout(noSpeechTimeoutRef.current);
              noSpeechTimeoutRef.current = null;
            }
            if (onSpeechStarted) onSpeechStarted();
          }
        }

        const silenceDuration = currentTime - lastLoudTimeRef.current;

        if (
          hasSpokenRef.current &&
          elapsedSinceStart > MIN_RECORDING_MS_BEFORE_AUTO_STOP &&
          silenceDuration > SILENCE_THRESHOLD_MS &&
          currentLevel <= silenceThreshold
        ) {
          console.log('[VOICE DEBUG] Speech ended');
          console.log(`[VOICE DEBUG] Silence detected after ${silenceDuration}ms pause (level=${currentLevel}).`);
          if (onSilenceDetected) onSilenceDetected();
          return;
        }

        silenceAnimFrameRef.current = requestAnimationFrame(monitor);
      };

      silenceAnimFrameRef.current = requestAnimationFrame(monitor);

      // Timeout if candidate never starts speaking
      noSpeechTimeoutRef.current = setTimeout(() => {
        if (!hasSpokenRef.current) {
          console.warn('[Silence Detection] No speech detected within timeout — auto-stopping.');
          if (onNoSpeech) onNoSpeech();
          else if (onSilenceDetected) onSilenceDetected();
        }
      }, NO_SPEECH_TIMEOUT_MS);

      // Hard safety cap regardless of speech activity
      maxDurationTimeoutRef.current = setTimeout(() => {
        console.warn('[Silence Detection] Max answer duration reached — auto-stopping.');
        if (onMaxDuration) onMaxDuration();
        else if (onSilenceDetected) onSilenceDetected();
      }, MAX_ANSWER_DURATION_MS);
    } catch (err) {
      console.error('[Audio Visualizer Error]', err);
      cleanupMonitoring();
      throw err;
    }
  }, [cleanupMonitoring]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupMonitoring();
    };
  }, [cleanupMonitoring]);

  return {
    micLevel,
    startMonitoring,
    stopMonitoring,
    cleanupMonitoring,
    hasSpokenRef,
    isStoppingRef,
  };
}
