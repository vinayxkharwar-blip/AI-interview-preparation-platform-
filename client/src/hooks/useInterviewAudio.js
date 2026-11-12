import { useRef, useCallback, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

// Prominent runtime marker for browser console verification
if (typeof window !== 'undefined') {
  console.log('[AUDIO-RUNTIME-VERSION] PrePilot AI Audio Engine v3.0 (Hard-Latched Signal Guard + 5s Deadman Watchdog + 1.8x GainNode)');
}

/**
 * Async helper to reliably retrieve browser voices across different browsers.
 */
function getVoicesAsync() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return resolve([]);
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) return resolve(voices);

    const timer = setTimeout(() => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
      resolve(window.speechSynthesis ? window.speechSynthesis.getVoices() || [] : []);
    }, 500);

    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timer);
      window.speechSynthesis.onvoiceschanged = null;
      resolve(window.speechSynthesis ? window.speechSynthesis.getVoices() || [] : []);
    };
  });
}

/**
 * Calculates time-domain RMS, peak amplitude, and deviation from center (128).
 */
function computeAudioMetrics(analyser) {
  if (!analyser) return { rms: 0, peak: 0, maxDev: 0 };
  const buffer = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(buffer);
  let sumSquares = 0;
  let maxDev = 0;
  for (let i = 0; i < buffer.length; i++) {
    const val = buffer[i];
    const dev = Math.abs(val - 128);
    if (dev > maxDev) maxDev = dev;
    const normalized = (val - 128) / 128;
    sumSquares += normalized * normalized;
  }
  const rms = Math.sqrt(sumSquares / buffer.length);
  const peak = maxDev / 128;
  return {
    rms: Number(rms.toFixed(4)),
    peak: Number(peak.toFixed(4)),
    maxDev,
  };
}

/**
 * Hook to manage Text-to-Speech playback:
 * - Primary: High-fidelity OpenAI Cloud TTS voice ("alloy")
 * - Web Audio Graph: HTMLAudioElement -> MediaElementAudioSourceNode -> DynamicsCompressorNode -> GainNode (1.8x) -> AnalyserNode -> AudioContext.destination
 * - Fallback: Direct native HTMLAudioElement output or browser SpeechSynthesis
 * - Pre-warming: Gesture-based unlock of browser Autoplay policies
 */
export function useInterviewAudio({ sessionId, isCallEndedRef, onSpeechStart, onSpeechEnd }) {
  const audioPlayerRef = useRef(null);
  const directAudioPlayerRef = useRef(null);
  const directFallbackTriggeredRef = useRef(false);
  const hasEverDetectedSignalRef = useRef(false);
  const synthRef = useRef(null);
  const lastSpokenLineRef = useRef('');
  const activeBlobUrlRef = useRef(null);
  const safetyTimerRef = useRef(null);
  const sampleCheckerRef = useRef(null);

  // Callbacks refs to guarantee identity stability across renders
  const onSpeechStartRef = useRef(onSpeechStart);
  onSpeechStartRef.current = onSpeechStart;
  const onSpeechEndRef = useRef(onSpeechEnd);
  onSpeechEndRef.current = onSpeechEnd;

  useEffect(() => {
    console.log('[useInterviewAudio] Hook initialized — v3.0 Deadman Watchdog active');
  }, []);

  // Web Audio Graph Node Refs
  const audioCtxRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const compressorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const analyserRef = useRef(null);

  /**
   * Initializes or returns a shared AudioContext to amplify playback volume.
   */
  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      } catch (e) {
        console.warn('[Web Audio Context init notice]', e);
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  /**
   * Global unlock for AudioContext on user interaction to comply with browser autoplay policies.
   */
  useEffect(() => {
    const unlockAudio = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().then(() => {
          console.log('[AudioContext] Resumed successfully via user gesture event!');
        }).catch(() => {});
      }
    };
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  /**
   * Direct native HTMLAudioElement output path (bypasses Web Audio graph if persistently silent or suspended).
   */
  const playDirectOutput = useCallback((blobUrl, onEnd) => {
    try {
      if (directAudioPlayerRef.current) {
        try {
          directAudioPlayerRef.current.pause();
          directAudioPlayerRef.current.onended = null;
          directAudioPlayerRef.current.onerror = null;
          directAudioPlayerRef.current.src = '';
        } catch (e) {}
        directAudioPlayerRef.current = null;
      }
      const directAudio = new Audio();
      directAudio.src = blobUrl;
      directAudio.volume = 1.0;
      directAudio.muted = false;
      directAudioPlayerRef.current = directAudio;

      directAudio.onended = () => {
        console.log('[Direct Output] 🔊 Native audio playback ended successfully.');
        if (onEnd) onEnd();
      };
      directAudio.onerror = (e) => {
        console.error('[Direct Output Error]', e);
        if (onEnd) onEnd();
      };
      directAudio
        .play()
        .then(() => {
          console.log('[Direct Output] 🔊 Direct native audio playback started successfully (bypassed Web Audio).');
        })
        .catch((err) => {
          console.error('[Direct Output Play Error]', err);
          if (onEnd) onEnd();
        });
    } catch (e) {
      console.error('[Direct Output Init Error]', e);
      if (onEnd) onEnd();
    }
  }, []);

  /**
   * Configures HTMLAudioElement with an amplifier graph:
   * HTMLAudioElement -> MediaElementAudioSourceNode -> DynamicsCompressorNode -> GainNode (1.8x) -> AnalyserNode -> AudioContext.destination
   * Guarantees MediaElementAudioSourceNode is created strictly once per audio element.
   */
  const setupAudioElement = useCallback(() => {
    let audio = audioPlayerRef.current;
    if (!audio) {
      audio = new Audio();
      audio.volume = 1.0;
      audio.muted = false;
      audioPlayerRef.current = audio;
    }

    const ctx = getAudioContext();
    if (ctx && audio && !sourceNodeRef.current) {
      try {
        const source = ctx.createMediaElementSource(audio);
        sourceNodeRef.current = source;

        // Studio dynamic compressor: balances lower syllables and vocal peaks
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-20, ctx.currentTime);
        compressor.knee.setValueAtTime(25, ctx.currentTime);
        compressor.ratio.setValueAtTime(3.5, ctx.currentTime);
        compressor.attack.setValueAtTime(0.003, ctx.currentTime);
        compressor.release.setValueAtTime(0.25, ctx.currentTime);
        compressorRef.current = compressor;

        // Audio amplifier gain node: boosts volume by 1.8x
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(1.8, ctx.currentTime);
        gainNodeRef.current = gainNode;

        // AnalyserNode to inspect real-time audio waveforms and output RMS/peak
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyserRef.current = analyser;

        // Connect complete audio graph: source -> compressor -> gain -> analyser -> destination
        source.connect(compressor);
        compressor.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(ctx.destination);

        console.log(`[Audio Graph] Connected: HTMLAudioElement -> MediaElementAudioSourceNode -> DynamicsCompressorNode -> GainNode(${gainNode.gain.value}x) -> AnalyserNode -> AudioContext.destination (${ctx.state})`);
      } catch (e) {
        console.warn('[Audio Amplifier MediaElementSource notice]', e.message);
      }
    }

    if (audio) {
      audio.volume = 1.0;
      audio.muted = false;
    }
    return audio;
  }, [getAudioContext]);

  const stopAudio = useCallback(() => {
    directFallbackTriggeredRef.current = false;
    hasEverDetectedSignalRef.current = false;
    if (sampleCheckerRef.current) {
      clearInterval(sampleCheckerRef.current);
      sampleCheckerRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }

    if (directAudioPlayerRef.current) {
      try {
        directAudioPlayerRef.current.pause();
        directAudioPlayerRef.current.onended = null;
        directAudioPlayerRef.current.onerror = null;
        directAudioPlayerRef.current.currentTime = 0;
      } catch (e) {}
    }

    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.onended = null;
        audioPlayerRef.current.onerror = null;
        audioPlayerRef.current.onloadedmetadata = null;
        audioPlayerRef.current.currentTime = 0;
      } catch (e) {}
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    if (activeBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      } catch (e) {}
      activeBlobUrlRef.current = null;
    }
  }, []);

  const destroyAudio = useCallback(() => {
    stopAudio();
    if (directAudioPlayerRef.current) {
      try {
        directAudioPlayerRef.current.src = '';
      } catch (e) {}
      directAudioPlayerRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close().catch(() => {});
      } catch (e) {}
      audioCtxRef.current = null;
      sourceNodeRef.current = null;
      compressorRef.current = null;
      gainNodeRef.current = null;
      analyserRef.current = null;
    }
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.src = '';
        audioPlayerRef.current.load();
      } catch (e) {}
      audioPlayerRef.current = null;
    }
  }, [stopAudio]);

  /**
   * Pre-warm browser audio and speech synthesis on user gesture to comply with browser Autoplay Policy.
   */
  const prewarmAudio = useCallback(() => {
    // 1. Pre-warm Web Speech API
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
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

    // Awaken Web Audio amplifier context on user click gesture
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // 2. Pre-warm HTMLAudioElement
    try {
      const audio = setupAudioElement();
      console.log('[DIAGNOSTIC-PREWARM] Pre-warming HTMLAudioElement to unlock browser autoplay...');
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      audio
        .play()
        .then(() => {
          console.log('[DIAGNOSTIC-PREWARM] HTMLAudioElement successfully unlocked with user gesture!');
          if (audio) {
            audio.pause();
            audio.currentTime = 0;
          }
        })
        .catch((e) => console.warn('[DIAGNOSTIC-PREWARM] Audio Autoplay Pre-warm Notice:', e.message));
    } catch (e) {
      console.warn('[Audio Pre-warm Notice]', e);
    }
  }, [getAudioContext, setupAudioElement]);

  /**
   * Speak a text string via OpenAI TTS with Web Speech API fallback.
   */
  const speakLine = useCallback((text, onComplete, prefetchPromise = null) => {
    if (isCallEndedRef?.current || !text) {
      if (onComplete && !isCallEndedRef?.current) onComplete();
      return;
    }

    console.log('[VOICE DEBUG] AI question started:', text);
    console.log('[VOICE DEBUG] TTS response started:', text);
    lastSpokenLineRef.current = text;
    if (onSpeechStartRef.current) onSpeechStartRef.current(text);

    // Stop any existing playback and reset session state
    stopAudio();
    hasEverDetectedSignalRef.current = false;
    directFallbackTriggeredRef.current = false;

    let hasEnded = false;

    const finishSpeech = () => {
      if (hasEnded) return;
      hasEnded = true;

      if (sampleCheckerRef.current) {
        clearInterval(sampleCheckerRef.current);
        sampleCheckerRef.current = null;
      }
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
      if (activeBlobUrlRef.current) {
        try {
          URL.revokeObjectURL(activeBlobUrlRef.current);
        } catch (e) {}
        activeBlobUrlRef.current = null;
      }

      console.log('[VOICE DEBUG] AI question finished');
      console.log('[VOICE DEBUG] TTS response finished');
      if (onSpeechEndRef.current) onSpeechEndRef.current();
      if (onComplete) onComplete();
    };

    // Master fallback timer: guarantees finishSpeech() fires even if network, audio decoding, or speech synthesis completely hangs
    const estimatedSpeechDuration = Math.max(10000, ((text.split(/\s+/).length / 2.5) + 8) * 1000);
    safetyTimerRef.current = setTimeout(() => {
      if (!hasEnded && !isCallEndedRef?.current) {
        console.warn(`[DIAGNOSTIC-TIMEOUT] Master speech safety timer fired after ${estimatedSpeechDuration}ms. Advancing interview.`);
        finishSpeech();
      }
    }, estimatedSpeechDuration);

    const fallbackToBrowserTTS = async (reason = 'Unknown') => {
      if (isCallEndedRef?.current) return;
      console.warn(`[DIAGNOSTIC-FALLBACK] Falling back to browser SpeechSynthesis. Reason: ${reason}`);

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        console.log('[DIAGNOSTIC-FALLBACK] speechSynthesis not available in window. Finishing speech immediately.');
        finishSpeech();
        return;
      }

      // Ensure browser fallback has its own safety timeout
      const fallbackTimeoutMs = Math.max(6000, ((text.split(/\s+/).length / 2.5) + 4) * 1000);
      safetyTimerRef.current = setTimeout(() => {
        if (!hasEnded && !isCallEndedRef?.current) {
          console.warn('[DIAGNOSTIC-FALLBACK] Browser SpeechSynthesis safety timeout reached. Finishing speech.');
          finishSpeech();
        }
      }, fallbackTimeoutMs);

      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();

        const voices = await getVoicesAsync();
        if (isCallEndedRef?.current) return;

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
          if (isCallEndedRef?.current) return;
          console.log('[DIAGNOSTIC-FALLBACK] SpeechSynthesisUtterance.onend fired!');
          finishSpeech();
        };

        utterance.onerror = (e) => {
          if (isCallEndedRef?.current) return;
          console.error('[DIAGNOSTIC-FALLBACK] Browser TTS Error:', e.error || e);
          finishSpeech();
        };

        synthRef.current = utterance;
        if (isCallEndedRef?.current) return;
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
        window.speechSynthesis.resume();
      } catch (e) {
        console.warn('[Browser TTS Fallback Error]', e);
        finishSpeech();
      }
    };

    // Primary path: Request natural OpenAI TTS voice from backend
    const ttsRequestStart = performance.now();
    console.log(`[DIAGNOSTIC-STEP 3] Requesting OpenAI TTS for text (${text.length} chars, prefetch: ${Boolean(prefetchPromise)}): "${text.substring(0, 50)}..."`);

    const ttsPromise = prefetchPromise
      ? Promise.resolve(prefetchPromise).then((res) => {
          if (!res || res.data?.isFallback) throw new Error('Prefetched TTS failed or returned fallback');
          return res;
        })
      : axiosClient.post(`/sessions/${sessionId}/live/tts`, { text, voice: 'alloy' }, { timeout: 35000 });

    ttsPromise
      .then((res) => {
        if (isCallEndedRef?.current) {
          console.log('[TTS Diagnostic] Call has ended — discarding in-flight OpenAI audio.');
          return;
        }

        console.log(`[DIAGNOSTIC-STEP 4] TTS response received! HTTP Status: ${res.status}, hasData: ${Boolean(res.data)}, isFallback: ${res.data?.isFallback}, hasAudioUrl: ${Boolean(res.data?.audioUrl)}, audioUrlPrefix: ${(res.data?.audioUrl || '').substring(0, 30)}, audioUrlLength: ${res.data?.audioUrl?.length || 0}`);

        if (res.data?.audioUrl && !res.data?.isFallback) {
          try {
            const base64Data = res.data.audioUrl.replace(/^data:audio\/\w+;base64,/, '');
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const audioBlob = new Blob([bytes.buffer], { type: 'audio/wav' });
            console.log(`[DIAGNOSTIC-STEP 5] Blob created successfully! Blob size: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

            const blobUrl = URL.createObjectURL(audioBlob);
            activeBlobUrlRef.current = blobUrl;
            console.log(`[DIAGNOSTIC-STEP 6] Object URL created: ${blobUrl}`);

            if (isCallEndedRef?.current) {
              try { URL.revokeObjectURL(blobUrl); } catch (e) {}
              return;
            }

            const ttsDeliveryTime = (performance.now() - ttsRequestStart).toFixed(0);
            console.log(`[LiveTiming][Client TTS] OpenAI audio delivered in ${ttsDeliveryTime}ms (${Math.round(bytes.length / 1024)} KB) with voice "${res.data.voice || 'alloy'}"`);

            // Use pre-warmed audio element routed through Web Audio amplifier
            const audio = setupAudioElement();
            const ctx = getAudioContext();
            if (ctx && ctx.state === 'suspended') {
              ctx.resume().catch(() => {});
            }

            console.log(`[DIAGNOSTIC-STEP 7] Setting audio.src = ${blobUrl}`);
            audio.src = blobUrl;

            console.log('[DIAGNOSTIC-STEP 8] Calling audio.load()...');
            audio.load();

            audio.onended = () => {
              if (isCallEndedRef?.current) return;
              if (sampleCheckerRef.current) {
                clearInterval(sampleCheckerRef.current);
                sampleCheckerRef.current = null;
              }
              console.log('[DIAGNOSTIC-STEP 12] audio.onended FIRED! OpenAI audio playback completed successfully.');
              finishSpeech();
            };

            audio.onerror = (e) => {
              if (isCallEndedRef?.current) return;
              if (sampleCheckerRef.current) {
                clearInterval(sampleCheckerRef.current);
                sampleCheckerRef.current = null;
              }
              const code = audio.error ? audio.error.code : 'unknown';
              const msg = audio.error ? audio.error.message : (e?.message || 'Decode error');
              console.error(`[DIAGNOSTIC-AUDIO-ERROR] Audio element error: code=${code}, msg=${msg}`);
              fallbackToBrowserTTS(`Audio element error: ${msg}`);
            };

            audio.onloadedmetadata = () => {
              if (isCallEndedRef?.current) return;
              console.log(`[DIAGNOSTIC-STEP 11] audio.onloadedmetadata FIRED! Duration: ${audio.duration?.toFixed(2)}s, readyState: ${audio.readyState}`);
              if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
              const dynamicTimeoutMs = Math.max(8000, ((audio.duration || 10) + 5) * 1000);
              safetyTimerRef.current = setTimeout(() => {
                if (!hasEnded && !isCallEndedRef?.current) {
                  console.warn('[DIAGNOSTIC-TIMEOUT] Dynamic safety timeout reached during OpenAI audio playback.');
                  finishSpeech();
                }
              }, dynamicTimeoutMs);
            };

            if (isCallEndedRef?.current) {
              try { URL.revokeObjectURL(blobUrl); } catch (e) {}
              return;
            }

            console.log('[DIAGNOSTIC-STEP 9] Calling audio.play()...');
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  if (isCallEndedRef?.current) {
                    audio.pause();
                    audio.src = '';
                    return;
                  }
                  console.log('[DIAGNOSTIC-STEP 9b] 🔊 audio.play() promise resolved! Alex audio playback started.');
                  console.log('[VOICE DEBUG] Next TTS playback started:', text);

                  // ─────────────────────────────────────────────────────────────────────────
                  // ANALYSER WATCHDOG v3.0 — "5-Second Deadman" strategy
                  //
                  // Sampling rules:
                  //   • Poll every 250 ms, up to 60 checks (15 s max).
                  //   • The FIRST check that detects any real signal (maxDev > 2 OR rms > 0.005)
                  //     latches hasEverDetectedSignalRef to TRUE permanently for this utterance.
                  //   • Fallback to playDirectOutput is ONLY allowed when ALL of:
                  //       1. checkCount >= 20   (≥ 5 seconds have elapsed — no word gap can last that long)
                  //       2. hasEverDetectedSignalRef.current === false   (not a single sample ever had signal)
                  //       3. AudioContext state ≠ 'running'  (confirmed dead context, not just a natural pause)
                  //       4. directFallbackTriggeredRef.current === false  (not already fired)
                  //
                  // This makes it IMPOSSIBLE to false-trigger during normal word gaps,
                  // breath pauses, or brief silence between syllables.
                  // ─────────────────────────────────────────────────────────────────────────
                  if (sampleCheckerRef.current) {
                    clearInterval(sampleCheckerRef.current);
                    sampleCheckerRef.current = null;
                  }

                  let checkCount = 0;

                  sampleCheckerRef.current = setInterval(() => {
                    checkCount++;

                    // Stop sampling if audio finished, call ended, or we've hit the 15s cap
                    if (!audio || audio.paused || audio.ended || isCallEndedRef?.current || checkCount > 60) {
                      if (sampleCheckerRef.current) {
                        clearInterval(sampleCheckerRef.current);
                        sampleCheckerRef.current = null;
                      }
                      return;
                    }

                    // Keep AudioContext alive if browser suspended it mid-playback
                    if (ctx && ctx.state === 'suspended') {
                      ctx.resume().catch(() => {});
                    }

                    const { rms, maxDev } = computeAudioMetrics(analyserRef.current);
                    const gainVal = gainNodeRef.current?.gain?.value ?? 1.8;

                    // Log every other check (every 500ms) to keep console readable
                    if (checkCount % 2 === 1) {
                      console.log(
                        `[Audio Watchdog v3] check=${checkCount} | maxDev=${maxDev}/128 | rms=${rms} | ` +
                        `ctxState=${ctx?.state} | gain=${gainVal}x | t=${audio.currentTime?.toFixed(2)}s | ` +
                        `signalLocked=${hasEverDetectedSignalRef.current}`
                      );
                    }

                    // ── Signal detection latch ──────────────────────────────────────────────
                    // Once any real audio sample is observed, the latch is permanently set for
                    // this utterance. Natural word gaps, breath pauses, or soft syllables will
                    // never reset it.
                    if (maxDev > 2 || rms > 0.005) {
                      if (!hasEverDetectedSignalRef.current) {
                        console.log(
                          `[Audio Watchdog v3] ✅ Signal CONFIRMED on Web Audio path at check ${checkCount} ` +
                          `(t=${audio.currentTime?.toFixed(2)}s): maxDev=${maxDev}/128, rms=${rms}. ` +
                          `Fallback permanently locked out for this utterance.`
                        );
                        hasEverDetectedSignalRef.current = true;
                      }
                    }

                    // ── 5-second deadman fallback ───────────────────────────────────────────
                    // Fires ONLY when ALL four conditions are simultaneously true:
                    //   1. ≥ 5 seconds have passed (20 checks × 250ms)
                    //   2. Signal was NEVER detected (not even once)
                    //   3. AudioContext is confirmed non-running (blocked by browser policy)
                    //   4. Fallback has not already fired
                    const ctxDead = ctx && ctx.state !== 'running';
                    const isDeadman =
                      checkCount >= 20 &&
                      !hasEverDetectedSignalRef.current &&
                      ctxDead &&
                      !directFallbackTriggeredRef.current;

                    if (isDeadman) {
                      directFallbackTriggeredRef.current = true;
                      if (sampleCheckerRef.current) {
                        clearInterval(sampleCheckerRef.current);
                        sampleCheckerRef.current = null;
                      }

                      console.warn(
                        `[Audio Watchdog v3] 🚨 DEADMAN triggered at check ${checkCount} (${checkCount * 250}ms). ` +
                        `AudioContext state="${ctx?.state}" | hasEverDetectedSignal=false | ` +
                        `maxDev=${maxDev}/128 | rms=${rms} | t=${audio.currentTime?.toFixed(2)}s. ` +
                        `Switching to direct native output.`
                      );

                      audio.onended = null;
                      audio.onerror = null;
                      audio.onloadedmetadata = null;
                      try { audio.pause(); audio.currentTime = 0; } catch (e) {}

                      playDirectOutput(blobUrl, () => {
                        console.log('[Audio Watchdog v3] Direct output finished — advancing interview.');
                        finishSpeech();
                      });
                    }
                  }, 250);
                })
                .catch((playErr) => {
                  if (isCallEndedRef?.current) return;
                  console.error(`[DIAGNOSTIC-STEP 10] audio.play() REJECTED! Name: ${playErr.name}, Message: ${playErr.message}`, playErr);
                  fallbackToBrowserTTS(`audio.play() rejected: ${playErr.name} - ${playErr.message}`);
                });
            }
          } catch (blobErr) {
            if (isCallEndedRef?.current) return;
            console.warn('[TTS Diagnostic] Failed to parse audio blob:', blobErr);
            fallbackToBrowserTTS(`Blob conversion failed: ${blobErr.message}`);
          }
        } else {
          if (isCallEndedRef?.current) return;
          console.warn('[TTS Diagnostic] Backend returned fallback flag or missing audioUrl');
          fallbackToBrowserTTS(res.data?.message || 'Backend returned fallback flag');
        }
      })
      .catch((err) => {
        if (isCallEndedRef?.current) return;
        console.warn(`[TTS Diagnostic] Network/backend failure: ${err.message}`);
        fallbackToBrowserTTS(`Backend error: ${err.message}`);
      });
  }, [sessionId, isCallEndedRef, stopAudio, getAudioContext, setupAudioElement, playDirectOutput]);

  // Stop and destroy audio on unmount
  useEffect(() => {
    return () => {
      destroyAudio();
    };
  }, [destroyAudio]);

  return {
    speakLine,
    stopAudio,
    prewarmAudio,
    playDirectOutput,
    lastSpokenLineRef,
    audioPlayerRef,
    directAudioPlayerRef,
  };
}
