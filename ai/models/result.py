from pydantic import BaseModel


class TranscriptEntry(BaseModel):
    speaker: str
    text: str
    timestamp: float


class ScoreBreakdown(BaseModel):
    communication: float
    technical_knowledge: float
    problem_solving: float
    coding_skills: float


class KeyMoment(BaseModel):
    timestamp: float
    type: str
    description: str


class InterviewResult(BaseModel):
    overall_score: float
    recommendation: str  # strong_hire, hire, no_hire, strong_no_hire
    summary: str
    transcript: list[TranscriptEntry] = []
    score_breakdown: ScoreBreakdown
    key_moments: list[KeyMoment] = []
