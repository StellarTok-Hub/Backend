import asyncio
import json

from sqlalchemy.dialects.postgresql import insert as pg_insert
from stellar_sdk import ServerAsync
from stellar_sdk.client.aiohttp_client import AiohttpClient

from app.core.config import settings
from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal
from app.models.stream_cursor import StreamCursor
from app.models.tip_event import TipEvent
from app.services.redis_client import publish_tip_event

logger = get_logger(__name__)

STREAM_NAME = "stellar_payments"


def extract_tip(payment: dict) -> dict:
    return {
        "stellar_tx_hash": payment["transaction_hash"],
        "source_account": payment["from"],
        "destination_account": payment["to"],
        "asset_code": payment.get("asset_code", "XLM"),
        "amount": float(payment["amount"]),
    }


def cursor_upsert_stmt(cursor: str):
    return (
        pg_insert(StreamCursor)
        .values(stream_name=STREAM_NAME, cursor=cursor)
        .on_conflict_do_update(index_elements=["stream_name"], set_={"cursor": cursor})
    )


class StellarTipListener:
    """
    Streams payment operations for the watched Stellar account and treats
    each incoming payment as a "live tip" event: persists it and publishes
    it to Redis for the gateway's SSE fan-out.

    The Horizon paging token is persisted alongside each tip in the same
    transaction, so a restart resumes from the last-processed event instead
    of starting from "now" and silently losing whatever arrived while the
    service was down.

    Runs as a background task started on FastAPI startup. Reconnects with
    backoff on stream errors, which the Horizon streaming client raises as
    plain exceptions rather than a typed error hierarchy.
    """

    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._stop_event = asyncio.Event()

    def start(self) -> None:
        if not settings.stellar_watched_account:
            logger.warning("stellar_listener.skipped", reason="no watched account configured")
            return

        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        self._stop_event.set()
        if self._task:
            await asyncio.wait([self._task], timeout=5)

    async def _load_cursor(self) -> str:
        async with AsyncSessionLocal() as session:
            row = await session.get(StreamCursor, STREAM_NAME)
            return row.cursor if row else "now"

    async def _run(self) -> None:
        backoff_seconds = 1
        cursor = await self._load_cursor()

        while not self._stop_event.is_set():
            try:
                async with ServerAsync(
                    horizon_url=settings.stellar_horizon_url, client=AiohttpClient()
                ) as server:
                    logger.info(
                        "stellar_listener.connected",
                        account=settings.stellar_watched_account,
                        cursor=cursor,
                    )
                    backoff_seconds = 1

                    payments = (
                        server.payments()
                        .for_account(settings.stellar_watched_account)
                        .cursor(cursor)
                    )
                    async for payment in payments.stream():
                        if self._stop_event.is_set():
                            break
                        cursor = await self._handle_payment(payment)
            except Exception:  # noqa: BLE001 - stream errors are untyped, must retry
                logger.exception("stellar_listener.error", backoff_seconds=backoff_seconds)
                await asyncio.sleep(backoff_seconds)
                backoff_seconds = min(backoff_seconds * 2, 60)

    async def _handle_payment(self, payment: dict) -> str:
        cursor = payment["paging_token"]

        if payment.get("type") != "payment":
            # Not a tip, but the cursor must still advance past it or every
            # reconnect would re-fetch and re-skip it forever.
            async with AsyncSessionLocal() as session:
                await session.execute(cursor_upsert_stmt(cursor))
                await session.commit()
            return cursor

        tip = extract_tip(payment)

        async with AsyncSessionLocal() as session:
            tip_stmt = (
                pg_insert(TipEvent)
                .values(**tip)
                .on_conflict_do_nothing(index_elements=["stellar_tx_hash"])
            )
            await session.execute(tip_stmt)
            await session.execute(cursor_upsert_stmt(cursor))
            await session.commit()

        await publish_tip_event(json.dumps(tip))
        logger.info("stellar_listener.tip_received", **tip, cursor=cursor)

        return cursor


stellar_tip_listener = StellarTipListener()
