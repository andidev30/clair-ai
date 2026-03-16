import { useCallback, useEffect, useRef, useState } from 'react';

const SAMPLE_RATE = 16000;

interface UseAudioStreamOptions {
  onAudioData: (data: ArrayBuffer) => void;
}

export function useAudioStream({ onAudioData }: UseAudioStreamOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      contextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      // Analyser for volume visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Use ScriptProcessor as fallback (AudioWorklet requires served files)
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16 PCM
        const pcm = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        onAudioData(pcm.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      workletRef.current = processor as unknown as AudioWorkletNode;

      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start audio:', err);
    }
  }, [onAudioData]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    contextRef.current?.close();
    contextRef.current = null;
    workletRef.current = null;
    analyserRef.current = null;
    setIsRecording(false);
  }, []);

  // When the tab is hidden, browsers suspend the AudioContext.  On returning
  // to the tab the context stays suspended unless explicitly resumed — audio
  // stops flowing to the backend and the model appears to "hang".
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && contextRef.current?.state === 'suspended') {
        contextRef.current.resume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const getVolume = useCallback(() => {
    if (!analyserRef.current) return 0;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
    return avg / 255;
  }, []);

  return { start, stop, isRecording, getVolume };
}
