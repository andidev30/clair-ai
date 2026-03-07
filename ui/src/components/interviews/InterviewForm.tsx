import { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
} from '@mui/material';
import { InterviewLevel, type Interview, type CreateInterviewInput } from '../../types';

interface InterviewFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInterviewInput) => void;
  interview?: Interview | null;
  isSubmitting: boolean;
}

export default function InterviewForm({
  open,
  onClose,
  onSubmit,
  interview,
  isSubmitting,
}: InterviewFormProps) {
  const [title, setTitle] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [position, setPosition] = useState('');
  const [level, setLevel] = useState<string>('junior');
  const [techStack, setTechStack] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  useEffect(() => {
    if (interview) {
      setTitle(interview.title);
      setCandidateName(interview.candidate_name);
      setPosition(interview.position);
      setLevel(interview.level);
      setTechStack(interview.tech_stack?.join(', ') ?? '');
      setJobDescription(interview.job_description ?? '');
    } else {
      setTitle('');
      setCandidateName('');
      setPosition('');
      setLevel('junior');
      setTechStack('');
      setJobDescription('');
    }
  }, [interview, open]);

  const handleSubmit = () => {
    onSubmit({
      title,
      candidate_name: candidateName,
      position,
      level: level as CreateInterviewInput['level'],
      tech_stack: techStack
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      job_description: jobDescription,
    });
  };

  const isEdit = !!interview;
  const isValid = title.trim() && candidateName.trim() && position.trim();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Interview' : 'New Interview'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Candidate Name"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              fullWidth
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              fullWidth
              required
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              fullWidth
              select
            >
              <MenuItem value={InterviewLevel.JUNIOR}>Junior</MenuItem>
              <MenuItem value={InterviewLevel.MIDDLE}>Middle</MenuItem>
              <MenuItem value={InterviewLevel.SENIOR}>Senior</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Tech Stack"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              fullWidth
              placeholder="React, Node.js, PostgreSQL"
              helperText="Comma-separated list of technologies"
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Job Description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Describe the role and expectations..."
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting || !isValid}
        >
          {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
