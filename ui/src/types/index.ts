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
  created_at: string;
  updated_at: string;
}

export interface CreateInterviewInput {
  title: string;
  candidate_name: string;
  position: string;
  level: InterviewLevelType;
}

export interface UpdateInterviewInput {
  title?: string;
  candidate_name?: string;
  position?: string;
  level?: InterviewLevelType;
}

export interface LoginResponse {
  token: string;
  user: User;
}
