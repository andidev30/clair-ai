import asyncio
import base64
import json
import logging

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

import config
from interview_agent import create_interview_agent
from interview_agent.tools import (
    set_session_state, get_session_state_by_token,
    set_active_token, remove_session_state,
)
from services.webhook import post_result

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Clair AI - Interview Service")

APP_NAME = "clair-ai"
session_service = InMemorySessionService()

# Cache of runners per interview config (keyed by session token)
_runners: dict[str, Runner] = {}


async def fetch_session_config(session_token: str) -> dict | None:
    url = f"{config.GOLANG_BACKEND_URL}/api/sessions/{session_token}/join"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
            if resp.status_code == 200:
                return resp.json()
            logger.error(f"Failed to fetch session: {resp.status_code}")
            return None
    except Exception as e:
        logger.error(f"Error fetching session config: {e}")
        return None


def get_or_create_runner(session_token: str, interview_config: dict) -> Runner:
    if session_token not in _runners:
        agent = create_interview_agent(interview_config)
        _runners[session_token] = Runner(
            app_name=APP_NAME,
            agent=agent,
            session_service=session_service,
        )
    return _runners[session_token]


@app.get("/health")
async def health():
    return {"status": "ok", "service": "clair-ai"}


@app.websocket("/ws/interview/{session_token}")
async def interview_ws(websocket: WebSocket, session_token: str):
    await websocket.accept()
    logger.info(f"WebSocket connected: {session_token}")

    # Fetch session config from Golang backend
    session_data = await fetch_session_config(session_token)
    if not session_data:
        await websocket.send_text(json.dumps({"type": "error", "message": "Invalid session"}))
        await websocket.close()
        return

    interview_config = session_data.get("interview", {})
    session_id = session_data.get("id", session_token)

    # Set up per-session state for tools (keyed by token)
    set_session_state(session_token, {
        "websocket": websocket,
        "session_id": session_id,
        "interview_config": interview_config,
        "latest_screen_observation": "",
        "interview_ended": False,
        "transcript": [],
    })
    set_active_token(session_token)

    # Create runner and ADK session
    runner = get_or_create_runner(session_token, interview_config)
    user_id = f"candidate_{session_token}"
    adk_session_id = f"session_{session_token}"

    session = await session_service.get_session(
        app_name=APP_NAME, user_id=user_id, session_id=adk_session_id
    )
    if not session:
        await session_service.create_session(
            app_name=APP_NAME, user_id=user_id, session_id=adk_session_id
        )

    live_request_queue = LiveRequestQueue()

    # Gate to pause audio streaming during agent transitions.
    # When cleared, upstream_task will drop audio frames to avoid
    # the 1008 policy violation race condition with native audio models.
    audio_gate = asyncio.Event()
    audio_gate.set()  # Start with audio flowing

    run_config = RunConfig(
        streaming_mode=StreamingMode.BIDI,
        response_modalities=["AUDIO"],
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        session_resumption=types.SessionResumptionConfig(),
        context_window_compression=types.ContextWindowCompressionConfig(
            trigger_tokens=100000,
            sliding_window=types.SlidingWindow(target_tokens=80000),
        ),
    )

    # Send ready signal to client
    await websocket.send_text(json.dumps({
        "type": "session_ready",
        "session_id": session_id,
        "interview": interview_config,
    }))

    async def upstream_task():
        """Receive from WebSocket, send to LiveRequestQueue."""
        try:
            # Wait for run_live to start, then trigger AI to greet first
            await asyncio.sleep(2)
            initial_greeting = types.Content(
                parts=[types.Part(text="The candidate has just joined the interview. Please greet them and start the warm-up.")]
            )
            live_request_queue.send_content(initial_greeting)

            while True:
                message = await websocket.receive()

                if "bytes" in message:
                    # Raw audio data from client mic
                    # Drop audio frames during agent transitions to prevent
                    # 1008 policy violation race condition
                    if not audio_gate.is_set():
                        continue
                    audio_blob = types.Blob(
                        mime_type="audio/pcm;rate=16000",
                        data=message["bytes"],
                    )
                    live_request_queue.send_realtime(audio_blob)

                elif "text" in message:
                    text_data = message["text"]
                    try:
                        msg = json.loads(text_data)
                        msg_type = msg.get("type", "")

                        if msg_type == "text":
                            # Text message from candidate
                            content = types.Content(
                                parts=[types.Part(text=msg["text"])]
                            )
                            live_request_queue.send_content(content)

                        elif msg_type == "screen_frame":
                            # Screen capture frame (base64 JPEG)
                            image_data = base64.b64decode(msg["data"])
                            image_blob = types.Blob(
                                mime_type=msg.get("mimeType", "image/jpeg"),
                                data=image_data,
                            )
                            live_request_queue.send_realtime(image_blob)
                            # Store for observe_screen tool
                            state = get_session_state_by_token(session_token)
                            state["latest_screen_observation"] = (
                                "Screen frame received - candidate's code editor is visible"
                            )

                        elif msg_type == "end_interview":
                            # Candidate manually ended the interview
                            content = types.Content(
                                parts=[types.Part(text="The candidate has ended the interview. Please wrap up and generate the final evaluation.")]
                            )
                            live_request_queue.send_content(content)

                    except json.JSONDecodeError:
                        # Plain text message
                        content = types.Content(
                            parts=[types.Part(text=text_data)]
                        )
                        live_request_queue.send_content(content)

        except WebSocketDisconnect:
            logger.info(f"Client disconnected: {session_token}")
        except Exception as e:
            logger.error(f"Upstream error: {e}")

    async def downstream_task():
        """Receive events from run_live(), send to WebSocket."""
        try:
            async for event in runner.run_live(
                user_id=user_id,
                session_id=adk_session_id,
                live_request_queue=live_request_queue,
                run_config=run_config,
            ):
                # Detect agent transfer events and gate audio during transitions
                if (
                    event.content
                    and event.content.parts
                    and any(
                        p.function_response and p.function_response.name == "transfer_to_agent"
                        for p in event.content.parts
                    )
                ):
                    logger.info("Agent transfer detected, pausing audio stream")
                    audio_gate.clear()

                    async def _reopen_gate():
                        await asyncio.sleep(3)  # Wait for new agent to connect
                        audio_gate.set()
                        logger.info("Audio stream resumed after agent transfer")

                    asyncio.create_task(_reopen_gate())

                # Extract audio from content parts and send explicitly
                # (model_dump_json may not encode bytes in a way atob() can decode)
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if part.inline_data and part.inline_data.data:
                            audio_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                            await websocket.send_text(json.dumps({
                                "type": "agent.audio",
                                "data": audio_b64,
                            }))

                # Forward all events as JSON to the client (for transcriptions etc.)
                event_json = event.model_dump_json(exclude_none=True, by_alias=True)
                await websocket.send_text(event_json)

                # Track transcription for result posting
                state = get_session_state_by_token(session_token)

                if event.input_transcription and event.input_transcription.text:
                    if getattr(event.input_transcription, "finished", False):
                        state.setdefault("transcript", []).append({
                            "speaker": "candidate",
                            "text": event.input_transcription.text,
                        })

                if event.output_transcription and event.output_transcription.text:
                    if getattr(event.output_transcription, "finished", False):
                        state.setdefault("transcript", []).append({
                            "speaker": "clair",
                            "text": event.output_transcription.text,
                        })

                # Check if interview ended (scorer called end_interview tool)
                if state.get("interview_ended"):
                    # Build result from scorer agent's actual scores
                    transcript = state.get("transcript", [])
                    scores = state.get("scores", {})
                    result_data = {
                        "overall_score": scores.get("overall_score", 0),
                        "recommendation": scores.get("recommendation", "no_hire"),
                        "summary": scores.get("summary", "Interview completed."),
                        "transcript": [
                            {"speaker": t["speaker"], "text": t["text"], "timestamp": float(i)}
                            for i, t in enumerate(transcript)
                        ],
                        "score_breakdown": scores.get("score_breakdown", {
                            "communication": 0,
                            "technical_knowledge": 0,
                            "problem_solving": 0,
                            "coding_skills": 0,
                            "system_design": 0,
                        }),
                        "key_moments": [],
                    }
                    await post_result(session_id, result_data)
                    await websocket.send_text(json.dumps({
                        "type": "interview_complete",
                        "message": "Interview has been completed. Results are being processed.",
                    }))
                    break

        except WebSocketDisconnect:
            logger.info(f"Client disconnected during downstream: {session_token}")
        except Exception as e:
            logger.error(f"Downstream error: {e}", exc_info=True)

    try:
        await asyncio.gather(
            upstream_task(),
            downstream_task(),
            return_exceptions=True,
        )
    except Exception as e:
        logger.error(f"Session error: {e}", exc_info=True)
    finally:
        live_request_queue.close()
        # Clean up runner cache and per-session state
        _runners.pop(session_token, None)
        remove_session_state(session_token)
        logger.info(f"Session ended: {session_token}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=config.PORT)
