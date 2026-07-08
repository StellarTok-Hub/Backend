import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.stellar_listener import StellarTipListener, extract_tip


class FakeSessionContext:
    def __init__(self, session):
        self._session = session

    async def __aenter__(self):
        return self._session

    async def __aexit__(self, *exc_info):
        return False


def _make_session():
    session = MagicMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.get = AsyncMock()
    return session


def test_extract_tip_maps_payment_fields():
    payment = {
        "transaction_hash": "abc123",
        "from": "GSOURCE",
        "to": "GDEST",
        "asset_code": "XLM",
        "amount": "12.5000000",
    }

    assert extract_tip(payment) == {
        "stellar_tx_hash": "abc123",
        "source_account": "GSOURCE",
        "destination_account": "GDEST",
        "asset_code": "XLM",
        "amount": 12.5,
    }


def test_extract_tip_defaults_asset_code_to_xlm():
    payment = {
        "transaction_hash": "abc123",
        "from": "GSOURCE",
        "to": "GDEST",
        "amount": "1",
    }

    assert extract_tip(payment)["asset_code"] == "XLM"


@pytest.mark.asyncio
async def test_handle_payment_persists_tip_and_cursor_then_publishes(monkeypatch):
    session = _make_session()
    monkeypatch.setattr(
        "app.services.stellar_listener.AsyncSessionLocal", lambda: FakeSessionContext(session)
    )
    publish_mock = AsyncMock()
    monkeypatch.setattr("app.services.stellar_listener.publish_tip_event", publish_mock)

    listener = StellarTipListener()
    payment = {
        "type": "payment",
        "transaction_hash": "abc123",
        "from": "GSOURCE",
        "to": "GDEST",
        "asset_code": "XLM",
        "amount": "5",
        "paging_token": "111-0",
    }

    cursor = await listener._handle_payment(payment)

    assert cursor == "111-0"
    assert session.execute.await_count == 2  # tip insert + cursor upsert
    session.commit.assert_awaited_once()
    publish_mock.assert_awaited_once()
    published_payload = json.loads(publish_mock.await_args.args[0])
    assert published_payload["stellar_tx_hash"] == "abc123"


@pytest.mark.asyncio
async def test_handle_payment_advances_cursor_without_publishing_for_non_payment(monkeypatch):
    session = _make_session()
    monkeypatch.setattr(
        "app.services.stellar_listener.AsyncSessionLocal", lambda: FakeSessionContext(session)
    )
    publish_mock = AsyncMock()
    monkeypatch.setattr("app.services.stellar_listener.publish_tip_event", publish_mock)

    listener = StellarTipListener()
    payment = {"type": "create_account", "paging_token": "222-0"}

    cursor = await listener._handle_payment(payment)

    assert cursor == "222-0"
    session.execute.assert_awaited_once()  # cursor upsert only, no tip insert
    publish_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_load_cursor_defaults_to_now_when_no_row(monkeypatch):
    session = _make_session()
    session.get.return_value = None
    monkeypatch.setattr(
        "app.services.stellar_listener.AsyncSessionLocal", lambda: FakeSessionContext(session)
    )

    cursor = await StellarTipListener()._load_cursor()

    assert cursor == "now"


@pytest.mark.asyncio
async def test_load_cursor_resumes_from_persisted_value(monkeypatch):
    session = _make_session()
    session.get.return_value = MagicMock(cursor="333-0")
    monkeypatch.setattr(
        "app.services.stellar_listener.AsyncSessionLocal", lambda: FakeSessionContext(session)
    )

    cursor = await StellarTipListener()._load_cursor()

    assert cursor == "333-0"
