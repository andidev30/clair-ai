import { useEffect, useState } from 'react';
import { Typography } from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';
import { Box } from '@mui/material';

interface InterviewTimerProps {
  startTime: number;
}

export default function InterviewTimer({ startTime }: InterviewTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <Box display="flex" alignItems="center" gap={0.5}>
      <TimerIcon fontSize="small" color="action" />
      <Typography variant="body2" fontFamily="monospace">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </Typography>
    </Box>
  );
}
