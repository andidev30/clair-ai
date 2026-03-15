import { Box, Button, Card, CardContent, Container, Typography } from '@mui/material';
import { Navigate, Link as RouterLink } from 'react-router';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useAuth } from '../hooks/useAuth';

const features = [
  {
    icon: <AutoAwesomeIcon sx={{ fontSize: 36, color: '#1565c0' }} />,
    title: 'Real-time AI Feedback',
    description: 'Get instant, contextual hints and coaching from an AI interviewer as you work through problems.',
  },
  {
    icon: <ScreenShareIcon sx={{ fontSize: 36, color: '#1565c0' }} />,
    title: 'Screen & Code Analysis',
    description: 'Share your screen so the AI can see your IDE, browser, or whiteboard and guide you in context.',
  },
  {
    icon: <AssessmentIcon sx={{ fontSize: 36, color: '#1565c0' }} />,
    title: 'Detailed Session Results',
    description: 'Review full transcripts, scores, and actionable feedback after every interview session.',
  },
];

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f0f4ff' }}>
      {/* Nav */}
      <Box
        component="header"
        sx={{
          px: { xs: 3, md: 6 },
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#fff',
          borderBottom: '1px solid #e8eaf6',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              background: 'linear-gradient(135deg, #1565c0, #42a5f5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography fontWeight={800} color="#fff" fontSize={14}>C</Typography>
          </Box>
          <Typography variant="h6" fontWeight={700} color="text.primary">
            Clair AI
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to="/login"
          variant="outlined"
          size="small"
          sx={{ borderRadius: 2 }}
        >
          Sign in
        </Button>
      </Box>

      {/* Hero */}
      <Container maxWidth="md" sx={{ pt: { xs: 8, md: 12 }, pb: 6, textAlign: 'center' }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: '#e3f2fd',
            color: '#1565c0',
            px: 2,
            py: 0.5,
            borderRadius: 10,
            mb: 3,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 16 }} />
          <Typography variant="caption" fontWeight={600}>AI-Powered Interview Practice</Typography>
        </Box>

        <Typography
          variant="h2"
          fontWeight={800}
          sx={{ fontSize: { xs: '2.2rem', md: '3.2rem' }, lineHeight: 1.15, mb: 2.5 }}
        >
          Ace your technical{' '}
          <Box component="span" sx={{ background: 'linear-gradient(135deg, #1565c0, #42a5f5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            interviews
          </Box>
        </Typography>

        <Typography
          variant="h6"
          color="text.secondary"
          fontWeight={400}
          sx={{ maxWidth: 560, mx: 'auto', mb: 5, lineHeight: 1.6 }}
        >
          Clair AI gives candidates real-time coaching during live coding interviews — screen-aware, context-smart, and always in your corner.
        </Typography>

        <Button
          component={RouterLink}
          to="/login"
          variant="contained"
          size="large"
          sx={{
            borderRadius: 2.5,
            px: 5,
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #1565c0, #42a5f5)',
            boxShadow: '0 4px 20px rgba(21,101,192,0.35)',
            '&:hover': { boxShadow: '0 6px 24px rgba(21,101,192,0.45)' },
          }}
        >
          Get Started Free
        </Button>
      </Container>

      {/* Features */}
      <Container maxWidth="md" sx={{ pb: 10 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {features.map((f) => (
            <Card
              key={f.title}
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid #e8eaf6',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: '0 4px 24px rgba(21,101,192,0.10)' },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box mb={1.5}>{f.icon}</Box>
                <Typography variant="subtitle1" fontWeight={700} mb={0.75}>
                  {f.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                  {f.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
