import asyncio
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services import stream_gate
from services.stream_gate import QueueTimeoutError, StreamGate, wait_turn_events


def test_stream_gate_queues_beyond_limit_and_grants_fifo():
    """Semaphore queueing: with limit 3, requests 4 and 5 must queue with
    correct positions, receive slots in FIFO order as earlier ones release,
    and every request must eventually run."""

    async def scenario() -> None:
        gate = StreamGate(3)

        # First three acquire immediately.
        assert gate.try_acquire()
        assert gate.try_acquire()
        assert gate.try_acquire()
        assert gate.active == 3
        # Fourth cannot.
        assert not gate.try_acquire()

        finish_order: list[str] = []
        first_positions: dict[str, int] = {}

        async def queued_client(name: str) -> None:
            async for position in wait_turn_events(
                gate, timeout_seconds=5.0, poll_seconds=0.05
            ):
                first_positions.setdefault(name, position)
            # Generator completed normally -> slot granted.
            finish_order.append(name)

        waiter_a = asyncio.create_task(queued_client("a"))
        await asyncio.sleep(0.01)  # ensure FIFO join order a -> b
        waiter_b = asyncio.create_task(queued_client("b"))
        await asyncio.sleep(0.05)

        assert gate.waiting == 2
        assert first_positions == {"a": 1, "b": 2}

        gate.release()  # frees one slot -> goes to "a"
        await asyncio.wait_for(waiter_a, timeout=1.0)
        assert finish_order == ["a"]
        assert gate.active == 3  # slot handed over, still saturated
        assert gate.waiting == 1

        gate.release()  # -> "b"
        await asyncio.wait_for(waiter_b, timeout=1.0)
        assert finish_order == ["a", "b"]
        assert gate.active == 3
        assert gate.waiting == 0

        # All holders release; gate returns to idle.
        gate.release()
        gate.release()
        gate.release()
        assert gate.active == 0
        assert gate.try_acquire()

    asyncio.run(scenario())


def test_stream_gate_queue_timeout_frees_ticket():
    async def scenario() -> None:
        gate = StreamGate(1)
        assert gate.try_acquire()

        positions: list[int] = []
        with pytest.raises(QueueTimeoutError):
            async for position in wait_turn_events(
                gate, timeout_seconds=0.15, poll_seconds=0.05
            ):
                positions.append(position)

        # At least the initial queued notice was emitted, and the abandoned
        # ticket does not linger in the queue.
        assert positions and positions[0] == 1
        assert gate.waiting == 0

        # Releasing afterwards must not leak the abandoned ticket's slot.
        gate.release()
        assert gate.active == 0
        assert gate.try_acquire()

    asyncio.run(scenario())


def test_stream_gate_abandoned_waiter_returns_granted_slot():
    """Client disconnect while queued (generator closed early) must not leak
    a slot, even when the grant races the disconnect."""

    async def scenario() -> None:
        gate = StreamGate(1)
        assert gate.try_acquire()

        agen = wait_turn_events(gate, timeout_seconds=5.0, poll_seconds=0.05)
        assert await agen.__anext__() == 1  # joined the queue
        assert gate.waiting == 1

        # Holder releases -> ticket is granted while the waiter is suspended.
        gate.release()
        assert gate.active == 1
        # Waiter goes away without consuming the grant (client disconnect).
        await agen.aclose()
        assert gate.active == 0
        assert gate.try_acquire()

    asyncio.run(scenario())


def test_default_gates_follow_config():
    import config

    assert stream_gate.FIT_STREAM_GATE.limit == config.FIT_MAX_CONCURRENCY
    assert stream_gate.PHOTOMETRY_STREAM_GATE.limit == config.PHOTOMETRY_MAX_CONCURRENCY
    assert config.FIT_MAX_CONCURRENCY == 3
    assert config.PHOTOMETRY_MAX_CONCURRENCY == 8
