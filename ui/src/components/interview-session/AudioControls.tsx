import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';

interface AudioControlsProps {
  isRecording: boolean;
  onToggleMic: () => void;
  getVolume: () => number;
}

export default function AudioControls({
  isRecording,
  onToggleMic,
  getVolume,
}: AudioControlsProps) {
  const [volume, setVolume] = useState(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!isRecording) {
      setVolume(0);
      return;
    }
    const tick = () => {
      setVolume(getVolume());
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [isRecording, getVolume]);

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Tooltip title={isRecording ? 'Mute microphone' : 'Unmute microphone'}>
        <IconButton
          onClick={onToggleMic}
          color={isRecording ? 'primary' : 'default'}
          sx={{
            bgcolor: isRecording ? 'primary.50' : 'grey.100',
            '&:hover': { bgcolor: isRecording ? 'primary.100' : 'grey.200' },
          }}
        >
          {isRecording ? <MicIcon /> : <MicOffIcon />}
        </IconButton>
      </Tooltip>
      <Box
        sx={{
          width: 60,
          height: 8,
          borderRadius: 4,
          bgcolor: 'grey.200',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: `${Math.min(volume * 100, 100)}%`,
            height: '100%',
            bgcolor: volume > 0.6 ? 'error.main' : 'success.main',
            borderRadius: 4,
            transition: 'width 0.1s',
          }}
        />
      </Box>
    </Box>
  );
}
