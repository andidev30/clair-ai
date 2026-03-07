import logging

import httpx

from config import GOLANG_BACKEND_URL, INTERNAL_API_KEY

logger = logging.getLogger(__name__)


async def post_result(session_id: str, result: dict) -> bool:
    url = f"{GOLANG_BACKEND_URL}/internal/sessions/{session_id}/result"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                json=result,
                headers={"X-API-Key": INTERNAL_API_KEY},
                timeout=30.0,
            )
            if resp.status_code == 201:
                logger.info(f"Result posted for session {session_id}")
                return True
            else:
                logger.error(f"Webhook failed: {resp.status_code} {resp.text}")
                return False
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return False
