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
  const [copied, setCopied] = useState(false);
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

  const handleCopyLink = (session: Session) => {
    navigator.clipboard.writeText(getInterviewUrl(session));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

        <Stack spacing={2}>
          {sessions?.map((session) => (
            <Paper key={session.id} variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Typography variant="body2" fontWeight={600}>
                      {session.candidate_name}
                    </Typography>
                    <Chip
                      label={session.status}
                      size="small"
                      color={
                        session.status === 'completed'
                          ? 'success'
                          : session.status === 'in_progress'
                            ? 'warning'
                            : 'default'
                      }
                    />
                  </Box>
                  <TextField
                    value={getInterviewUrl(session)}
                    size="small"
                    fullWidth
                    slotProps={{ input: { readOnly: true } }}
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Stack direction="row" spacing={1} ml={2}>
                  <Button
                    startIcon={<ContentCopyIcon />}
                    onClick={() => handleCopyLink(session)}
                    size="small"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  {session.status === 'completed' && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() =>
                        navigate(
                          `/interviews/${id}/sessions/${session.id}/results`,
                        )
                      }
                    >
                      View Results
                    </Button>
                  )}
                </Stack>
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
