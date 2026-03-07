from google.adk.agents import Agent

from interview_agent.prompts import WARMUP_PROMPT
from interview_agent.tools import change_stage_tool


def create_warmup_agent(model, interview_config: dict) -> Agent:
    instruction = WARMUP_PROMPT.format(
        position=interview_config.get("position", "Software Engineer"),
        level=interview_config.get("level", "junior"),
        tech_stack=", ".join(interview_config.get("tech_stack", [])) or "General",
    )

    return Agent(
        name="warmup_agent",
        model=model,
        instruction=instruction,
        description="Handles the warm-up and introduction stage of the interview. Asks about background and experience.",
        tools=[change_stage_tool],
    )
