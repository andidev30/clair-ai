import { useParams, useNavigate } from 'react-router';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery } from '@tanstack/react-query';
import { getSessionResult } from '../api/sessions';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';

const recommendationConfig = {
  strong_hire: { label: 'Strong Hire', color: 'success' as const },
  hire: { label: 'Hire', color: 'info' as const },
  no_hire: { label: 'No Hire', color: 'warning' as const },
  strong_no_hire: { label: 'Strong No Hire', color: 'error' as const },
};

const scoreLabels: Record<string, string> = {
  communication: 'Communication',
  technical_knowledge: 'Technical Knowledge',
  problem_solving: 'Problem Solving',
  coding_skills: 'Coding Skills',
};

export default function ResultsPage() {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>();
  const navigate = useNavigate();

  const { data: result, isLoading, error } = useQuery({
    queryKey: ['result', sessionId],
    queryFn: () => getSessionResult(sessionId!),
    enabled: !!sessionId,
  });

  if (isLoading) return <LoadingSpinner />;
  if (error || !result) return <ErrorAlert message="Results not found" />;

  const rec = recommendationConfig[result.recommendation] ?? {
    label: result.recommendation,
    color: 'default' as const,
  };

  return (
    <Container maxWidth="md" sx={{ py: 4, flexGrow: 1 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/interviews/${id}`)}
        sx={{ mb: 2 }}
      >
        Back to Interview
      </Button>

      {/* Score Overview */}
      <Paper sx={{ p: 4, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Interview Results
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Session: {sessionId}
            </Typography>
          </Box>
          <Stack alignItems="center" spacing={1}>
            <Typography variant="h3" fontWeight={700} color="primary.main">
              {result.overall_score.toFixed(0)}
            </Typography>
            <Chip label={rec.label} color={rec.color} />
          </Stack>
        </Box>

        <Typography variant="body1" mb={3}>
          {result.summary}
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Score Breakdown */}
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Score Breakdown
        </Typography>
        <Stack spacing={2}>
          {Object.entries(result.score_breakdown).map(([key, value]) => (
            <Box key={key}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2">
                  {scoreLabels[key] ?? key}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {(value as number).toFixed(0)}/100
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={value as number}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          ))}
        </Stack>
      </Paper>

      {/* Key Moments */}
      {result.key_moments.length > 0 && (
        <Paper sx={{ p: 4, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Key Moments
          </Typography>
          <List>
            {result.key_moments.map((moment, i) => (
              <ListItem key={i} divider={i < result.key_moments.length - 1}>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        label={moment.type.replace(/_/g, ' ')}
                        size="small"
                        color={
                          moment.type === 'ai_tool_detected' ? 'error' :
                          moment.type === 'large_paste' || moment.type === 'tab_switch' ? 'warning' :
                          'default'
                        }
                      />
                      <Typography variant="body2">{moment.description}</Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Transcript */}
      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Transcript
        </Typography>
        {result.transcript.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No transcript available.
          </Typography>
        ) : (
          <Stack spacing={1.5} sx={{ maxHeight: 500, overflow: 'auto' }}>
            {result.transcript.map((entry, i) => (
              <Box key={i}>
                <Typography variant="caption" color="text.secondary">
                  {entry.speaker === 'clair' ? 'Clair' : 'Candidate'}
                </Typography>
                <Typography variant="body2">{entry.text}</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Container>
  );
}
