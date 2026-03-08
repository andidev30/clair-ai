import { useEffect, useRef } from 'react';
import { Box, Paper, Typography, CircularProgress, Stack } from '@mui/material';

export interface ChatMessage {
  speaker: 'clair' | 'candidate';
  text: string;
  finished: boolean;
}

interface InterviewChatProps {
  messages: ChatMessage[];
}

export default function InterviewChat({ messages }: InterviewChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Box
      sx={{
        flex: 1,
        overflow: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {messages.length === 0 && (
        <Stack spacing={3} alignItems="center" mt={8}>
          <CircularProgress size={40} thickness={4} />
          <Typography variant="body1" color="text.secondary" fontWeight={500}>
            Waiting for Clair to start the interview...
          </Typography>
        </Stack>
      )}
      {messages.map((msg, i) => (
        <Box
          key={`${msg.speaker}-${i}`}
          sx={{
            alignSelf: msg.speaker === 'candidate' ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 0.25, display: 'block' }}
          >
            {msg.speaker === 'clair' ? 'Clair' : 'You'}
          </Typography>
          <Paper
            sx={{
              px: 2,
              py: 1,
              bgcolor:
                msg.speaker === 'candidate' ? 'primary.50' : 'grey.50',
              borderRadius: 2,
              opacity: msg.finished ? 1 : 0.7,
            }}
            elevation={0}
          >
            <Typography variant="body2">
              {msg.text}
              {!msg.finished && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    width: 6,
                    height: 14,
                    bgcolor: 'text.secondary',
                    ml: 0.5,
                    animation: 'blink 1s infinite',
                    '@keyframes blink': {
                      '0%, 50%': { opacity: 1 },
                      '51%, 100%': { opacity: 0 },
                    },
                  }}
                />
              )}
            </Typography>
          </Paper>
        </Box>
      ))}
      <div ref={bottomRef} />
    </Box>
  );
}
