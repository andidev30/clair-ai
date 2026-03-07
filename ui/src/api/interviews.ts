import type {
  CreateInterviewInput,
  Interview,
  UpdateInterviewInput,
} from '../types';
import apiClient from './client';

export async function getInterviews(): Promise<Interview[]> {
  const { data } = await apiClient.get<Interview[]>('/api/interviews');
  return data;
}

export async function getInterview(id: string): Promise<Interview> {
  const { data } = await apiClient.get<Interview>(`/api/interviews/${id}`);
  return data;
}

export async function createInterview(
  input: CreateInterviewInput,
): Promise<Interview> {
  const { data } = await apiClient.post<Interview>('/api/interviews', input);
  return data;
}

export async function updateInterview(
  id: string,
  input: UpdateInterviewInput,
): Promise<Interview> {
  const { data } = await apiClient.put<Interview>(
    `/api/interviews/${id}`,
    input,
  );
  return data;
}

export async function deleteInterview(id: string): Promise<void> {
  await apiClient.delete(`/api/interviews/${id}`);
}
