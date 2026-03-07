from google.adk.agents import Agent

from interview_agent.prompts import SCORING_PROMPT
from interview_agent.tools import change_stage_tool, end_interview_tool


def create_scorer_agent(model, interview_config: dict) -> Agent:
    instruction = SCORING_PROMPT.format(
        position=interview_config.get("position", "Software Engineer"),
        level=interview_config.get("level", "junior"),
        tech_stack=", ".join(interview_config.get("tech_stack", [])) or "General",
    )

    return Agent(
        name="scorer_agent",
        model=model,
        instruction=instruction,
        description="Wraps up the interview and generates the final evaluation score report.",
        tools=[change_stage_tool, end_interview_tool],
    )
