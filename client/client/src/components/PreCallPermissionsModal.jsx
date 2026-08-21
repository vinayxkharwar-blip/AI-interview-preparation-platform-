import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, ShieldCheck, AlertCircle, VideoOff, MicOff, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';

export default function PreCallPermissionsModal({ onPermissionsGranted, onCancel, targetRole = 'Software Engineer' }) {
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [permissionState, setPermissionState] = useState('idle'); // 'idle' | 'testing' | 'granted' | 'denied'
  const [errorMessage, setErrorMessage] = useState('');
  const [micLevel, setMicLevel] = useState(0);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    // Auto-trigger permissions request on mount for seamless pre-call check
    requestPermissions();

    return () => {
      stopTracks();
    };
  }, []);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  };

  const requestPermissions = async () => {
    setPermissionState('testing');
    setErrorMessage('');
    stopTracks();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Media access timeout')), 3500)
    );

    try {
      const getMediaPromise = navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });

      const stream = await Promise.race([getMediaPromise, timeoutPromise]);

      streamRef.current = stream;

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      setHasCamera(videoTracks.length > 0 && videoTracks[0].enabled);
      setHasMic(audioTracks.length > 0 && audioTracks[0].enabled);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Set up Audio Context visualizer
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateMicLevel = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
          setMicLevel(Math.min(100, Math.round((average / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateMicLevel);
        };
        updateMicLevel();
      } catch (e) {
        console.warn('[PreCall] Audio visualizer initialization notice:', e);
      }

      setPermissionState('granted');
    } catch (err) {
      console.warn('[PreCall] Media access error or timeout, trying basic fallback:', err.message);

      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
        if (fallbackStream) {
          streamRef.current = fallbackStream;
          setHasCamera(false);
          setHasMic(true);
          setPermissionState('granted');
          return;
        }
      } catch (e) {}

      setPermissionState('denied');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera and Microphone permissions were denied in your browser settings.');
      } else if (err.message === 'Media access timeout') {
        setErrorMessage('Camera/microphone response timed out (device may be busy in another app). You can join using WebRTC fallback mode.');
      } else {
        setErrorMessage(err.message || 'Unable to access camera or microphone.');
      }
    }
  };

  const handleProceed = () => {
    // Disown stream so cleanup won't stop active tracks on modal unmount
    const activeStream = streamRef.current;
    streamRef.current = null;

    if (onPermissionsGranted) {
      onPermissionsGranted({
        stream: activeStream,
        hasCamera,
        hasMic,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#12211A]/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#FBF9F3] border-3 border-[#12211A] text-[#12211A] w-full max-w-xl rounded-3xl p-6 sm:p-8 editorial-shadow-lg space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-[#E4DDC9]">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#E7B92E] text-[#12211A] rounded-2xl border-2 border-[#12211A]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif-headline text-2xl font-bold text-[#12211A]">
                Live AI Video Call Setup
              </h2>
              <p className="text-xs font-medium text-[#12211A]/70">
                Mock Technical Interview with Alex • {targetRole}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-[#DCEEDF] text-[#12211A] border-2 border-[#12211A] text-xs font-black rounded-full uppercase tracking-wider">
            WebRTC Mode
          </span>
        </div>

        {/* Video Preview Box */}
        <div className="relative aspect-video bg-[#12211A] rounded-2xl border-3 border-[#12211A] overflow-hidden flex items-center justify-center shadow-inner">
          {permissionState === 'granted' ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          ) : permissionState === 'testing' ? (
            <div className="text-center text-[#FBF9F3] space-y-2">
              <div className="inline-block w-8 h-8 border-4 border-[#E7B92E] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold">Requesting camera & microphone access...</p>
            </div>
          ) : (
            <div className="text-center text-[#FBF9F3]/70 p-6 space-y-3">
              <VideoOff className="w-12 h-12 mx-auto text-[#C05C33]" />
              <p className="text-xs font-bold text-rose-300">Camera preview unavailable</p>
            </div>
          )}

          {/* Device Badges Overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="flex items-center space-x-2 bg-[#12211A]/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-white text-xs font-bold">
              {hasCamera ? <Camera className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4 text-rose-400" />}
              <span>{hasCamera ? 'Camera Ready' : 'Camera Off'}</span>
            </div>
            <div className="flex items-center space-x-2 bg-[#12211A]/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-white text-xs font-bold">
              {hasMic ? <Mic className="w-4 h-4 text-[#E7B92E]" /> : <MicOff className="w-4 h-4 text-rose-400" />}
              <span>{hasMic ? 'Mic Connected' : 'Mic Disconnected'}</span>
            </div>
          </div>
        </div>

        {/* Audio Mic Sensitivity Bar */}
        {permissionState === 'granted' && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-[#12211A]">
              <span>Microphone Test (Speak to test level)</span>
              <span>{micLevel}%</span>
            </div>
            <div className="w-full h-3 bg-[#E4DDC9] rounded-full border-2 border-[#12211A] overflow-hidden">
              <div
                className="h-full bg-[#E7B92E] transition-all duration-100"
                style={{ width: `${micLevel}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Permission Denied Alert & Fallback options */}
        {permissionState === 'denied' && (
          <div className="p-4 bg-rose-50 border-2 border-[#C05C33] rounded-2xl space-y-2 text-[#12211A] text-xs font-bold">
            <div className="flex items-center space-x-2 text-[#C05C33]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Camera or Microphone Access Denied</span>
            </div>
            <p className="text-[#12211A]/80 leading-relaxed font-normal">
              {errorMessage || 'Browser permissions are required for live video call mode.'} You can grant permissions in your browser address bar or switch to the standard audio/text interview mode.
            </p>
          </div>
        )}

        {/* Explicit Privacy Copy Notice */}
        <div className="p-3.5 bg-[#DCEEDF]/60 border-2 border-[#B7D8BE] rounded-2xl flex items-start space-x-3 text-xs text-[#12211A]">
          <ShieldCheck className="w-5 h-5 text-[#1D3327] shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>Privacy Protection:</strong> Webcam frames are processed locally for live preview and speech detection. Camera video is never recorded or stored on any server.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl font-bold text-[#12211A] bg-[#E4DDC9] hover:bg-[#D8CFA7] transition-all border-2 border-[#12211A] flex items-center justify-center space-x-2 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Fallback to Standard Mode</span>
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {permissionState !== 'granted' && (
              <button
                type="button"
                onClick={requestPermissions}
                className="px-4 py-3 rounded-2xl font-bold text-[#12211A] bg-[#E4DDC9] hover:bg-[#D8CFA7] transition-all border-2 border-[#12211A] text-xs flex items-center justify-center space-x-1"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleProceed}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-[#FBF9F3] bg-[#12211A] hover:bg-[#1D3327] transition-all border-2 border-[#12211A] editorial-shadow flex items-center justify-center space-x-2 text-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-[#E7B92E]" />
              <span>{permissionState === 'granted' ? 'Join Video Call with Alex' : 'Join Call Now (Fallback Mode)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
