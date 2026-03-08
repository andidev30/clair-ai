import type {
  InterviewResult,
  Session,
  SessionWithInterview,
} from '../types';
import apiClient from './client';

export async function createSession(interviewId: string, candidateName: string): Promise<Session> {
  const { data } = await apiClient.post<Session>(
    `/api/interviews/${interviewId}/sessions`,
    { candidate_name: candidateName },
  );
  return data;
}

export async function getSessions(interviewId: string): Promise<Session[]> {
  const { data } = await apiClient.get<Session[]>(
    `/api/interviews/${interviewId}/sessions`,
  );
  return data;
}

export async function joinSession(
  token: string,
): Promise<SessionWithInterview> {
  const { data } = await apiClient.get<SessionWithInterview>(
    `/api/sessions/${token}/join`,
  );
  return data;
}

export async function getSession(id: string): Promise<Session> {
  const { data } = await apiClient.get<Session>(`/api/sessions/${id}`);
  return data;
}

export async function getSessionResult(
  sessionId: string,
): Promise<InterviewResult> {
  const { data } = await apiClient.get<InterviewResult>(
    `/api/sessions/${sessionId}/result`,
  );
  return data;
}
