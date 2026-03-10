import { useCallback, useEffect, useRef, useState } from 'react';

export interface TranscriptMessage {
  speaker: 'clair' | 'candidate';
  text: string;
  finished: boolean;
}

export interface CheatingSignal {
  signal_type: 'ai_tool_detected' | 'large_paste' | 'tab_switch' | 'fast_typing';
  detail: string;
  timestamp: number;
}

export interface CodingChallenge {
  problem: string;
  language: string;
  starter_code: string;
}

interface UseWebSocketOptions {
  sessionToken: string;
  onAudio?: (base64Data: string) => void;
  onTranscript?: (msg: TranscriptMessage) => void;
  onCodingChallenge?: (challenge: CodingChallenge) => void;
  onStageChange?: (stage: string, action: string) => void;
  onInterviewComplete?: () => void;
  onSessionReady?: (data: { session_id: string; interview: unknown }) => void;
}

export function useWebSocket({
  sessionToken,
  onAudio,
  onTranscript,
  onCodingChallenge,
  onStageChange,
  onInterviewComplete,
  onSessionReady,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs for callbacks to avoid stale closures and reconnection loops
  const onAudioRef = useRef(onAudio);
  const onTranscriptRef = useRef(onTranscript);
  const onCodingChallengeRef = useRef(onCodingChallenge);
  const onStageChangeRef = useRef(onStageChange);
  const onInterviewCompleteRef = useRef(onInterviewComplete);
  const onSessionReadyRef = useRef(onSessionReady);

  useEffect(() => { onAudioRef.current = onAudio; }, [onAudio]);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onCodingChallengeRef.current = onCodingChallenge; }, [onCodingChallenge]);
  useEffect(() => { onStageChangeRef.current = onStageChange; }, [onStageChange]);
  useEffect(() => { onInterviewCompleteRef.current = onInterviewComplete; }, [onInterviewComplete]);
  useEffect(() => { onSessionReadyRef.current = onSessionReady; }, [onSessionReady]);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/interview/${sessionToken}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        // Handle ADK events: extract audio from inline_data
        if (msg.content?.parts) {
          for (const part of msg.content.parts) {
            if (part.inlineData?.data) {
              onAudioRef.current?.(part.inlineData.data);
            }
          }
        }

        // Handle transcription from ADK events
        if (msg.inputTranscription?.text) {
          onTranscriptRef.current?.({
            speaker: 'candidate',
            text: msg.inputTranscription.text,
            finished: msg.inputTranscription.finished ?? false,
          });
        }

        if (msg.outputTranscription?.text) {
          onTranscriptRef.current?.({
            speaker: 'clair',
            text: msg.outputTranscription.text,
            finished: msg.outputTranscription.finished ?? false,
          });
        }

        // Handle custom messages from our server
        switch (msg.type) {
          case 'agent.audio':
            // Explicit audio message with reliable base64 encoding
            onAudioRef.current?.(msg.data);
            break;
          case 'session_ready':
            onSessionReadyRef.current?.(msg);
            break;
          case 'coding_challenge':
            onCodingChallengeRef.current?.(msg);
            break;
          case 'stage_change':
            onStageChangeRef.current?.(msg.stage, msg.action || '');
            break;
          case 'interview_complete':
            onInterviewCompleteRef.current?.();
            break;
          case 'error':
            setError(msg.message);
            break;
        }
      } catch {
        // Non-JSON message, ignore
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
      setConnected(false);
    };
  }, [sessionToken]);

  const sendAudio = useCallback((data: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text', text }));
    }
  }, []);

  const sendScreenFrame = useCallback((base64Data: string, mimeType = 'image/jpeg') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'screen_frame', data: base64Data, mimeType }),
      );
    }
  }, []);

  const sendCameraFrame = useCallback((base64Data: string, mimeType = 'image/jpeg') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'camera_frame', data: base64Data, mimeType }),
      );
    }
  }, []);

  const endInterview = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_interview' }));
    }
  }, []);

  const sendCandidateReady = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'candidate_ready' }));
    }
  }, []);

  const sendCheatingSignal = useCallback((signal: CheatingSignal) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cheating_signal', ...signal }));
    }
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return {
    connect,
    disconnect,
    sendAudio,
    sendText,
    sendScreenFrame,
    sendCameraFrame,
    endInterview,
    sendCandidateReady,
    sendCheatingSignal,
    connected,
    error,
  };
}
