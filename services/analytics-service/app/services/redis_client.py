from functools import lru_cache

from redis.asyncio import Redis, from_url

from app.core.config import settings


@lru_cache
def get_redis() -> Redis:
    return from_url(settings.redis_url, decode_responses=True)


async def publish_tip_event(payload_json: str) -> None:
    redis = get_redis()
    await redis.publish(settings.tip_events_channel, payload_json)
