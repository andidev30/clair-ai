export const InterviewLevel = {
  JUNIOR: 'junior',
  MIDDLE: 'middle',
  SENIOR: 'senior',
} as const;

export type InterviewLevelType =
  (typeof InterviewLevel)[keyof typeof InterviewLevel];

export interface User {
  id: string;
  email: string;
  fullname: string;
  picture: string;
}

export interface Interview {
  id: string;
  user_id: string;
  title: string;
  candidate_name: string;
  position: string;
  level: InterviewLevelType;
  tech_stack: string[];
  job_description: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInterviewInput {
  title: string;
  position: string;
  level: InterviewLevelType;
  tech_stack: string[];
  job_description: string;
}

export interface UpdateInterviewInput {
  title?: string;
  position?: string;
  level?: InterviewLevelType;
  tech_stack?: string[];
  job_description?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Session {
  id: string;
  interview_id: string;
  candidate_name: string;
  status: 'pending' | 'in_progress' | 'completed';
  token: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SessionWithInterview extends Session {
  interview: Interview;
}

export interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: number;
}

export interface ScoreBreakdown {
  communication: number;
  technical_knowledge: number;
  problem_solving: number;
  coding_skills: number;
}

export interface KeyMoment {
  timestamp: number;
  type: string;
  description: string;
}

export interface InterviewResult {
  id: string;
  session_id: string;
  overall_score: number;
  recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
  summary: string;
  transcript: TranscriptEntry[];
  score_breakdown: ScoreBreakdown;
  key_moments: KeyMoment[];
  created_at: string;
}
