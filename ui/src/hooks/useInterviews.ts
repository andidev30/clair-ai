import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInterview,
  deleteInterview,
  getInterviews,
  updateInterview,
} from '../api/interviews';
import type { CreateInterviewInput, UpdateInterviewInput } from '../types';

export function useInterviews() {
  return useQuery({
    queryKey: ['interviews'],
    queryFn: getInterviews,
  });
}

export function useCreateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInterviewInput) => createInterview(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['interviews'] }),
  });
}

export function useUpdateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInterviewInput }) =>
      updateInterview(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['interviews'] }),
  });
}

export function useDeleteInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInterview(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['interviews'] }),
  });
}
