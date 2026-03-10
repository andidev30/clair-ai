import { useState } from 'react';
import { useParams } from 'react-router';
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { getInterview } from '../api/interviews';
import { createSession, getSessions } from '../api/sessions';
import type { Session } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';

export default function InterviewSetupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCandidateDialog, setShowCandidateDialog] = useState(false);
  const [candidateName, setCandidateName] = useState('');

  const { data: interview, isLoading, error } = useQuery({
    queryKey: ['interview', id],
    queryFn: () => getInterview(id!),
    enabled: !!id,
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions', id],
    queryFn: () => getSessions(id!),
    enabled: !!id,
  });

  const createSessionMutation = useMutation({
    mutationFn: (name: string) => createSession(id!, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', id] });
      setShowCandidateDialog(false);
      setCandidateName('');
    },
  });

  const handleGenerateLink = () => {
    setCandidateName('');
    setShowCandidateDialog(true);
  };

  const handleConfirmGenerate = () => {
    if (candidateName.trim()) {
      createSessionMutation.mutate(candidateName.trim());
    }
  };

  const getInterviewUrl = (session: Session) => {
    return `${window.location.origin}/interview/${session.token}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const handleCopyLink = (session: Session) => {
    navigator.clipboard.writeText(getInterviewUrl(session));
    setCopiedId(session.id);
    setTimeout(() => {
      setCopiedId((prevId) => (prevId === session.id ? null : prevId));
    }, 2000);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error || !interview) return <ErrorAlert message="Interview not found" />;

  return (
    <Container maxWidth="md" sx={{ py: 4, flexGrow: 1 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/dashboard')}
        sx={{ mb: 2 }}
      >
        Back to Dashboard
      </Button>

      <Paper sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {interview.title}
        </Typography>
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Typography variant="body1">
            <strong>Position:</strong> {interview.position}
          </Typography>
          <Typography variant="body1">
            <strong>Level:</strong> {interview.level}
          </Typography>
          {interview.tech_stack?.length > 0 && (
            <Box>
              <Typography variant="body1" component="span">
                <strong>Tech Stack:</strong>{' '}
              </Typography>
              {interview.tech_stack.map((tech) => (
                <Chip key={tech} label={tech} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
              ))}
            </Box>
          )}
          {interview.job_description && (
            <Box>
              <Typography variant="body1">
                <strong>Job Description:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {interview.job_description}
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={600}>
            Interview Sessions
          </Typography>
          <Button
            variant="contained"
            startIcon={<LinkIcon />}
            onClick={handleGenerateLink}
          >
            Generate Link
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {(!sessions || sessions.length === 0) && (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
            No sessions yet. Generate an interview link to get started.
          </Typography>
        )}

        <Stack spacing={3}>
          {sessions?.map((session) => (
            <Paper
              key={session.id}
              variant="outlined"
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 2,
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'grey.50',
                },
              }}
            >
              <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={{ xs: 2, md: 3 }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
                
                {/* Left Side: Info */}
                <Box flexGrow={1} minWidth={0} width="100%">
                  <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap lineHeight={1}>
                      {session.candidate_name}
                    </Typography>
                    <Chip
                      label={
                        session.status === 'completed'
                          ? 'Completed'
                          : session.status === 'in_progress'
                            ? 'In Progress'
                            : 'Pending'
                      }
                      size="small"
                      color={
                        session.status === 'completed'
                          ? 'success'
                          : session.status === 'in_progress'
                            ? 'warning'
                            : 'default'
                      }
                      sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }}
                    />
                  </Box>

                  <Box display="flex" flexWrap="wrap" gap={{ xs: 1.5, sm: 3 }} color="text.secondary">
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <CalendarTodayIcon sx={{ fontSize: 14, opacity: 0.7 }} />
                      <Typography variant="caption">
                        Created At: <Box component="span" fontWeight={500} color="text.primary">{formatDate(session.created_at)}</Box>
                      </Typography>
                    </Box>
                    {session.started_at && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <PlayCircleOutlineIcon sx={{ fontSize: 14, opacity: 0.7 }} />
                        <Typography variant="caption">
                          Started At: <Box component="span" fontWeight={500} color="text.primary">{formatDate(session.started_at)}</Box>
                        </Typography>
                      </Box>
                    )}
                    {session.completed_at && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <CheckCircleOutlineIcon sx={{ fontSize: 14, opacity: 0.7 }} />
                        <Typography variant="caption">
                          Completed At: <Box component="span" fontWeight={500} color="text.primary">{formatDate(session.completed_at)}</Box>
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {session.status !== 'completed' && (
                    <Box mt={1.5} maxWidth={450}>
                      <TextField
                        value={getInterviewUrl(session)}
                        size="small"
                        fullWidth
                        slotProps={{ input: { readOnly: true } }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            fontSize: '0.8125rem',
                            height: 32,
                            '& input': { py: 0.5 }
                          },
                        }}
                      />
                    </Box>
                  )}
                </Box>

                {/* Right Side: Actions */}
                <Box flexShrink={0} display="flex" alignItems="center" gap={1.5} alignSelf={{ xs: 'flex-start', md: 'center' }}>
                  {session.status !== 'completed' && (
                    <Button
                      startIcon={<ContentCopyIcon sx={{ fontSize: '16px !important' }}/>}
                      onClick={() => handleCopyLink(session)}
                      variant="outlined"
                      size="small"
                      color="inherit"
                      sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, borderColor: 'divider' }}
                    >
                      {copiedId === session.id ? 'Copied!' : 'Copy Link'}
                    </Button>
                  )}
                  {session.status === 'completed' && (
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() =>
                        navigate(
                          `/interviews/${id}/sessions/${session.id}/results`,
                        )
                      }
                      sx={{ borderRadius: 1.5, px: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
                    >
                      View Results
                    </Button>
                  )}
                </Box>
              </Box>
            </Paper>
          ))}
        </Stack>
      </Paper>

      {/* Candidate Name Dialog */}
      <Dialog
        open={showCandidateDialog}
        onClose={() => setShowCandidateDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Generate Interview Link</DialogTitle>
        <DialogContent>
          <TextField
            label="Candidate Name"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            fullWidth
            required
            autoFocus
            sx={{ mt: 1 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && candidateName.trim()) {
                handleConfirmGenerate();
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowCandidateDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmGenerate}
            variant="contained"
            disabled={!candidateName.trim() || createSessionMutation.isPending}
          >
            {createSessionMutation.isPending ? 'Creating...' : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
