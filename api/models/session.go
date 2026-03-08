package models

import "time"

type Session struct {
	ID            string     `json:"id" bson:"_id"`
	InterviewID   string     `json:"interview_id" bson:"interview_id"`
	CandidateName string     `json:"candidate_name" bson:"candidate_name"`
	Status        string     `json:"status" bson:"status"` // pending, in_progress, completed
	Token         string     `json:"token" bson:"token"`
	StartedAt     *time.Time `json:"started_at,omitempty" bson:"started_at,omitempty"`
	CompletedAt   *time.Time `json:"completed_at,omitempty" bson:"completed_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at" bson:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" bson:"updated_at"`
}

type CreateSessionInput struct {
	CandidateName string `json:"candidate_name"`
}

type SessionWithInterview struct {
	Session   `json:",inline"`
	Interview Interview `json:"interview"`
}
