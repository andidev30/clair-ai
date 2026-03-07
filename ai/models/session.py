from pydantic import BaseModel


class InterviewConfig(BaseModel):
    id: str
    title: str
    candidate_name: str
    position: str
    level: str
    tech_stack: list[str] = []
    job_description: str = ""


class SessionConfig(BaseModel):
    id: str
    interview_id: str
    status: str
    token: str
    interview: InterviewConfig
