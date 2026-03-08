import { useCallback, useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Paper,
  Typography,
} from '@mui/material';
import CallEndIcon from '@mui/icons-material/CallEnd';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import AudioControls from '../components/interview-session/AudioControls';
import InterviewChat, {
  type ChatMessage,
} from '../components/interview-session/InterviewChat';
import CodeEditor from '../components/interview-session/CodeEditor';
import InterviewTimer from '../components/interview-session/InterviewTimer';
import StageIndicator from '../components/interview-session/StageIndicator';
import {
  useWebSocket,
  type CodingChallenge,
  type TranscriptMessage,
} from '../hooks/useWebSocket';
import { useAudioStream } from '../hooks/useAudioStream';
import { useScreenCapture } from '../hooks/useScreenCapture';

export default function InterviewPage() {
  const { token } = useParams<{ token: string }>();
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [challenge, setChallenge] = useState<CodingChallenge | null>(null);
  const [code, setCode] = useState('');
  const [stage, setStage] = useState('warmup');
  const [showEditor, setShowEditor] = useState(false);
  const [showScreenShareDialog, setShowScreenShareDialog] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false); // true when Clair speaks
  const startTimeRef = useRef<number | null>(null);

  // Audio playback — queue buffers so they play sequentially without gaps
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playAudio = useCallback((base64Data: string) => {
    const ctx = ensureAudioContext();
    // Decode base64 to binary
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    // Gemini outputs 24kHz PCM16
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }
    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    // Schedule buffers sequentially to avoid gaps/overlapping
    const now = ctx.currentTime;
    const startAt = Math.max(now, nextPlayTimeRef.current);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;
  }, [ensureAudioContext]);

  const handleTranscript = useCallback((msg: TranscriptMessage) => {
    console.log('[Transcript IN]', msg.speaker, msg.finished ? 'FINAL' : 'partial', `"${msg.text.substring(0, 80)}..."`);

    setMessages((prev) => {
      // Search backwards for the most recent message from the SAME speaker
      let sameIdx = -1;
      for (let i = prev.length - 1; i >= Math.max(0, prev.length - 8); i--) {
        if (prev[i].speaker === msg.speaker) {
          sameIdx = i;
          break;
        }
      }

      // Found an existing message from the same speaker
      if (sameIdx >= 0) {
        const existing = prev[sameIdx];

        // Still streaming (unfinished) → update in place
        if (!existing.finished) {
          const updated = [...prev];
          if (msg.finished) {
            // FINAL has full cumulative text → replace for accuracy
            console.log('[Transcript] FINAL replace', msg.speaker, `"${msg.text.substring(0, 60)}..."`);
            updated[sameIdx] = { ...existing, text: msg.text, finished: true };
          } else {
            // Partial has just the new word(s) → concatenate
            console.log('[Transcript] APPEND partial', msg.speaker, `"${msg.text.substring(0, 60)}..."`);
            updated[sameIdx] = { ...existing, text: existing.text + msg.text, finished: false };
          }
          return updated;
        }

        // Already finished → check for duplicate/replay
        const existTrimmed = existing.text.trim();
        const newTrimmed = msg.text.trim();
        if (
          existTrimmed === newTrimmed ||
          (existTrimmed.length > 15 && newTrimmed.startsWith(existTrimmed.substring(0, 30))) ||
          (newTrimmed.length > 15 && existTrimmed.startsWith(newTrimmed.substring(0, 30)))
        ) {
          console.log('[Transcript] SKIP duplicate', msg.speaker);
          return prev;
        }
      }

      // No matching speaker found, or genuinely new utterance → append
      console.log('[Transcript] ADD new', msg.speaker, `"${msg.text.substring(0, 60)}..."`);
      return [...prev, { speaker: msg.speaker, text: msg.text, finished: msg.finished }];
    });
  }, []);

  const handleCodingChallenge = useCallback((c: CodingChallenge) => {
    setChallenge(c);
    setCode(c.starter_code || '');
  }, []);

  const handleStageChange = useCallback((newStage: string, action: string) => {
    setStage(newStage);

    if (action === 'show_editor') {
      setShowEditor(true);
    } else if (action === 'hide_editor') {
      setShowEditor(false);
    } else if (action === 'request_screen_share') {
      setShowScreenShareDialog(true);
    }
  }, []);

  const stopMicRef = useRef<() => void>(() => { });
  const stopScreenRef = useRef<() => void>(() => { });

  const {
    connect,
    sendAudio,
    sendScreenFrame,
    endInterview,
    connected,
    error,
  } = useWebSocket({
    sessionToken: token || '',
    onAudio: playAudio,
    onTranscript: handleTranscript,
    onCodingChallenge: handleCodingChallenge,
    onStageChange: handleStageChange,
    onInterviewComplete: () => {
      setComplete(true);
      stopMicRef.current();
      stopScreenRef.current();
    },
  });

  const { start: startMic, stop: stopMic, isRecording, getVolume } = useAudioStream({
    onAudioData: sendAudio,
  });

  const { start: startScreen, stop: stopScreen, isSharing } = useScreenCapture({
    onFrame: sendScreenFrame,
  });

  // Watch for the first message to officially "start" the interview
  useEffect(() => {
    if (started && !interviewStarted && messages.length > 0) {
      // Clair has sent a message, start the interview
      setInterviewStarted(true);
      startTimeRef.current = Date.now();

      // Delay mic start slightly to avoid immediate feedback loop or clipping
      setTimeout(() => startMic(), 500);
    }
  }, [messages, started, interviewStarted, startMic]);

  // Keep refs in sync
  stopMicRef.current = stopMic;
  stopScreenRef.current = stopScreen;

  const handleStart = async () => {
    // Create AudioContext on user gesture so browser allows playback
    ensureAudioContext();
    connect();
    setStarted(true);
    // Timer and mic will start automatically when Clair sends the first message
  };

  const handleEnd = () => {
    endInterview();
    stopMic();
    stopScreen();
  };

  const handleToggleMic = () => {
    if (isRecording) stopMic();
    else startMic();
  };

  const handleShareScreen = () => {
    setShowScreenShareDialog(false);
    startScreen();
  };

  const handleDismissScreenShare = () => {
    setShowScreenShareDialog(false);
  };

  if (complete) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        <Paper sx={{ p: 6, textAlign: 'center', maxWidth: 500 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Interview Complete
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Thank you for your time! Your results are being processed and will
            be shared with the interviewer.
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (!started) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        <Paper sx={{ p: 6, textAlign: 'center', maxWidth: 500 }}>
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #1565c0, #42a5f5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <Typography fontWeight={800} color="#fff" fontSize={24}>
              C
            </Typography>
          </Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Ready for your interview?
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={4}>
            You'll be interviewed by Clair, our AI technical interviewer. Make
            sure your microphone is ready.
          </Typography>
          <Button variant="contained" size="large" onClick={handleStart}>
            Start Interview
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" height="100vh" bgcolor="#1e1e1e">
      {/* Top bar */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={2}
        py={1}
        bgcolor="background.paper"
        borderBottom={1}
        borderColor="divider"
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6" fontWeight={700}>
            Clair AI
          </Typography>
          <Chip
            label={connected ? 'Connected' : 'Connecting...'}
            color={connected ? 'success' : 'default'}
            size="small"
          />
          {error && <Chip label={error} color="error" size="small" />}
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <StageIndicator currentStage={stage} />
          <InterviewTimer startTime={interviewStarted ? startTimeRef.current : null} />
          <AudioControls
            isRecording={isRecording}
            onToggleMic={handleToggleMic}
            getVolume={getVolume}
          />
          {isSharing && (
            <Chip
              icon={<ScreenShareIcon />}
              label="Screen Shared"
              color="success"
              size="small"
              variant="outlined"
            />
          )}
          <Button
            variant="contained"
            color="error"
            startIcon={<CallEndIcon />}
            onClick={handleEnd}
            size="small"
          >
            End
          </Button>
        </Box>
      </Box>

      {/* Main content */}
      <Box display="flex" flex={1} minHeight={0}>
        {/* Transcript panel */}
        <Box
          width={showEditor ? 360 : '100%'}
          maxWidth={showEditor ? 360 : 600}
          mx={showEditor ? 0 : 'auto'}
          display="flex"
          flexDirection="column"
          bgcolor="background.paper"
          borderRight={showEditor ? 1 : 0}
          borderColor="divider"
        >
          <Box px={2} py={1.5} borderBottom={1} borderColor="divider">
            <Typography variant="subtitle2">Live Transcript</Typography>
          </Box>
          <InterviewChat messages={messages} />
        </Box>

        {/* Code editor — only shown when AI triggers it */}
        {showEditor && (
          <>
            <Divider orientation="vertical" flexItem />
            <Box flex={1} display="flex" flexDirection="column">
              <CodeEditor
                problem={challenge?.problem ?? ''}
                language={challenge?.language ?? 'javascript'}
                starterCode={challenge?.starter_code ?? ''}
                value={code}
                onChange={setCode}
              />
            </Box>
          </>
        )}
      </Box>

      {/* Screen share request dialog */}
      <Dialog
        open={showScreenShareDialog}
        onClose={handleDismissScreenShare}
      >
        <DialogTitle>Share Your Screen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The interviewer has requested you to share your screen so they can
            observe your work. Please click "Share Screen" to proceed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDismissScreenShare}>Later</Button>
          <Button
            onClick={handleShareScreen}
            variant="contained"
            startIcon={<ScreenShareIcon />}
          >
            Share Screen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
