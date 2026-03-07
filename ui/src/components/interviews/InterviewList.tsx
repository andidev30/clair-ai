import { Grid, Typography } from '@mui/material';
import type { Interview } from '../../types';
import InterviewCard from './InterviewCard';

interface InterviewListProps {
  interviews: Interview[];
  onEdit: (interview: Interview) => void;
  onDelete: (interview: Interview) => void;
}

export default function InterviewList({
  interviews,
  onEdit,
  onDelete,
}: InterviewListProps) {
  if (interviews.length === 0) {
    return (
      <Typography
        variant="body1"
        color="text.secondary"
        textAlign="center"
        py={8}
      >
        No interviews yet. Click "New Interview" to create one.
      </Typography>
    );
  }

  return (
    <Grid container spacing={2}>
      {interviews.map((interview) => (
        <Grid key={interview.id} size={{ xs: 12, sm: 6, md: 4 }}>
          <InterviewCard
            interview={interview}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </Grid>
      ))}
    </Grid>
  );
}
