import { useRef, useCallback, useEffect } from 'react';
import { Room } from 'livekit-client';
import axiosClient from '../api/axiosClient';

/**
 * Hook to manage the LiveKit WebRTC media room lifecycle.
 * Handles token fetching, connecting to the SFU room, publishing camera/mic tracks,
 * hardware toggles, and safe disconnection cleanup.
 */
export function useLiveKitRoom() {
  const livekitRoomRef = useRef(null);

  const disconnectRoom = useCallback(() => {
    if (livekitRoomRef.current) {
      try {
        livekitRoomRef.current.disconnect();
      } catch (e) {
        // ignore already disconnected
      }
      livekitRoomRef.current = null;
    }
  }, []);

  const connectRoom = useCallback(async (sessionId, stream, onStatusUpdate = null) => {
    if (onStatusUpdate) onStatusUpdate('Securing live interview credentials...');

    try {
      const tTokenStart = performance.now();
      const res = await axiosClient.post(`/sessions/${sessionId}/live/token`);
      console.log(`[LiveTiming] LiveKit token received in ${(performance.now() - tTokenStart).toFixed(0)}ms`);

      const { isFallback, token, url } = res.data;
      if (!isFallback && token && url) {
        if (onStatusUpdate) onStatusUpdate('Connecting to LiveKit media room...');

        const room = new Room();
        livekitRoomRef.current = room;

        const tConnectStart = performance.now();
        await room.connect(url, token);
        console.log(`[LiveTiming] LiveKit room connected in ${(performance.now() - tConnectStart).toFixed(0)}ms`);

        if (stream) {
          if (onStatusUpdate) onStatusUpdate('Publishing camera & microphone...');
          const tPublishStart = performance.now();
          const videoTrack = stream.getVideoTracks()[0];
          const audioTrack = stream.getAudioTracks()[0];
          if (videoTrack) await room.localParticipant.publishTrack(videoTrack, { name: 'camera-track' });
          if (audioTrack) {
            await room.localParticipant.publishTrack(audioTrack, { name: 'mic-track' });
            console.log('[Mic Diagnostic] Microphone track published to LiveKit.');
          }
          console.log(`[LiveTiming] Tracks published to LiveKit in ${(performance.now() - tPublishStart).toFixed(0)}ms`);
        }
        return room;
      }
    } catch (lkErr) {
      console.log('[LiveKit Notice] Falling back to local-only media stream:', lkErr.message);
    }
    return null;
  }, []);

  const setMicrophoneEnabled = useCallback((enabled) => {
    if (livekitRoomRef.current?.localParticipant) {
      try {
        livekitRoomRef.current.localParticipant.setMicrophoneEnabled(enabled);
        console.log(`[Mic Diagnostic] LiveKit microphone enabled set to: ${enabled}`);
      } catch (e) {
        console.warn('[Mic Diagnostic] LiveKit mic toggle notice:', e.message);
      }
    }
  }, []);

  const setCameraEnabled = useCallback((enabled) => {
    if (livekitRoomRef.current?.localParticipant) {
      try {
        livekitRoomRef.current.localParticipant.setCameraEnabled(enabled);
      } catch (e) {
        console.warn('[Camera Diagnostic] LiveKit camera toggle notice:', e.message);
      }
    }
  }, []);

  // Disconnect on unmount
  useEffect(() => {
    return () => {
      disconnectRoom();
    };
  }, [disconnectRoom]);

  return {
    livekitRoomRef,
    connectRoom,
    disconnectRoom,
    setMicrophoneEnabled,
    setCameraEnabled,
  };
}
