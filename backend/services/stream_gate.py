"""Global concurrency gates for CPU-bound NDJSON stream endpoints.

Rationale (docs/LOAD_TEST_2026-07.md, 2026-07-14 load test): 12+ concurrent
emcee MCMC fits killed the 512 MB Render free instance (502, all in-flight
streams cut), and the per-IP rate limiter is defeated behind the Render proxy
because ``request.client.host`` is a fragmented proxy IP. These gates cap
concurrency *globally*, independent of client IP, and let queued clients see
their position instead of silently piling onto the CPU.

Unlike a plain :class:`asyncio.Semaphore`, :class:`StreamGate` exposes the
FIFO queue position (so the endpoint can stream "you are n-th in line"
events) and is safe against the grant/timeout race: a ticket granted at the
same moment its waiter gives up returns the slot to the pool.

All gate state is only touched from the event loop thread (the endpoints'
async generators), so no locking is needed.
"""

from __future__ import annotations

import asyncio
from collections import deque
from collections.abc import AsyncGenerator
from dataclasses import dataclass, field

import config


class QueueTimeoutError(RuntimeError):
    """Raised when a queued stream request waited too long for a slot."""


@dataclass
class _Ticket:
    event: asyncio.Event = field(default_factory=asyncio.Event)
    granted: bool = False


class StreamGate:
    """FIFO global concurrency limiter for streaming endpoints."""

    def __init__(self, limit: int) -> None:
        self._limit = max(1, int(limit))
        self._active = 0
        self._queue: deque[_Ticket] = deque()

    @property
    def limit(self) -> int:
        return self._limit

    @property
    def active(self) -> int:
        return self._active

    @property
    def waiting(self) -> int:
        return len(self._queue)

    def try_acquire(self) -> bool:
        """Take a slot immediately; never queues (FIFO: no overtaking waiters)."""
        if self._active < self._limit and not self._queue:
            self._active += 1
            return True
        return False

    def release(self) -> None:
        """Return a slot and hand it to the longest-waiting ticket, if any."""
        self._active = max(0, self._active - 1)
        while self._active < self._limit and self._queue:
            ticket = self._queue.popleft()
            ticket.granted = True
            self._active += 1
            ticket.event.set()

    def _join_queue(self) -> _Ticket:
        ticket = _Ticket()
        self._queue.append(ticket)
        return ticket

    def _position(self, ticket: _Ticket) -> int:
        try:
            return self._queue.index(ticket) + 1
        except ValueError:
            return 0

    def _leave_queue(self, ticket: _Ticket) -> None:
        if ticket.granted:
            # The slot was granted concurrently with our timeout/cancel:
            # give it back so it is not leaked.
            self.release()
            return
        try:
            self._queue.remove(ticket)
        except ValueError:
            pass


async def wait_turn_events(
    gate: StreamGate,
    *,
    timeout_seconds: float,
    poll_seconds: float = 3.0,
) -> AsyncGenerator[int, None]:
    """Wait for a slot on ``gate``, yielding the current queue position (1-based)
    immediately on joining and then every ``poll_seconds`` while waiting.

    Completes normally once a slot is granted (the caller then owns the slot
    and must call ``gate.release()`` when done). Raises
    :class:`QueueTimeoutError` after ``timeout_seconds`` without a grant.
    Leaving early (client disconnect / generator close) safely removes the
    ticket or returns a just-granted slot.
    """
    ticket = gate._join_queue()
    granted = False
    try:
        loop = asyncio.get_running_loop()
        deadline = loop.time() + timeout_seconds
        yield gate._position(ticket)
        while True:
            if ticket.granted:
                granted = True
                return
            remaining = deadline - loop.time()
            if remaining <= 0:
                raise QueueTimeoutError(
                    f"No stream slot became free within {timeout_seconds:.0f}s."
                )
            try:
                await asyncio.wait_for(
                    ticket.event.wait(),
                    timeout=min(poll_seconds, remaining),
                )
            except asyncio.TimeoutError:
                if ticket.granted:
                    granted = True
                    return
                yield gate._position(ticket)
                continue
            granted = True
            return
    finally:
        if not granted:
            gate._leave_queue(ticket)


# Module-level gates shared by all requests of a single worker process
# (Render runs one uvicorn worker, so these are effectively server-global).
FIT_STREAM_GATE = StreamGate(config.FIT_MAX_CONCURRENCY)
PHOTOMETRY_STREAM_GATE = StreamGate(config.PHOTOMETRY_MAX_CONCURRENCY)
