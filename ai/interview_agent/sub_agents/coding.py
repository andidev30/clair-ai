from google.adk.agents import Agent

from interview_agent.prompts import CODING_PROMPT
from interview_agent.tools import (
    change_stage_tool,
    send_coding_challenge_tool,
    observe_screen_tool,
)


def create_coding_agent(model, interview_config: dict) -> Agent:
    instruction = CODING_PROMPT.format(
        position=interview_config.get("position", "Software Engineer"),
        level=interview_config.get("level", "junior"),
        tech_stack=", ".join(interview_config.get("tech_stack", [])) or "General",
    )

    return Agent(
        name="coding_agent",
        model=model,
        instruction=instruction,
        description="Handles the coding challenge stage. Presents problems and observes the candidate coding.",
        tools=[change_stage_tool, send_coding_challenge_tool, observe_screen_tool],
    )
