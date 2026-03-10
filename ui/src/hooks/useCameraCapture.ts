import { useCallback, useRef, useState } from 'react';

const CAPTURE_INTERVAL = 2000; // 0.5 FPS to save bandwidth alongside screen capture
const CAPTURE_WIDTH = 640;
const CAPTURE_HEIGHT = 480;

interface UseCameraCaptureOptions {
  onFrame: (base64Data: string) => void;
}

export function useCameraCapture({ onFrame }: UseCameraCaptureOptions) {
  const [isActive, setIsActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT, facingMode: 'user' },
      });
      streamRef.current = stream;
      setStream(stream);

      // Create offscreen canvas for frame capture
      const canvas = document.createElement('canvas');
      canvas.width = CAPTURE_WIDTH;
      canvas.height = CAPTURE_HEIGHT;
      canvasRef.current = canvas;

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Handle user revoking camera permission
      stream.getVideoTracks()[0].onended = () => {
        stop();
      };

      // Capture frames at interval
      intervalRef.current = window.setInterval(() => {
        const ctx = canvas.getContext('2d');
        if (ctx && video.readyState >= 2) {
          ctx.drawImage(video, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          const base64 = dataUrl.split(',')[1];
          onFrame(base64);
        }
      }, CAPTURE_INTERVAL);

      setIsActive(true);
    } catch (err) {
      console.error('Failed to start camera capture:', err);
    }
  }, [onFrame]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    canvasRef.current = null;
    setIsActive(false);
  }, []);

  return { start, stop, isActive, stream };
}
