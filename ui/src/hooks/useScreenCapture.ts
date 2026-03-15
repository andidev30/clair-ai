import { useCallback, useRef, useState } from 'react';

const CAPTURE_INTERVAL = 1000; // 1 FPS
const CAPTURE_SIZE = 768;

interface UseScreenCaptureOptions {
  onFrame: (base64Data: string) => void;
}

export function useScreenCapture({ onFrame }: UseScreenCaptureOptions) {
  const [isSharing, setIsSharing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1920, height: 1080 },
      });
      streamRef.current = stream;

      // Create offscreen canvas (dimensions set per-frame to match video aspect ratio)
      const canvas = document.createElement('canvas');
      canvasRef.current = canvas;

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Handle user stopping share via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stop();
      };

      // Capture frames at interval
      intervalRef.current = window.setInterval(() => {
        const ctx = canvas.getContext('2d');
        if (ctx && video.readyState >= 2) {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (vw > 0 && vh > 0) {
            // Scale to fit within CAPTURE_SIZE while preserving aspect ratio
            const scale = Math.min(CAPTURE_SIZE / vw, CAPTURE_SIZE / vh);
            const w = Math.round(vw * scale);
            const h = Math.round(vh * scale);
            if (canvas.width !== w || canvas.height !== h) {
              canvas.width = w;
              canvas.height = h;
            }
            ctx.drawImage(video, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            const base64 = dataUrl.split(',')[1];
            onFrame(base64);
          }
        }
      }, CAPTURE_INTERVAL);

      setIsSharing(true);
    } catch (err) {
      console.error('Failed to start screen capture:', err);
    }
  }, [onFrame]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    canvasRef.current = null;
    setIsSharing(false);
  }, []);

  return { start, stop, isSharing };
}
