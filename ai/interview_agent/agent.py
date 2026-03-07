import os

from google.adk.agents import Agent
from google.adk.models.google_llm import Gemini
from google.genai import types

from interview_agent.prompts import CLAIR_SYSTEM_PROMPT
from interview_agent.sub_agents.warmup import create_warmup_agent
from interview_agent.sub_agents.coding import create_coding_agent
from interview_agent.sub_agents.scorer import create_scorer_agent

MODEL = os.getenv("AGENT_MODEL", "gemini-2.5-flash-preview-native-audio-dialog")


def create_interview_agent(interview_config: dict | None = None) -> Agent:
    if interview_config is None:
        interview_config = {}

    custom_llm = Gemini(
        model=MODEL,
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name="Kore"
                )
            ),
            language_code="en-US",
        ),
    )

    warmup = create_warmup_agent(custom_llm, interview_config)
    coding = create_coding_agent(custom_llm, interview_config)
    scorer = create_scorer_agent(custom_llm, interview_config)

    job_desc = interview_config.get("job_description", "")
    context_section = f"""
## Interview Configuration
- Candidate: {interview_config.get('candidate_name', 'the candidate')}
- Position: {interview_config.get('position', 'Software Engineer')}
- Level: {interview_config.get('level', 'junior')}
- Tech Stack: {', '.join(interview_config.get('tech_stack', [])) or 'General'}
{'- Job Description: ' + job_desc if job_desc else ''}
"""

    return Agent(
        name="clair_interviewer",
        model=custom_llm,
        instruction=CLAIR_SYSTEM_PROMPT + context_section,
        description="Clair - AI Technical Interviewer. Orchestrates the full interview flow.",
        sub_agents=[warmup, coding, scorer],
    )
