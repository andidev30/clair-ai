package models

import "time"

type Interview struct {
	ID            string    `json:"id" bson:"_id"`
	UserID        string    `json:"user_id" bson:"user_id"`
	Title         string    `json:"title" bson:"title"`
	CandidateName string    `json:"candidate_name" bson:"candidate_name"`
	Position      string    `json:"position" bson:"position"`
	Level          string    `json:"level" bson:"level"`
	TechStack      []string  `json:"tech_stack" bson:"tech_stack"`
	JobDescription string    `json:"job_description" bson:"job_description"`
	CreatedAt      time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" bson:"updated_at"`
}

type CreateInterviewInput struct {
	Title          string   `json:"title"`
	CandidateName  string   `json:"candidate_name"`
	Position       string   `json:"position"`
	Level          string   `json:"level"`
	TechStack      []string `json:"tech_stack"`
	JobDescription string   `json:"job_description"`
}

type UpdateInterviewInput struct {
	Title          *string  `json:"title"`
	CandidateName  *string  `json:"candidate_name"`
	Position       *string  `json:"position"`
	Level          *string  `json:"level"`
	TechStack      []string `json:"tech_stack"`
	JobDescription *string  `json:"job_description"`
}
