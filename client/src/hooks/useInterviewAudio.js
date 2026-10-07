import { useRef, useCallback, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

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
 * Hook to manage Text-to-Speech playback:
 * - Primary: High-fidelity OpenAI Cloud TTS voice ("alloy")
 * - Fallback: Browser Web Speech API SpeechSynthesis
 * - Pre-warming: Gesture-based unlock of browser Autoplay policies
 * - Lifecycle: Safe blob URL allocation and revocation, dynamic duration timeouts, cancellation
 */
export function useInterviewAudio({ sessionId, isCallEndedRef, onSpeechStart, onSpeechEnd }) {
  const audioPlayerRef = useRef(null);
  const synthRef = useRef(null);
  const lastSpokenLineRef = useRef('');
  const activeBlobUrlRef = useRef(null);
  const safetyTimerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);

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
   * Lazily configures HTMLAudioElement with an amplifier graph (compressor + 1.8x gain).
   */
  const setupAudioElement = useCallback(() => {
    let audio = audioPlayerRef.current;
    if (!audio) {
      audio = new Audio();
      audio.volume = 1.0;
      audioPlayerRef.current = audio;

      const ctx = getAudioContext();
      if (ctx) {
        try {
          const source = ctx.createMediaElementSource(audio);

          // Studio dynamic compressor: brings up lower syllables and balances voice
          const compressor = ctx.createDynamicsCompressor();
          compressor.threshold.setValueAtTime(-20, ctx.currentTime);
          compressor.knee.setValueAtTime(25, ctx.currentTime);
          compressor.ratio.setValueAtTime(3.5, ctx.currentTime);
          compressor.attack.setValueAtTime(0.003, ctx.currentTime);
          compressor.release.setValueAtTime(0.25, ctx.currentTime);

          // Audio amplifier gain node: boosts volume by 1.8x
          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(1.8, ctx.currentTime);
          gainNodeRef.current = gainNode;

          source.connect(compressor);
          compressor.connect(gainNode);
          gainNode.connect(ctx.destination);
          console.log('[Audio Amplifier] Connected studio compressor and 1.8x gain boost node.');
        } catch (e) {
          console.warn('[Audio Amplifier MediaElementSource notice]', e.message);
        }
      }
    }
    audio.volume = 1.0;
    return audio;
  }, [getAudioContext]);

  const stopAudio = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }

    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.onended = null;
        audioPlayerRef.current.onerror = null;
        audioPlayerRef.current.onloadedmetadata = null;
        audioPlayerRef.current.currentTime = 0;
      } catch (e) {
        // ignore pause errors
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore cancel errors
      }
    }

    if (activeBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      } catch (e) {
        // ignore revoke errors
      }
      activeBlobUrlRef.current = null;
    }
  }, []);

  const destroyAudio = useCallback(() => {
    stopAudio();
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close().catch(() => {});
      } catch (e) {}
      audioCtxRef.current = null;
      gainNodeRef.current = null;
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
  }, []);

  /**
   * Speak a text string via Gemini TTS with Web Speech API fallback.
   */
  const speakLine = useCallback((text, onComplete, prefetchPromise = null) => {
    if (isCallEndedRef?.current || !text) {
      if (onComplete && !isCallEndedRef?.current) onComplete();
      return;
    }

    console.log('[VOICE DEBUG] AI question started:', text);
    console.log('[VOICE DEBUG] TTS response started:', text);
    lastSpokenLineRef.current = text;
    if (onSpeechStart) onSpeechStart(text);

    // Stop any existing playback
    stopAudio();

    let hasEnded = false;

    const finishSpeech = () => {
      if (hasEnded) return;
      hasEnded = true;

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
      if (onSpeechEnd) onSpeechEnd();
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
              console.log('[DIAGNOSTIC-STEP 12] audio.onended FIRED! OpenAI audio playback completed successfully.');
              finishSpeech();
            };

            audio.onerror = (e) => {
              if (isCallEndedRef?.current) return;
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
  }, [sessionId, isCallEndedRef, onSpeechStart, onSpeechEnd, stopAudio]);

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
    lastSpokenLineRef,
    audioPlayerRef,
  };
}
