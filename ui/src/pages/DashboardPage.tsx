import { useState } from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  useInterviews,
  useCreateInterview,
  useUpdateInterview,
  useDeleteInterview,
} from '../hooks/useInterviews';
import type { CreateInterviewInput, Interview } from '../types';
import InterviewList from '../components/interviews/InterviewList';
import InterviewForm from '../components/interviews/InterviewForm';
import InterviewDeleteDialog from '../components/interviews/InterviewDeleteDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';

export default function DashboardPage() {
  const { data: interviews, isLoading, error } = useInterviews();
  const createMutation = useCreateInterview();
  const updateMutation = useUpdateInterview();
  const deleteMutation = useDeleteInterview();

  const [formOpen, setFormOpen] = useState(false);
  const [editInterview, setEditInterview] = useState<Interview | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Interview | null>(null);

  const handleCreate = () => {
    setEditInterview(null);
    setFormOpen(true);
  };

  const handleEdit = (interview: Interview) => {
    setEditInterview(interview);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: CreateInterviewInput) => {
    if (editInterview) {
      updateMutation.mutate(
        { id: editInterview.id, data },
        { onSuccess: () => setFormOpen(false) },
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => setFormOpen(false) });
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, {
        onSuccess: () => setDeleteTarget(null),
      });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, flexGrow: 1 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" fontWeight={700}>
          Interviews
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          New Interview
        </Button>
      </Box>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorAlert message="Failed to load interviews." />}
      {interviews && (
        <InterviewList
          interviews={interviews}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
        />
      )}

      <InterviewForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        interview={editInterview}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <InterviewDeleteDialog
        interview={deleteTarget}
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />
    </Container>
  );
}
