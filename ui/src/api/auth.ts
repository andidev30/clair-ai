import type { LoginResponse } from '../types';
import apiClient from './client';

export async function googleLogin(credential: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/api/auth/google', {
    credential,
  });
  return data;
}

export async function refreshToken(): Promise<LoginResponse> {
  const { data } = await apiClient.get<LoginResponse>('/api/auth/refresh');
  return data;
}
