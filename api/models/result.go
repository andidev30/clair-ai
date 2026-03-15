package models

import "time"

type InterviewResult struct {
	ID             string           `json:"id" bson:"_id"`
	SessionID      string           `json:"session_id" bson:"session_id"`
	OverallScore   float64          `json:"overall_score" bson:"overall_score"`
	Recommendation string           `json:"recommendation" bson:"recommendation"` // strong_hire, hire, no_hire, strong_no_hire
	Summary        string           `json:"summary" bson:"summary"`
	Transcript     []TranscriptEntry `json:"transcript" bson:"transcript"`
	ScoreBreakdown ScoreBreakdown   `json:"score_breakdown" bson:"score_breakdown"`
	KeyMoments     []KeyMoment      `json:"key_moments" bson:"key_moments"`
	CreatedAt      time.Time        `json:"created_at" bson:"created_at"`
}

type TranscriptEntry struct {
	Speaker   string  `json:"speaker" bson:"speaker"`
	Text      string  `json:"text" bson:"text"`
	Timestamp float64 `json:"timestamp" bson:"timestamp"`
}

type ScoreBreakdown struct {
	Communication      float64 `json:"communication" bson:"communication"`
	TechnicalKnowledge float64 `json:"technical_knowledge" bson:"technical_knowledge"`
	ProblemSolving     float64 `json:"problem_solving" bson:"problem_solving"`
	CodingSkills       float64 `json:"coding_skills" bson:"coding_skills"`
}

type KeyMoment struct {
	Timestamp   float64 `json:"timestamp" bson:"timestamp"`
	Type        string  `json:"type" bson:"type"`
	Description string  `json:"description" bson:"description"`
}
