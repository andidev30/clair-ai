import { Box, Button, Card, CardContent, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import WorkIcon from '@mui/icons-material/Work';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router';
import type { Interview, InterviewLevelType } from '../../types';

const levelConfig: Record<InterviewLevelType, { label: string; color: 'success' | 'warning' | 'error' }> = {
  junior: { label: 'Junior', color: 'success' },
  middle: { label: 'Middle', color: 'warning' },
  senior: { label: 'Senior', color: 'error' },
};

interface InterviewCardProps {
  interview: Interview;
  onEdit: (interview: Interview) => void;
  onDelete: (interview: Interview) => void;
}

export default function InterviewCard({ interview, onEdit, onDelete }: InterviewCardProps) {
  const navigate = useNavigate();
  const level = levelConfig[interview.level] ?? { label: interview.level, color: 'default' as const };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Typography variant="h6" fontWeight={600} sx={{ flex: 1, mr: 1 }}>
            {interview.title}
          </Typography>
          <Chip label={level.label} color={level.color} size="small" />
        </Box>

        <Stack spacing={0.75}>
          <Box display="flex" alignItems="center" gap={1}>
            <WorkIcon fontSize="small" color="action" />
            <Typography variant="body2">{interview.position}</Typography>
          </Box>
        </Stack>
      </CardContent>

      <Box display="flex" justifyContent="space-between" alignItems="center" px={1} pb={1}>
        <Button
          size="small"
          startIcon={<VisibilityIcon />}
          onClick={() => navigate(`/interviews/${interview.id}`)}
        >
          Details
        </Button>
        <Box>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onEdit(interview)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => onDelete(interview)} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Card>
  );
}
