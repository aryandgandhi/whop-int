"""Wallet and escrow operations.

Money is modelled as integer cents. Every balance mutation also writes a
`WalletTransaction` ledger row so the movement is auditable. These helpers
mutate the session but do not commit; the calling router owns the transaction
boundary.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Wallet, WalletTransaction


def _record(
    db: Session,
    wallet: Wallet,
    type_: str,
    amount_cents: int,
    task_id: uuid.UUID | None = None,
    description: str | None = None,
) -> None:
    db.add(
        WalletTransaction(
            wallet_id=wallet.id,
            type=type_,
            amount_cents=amount_cents,
            task_id=task_id,
            description=description,
        )
    )


def grant(db: Session, wallet: Wallet, amount_cents: int, description: str) -> None:
    """Add free demo credits to a wallet's available balance."""
    wallet.available_cents += amount_cents
    _record(db, wallet, "grant", amount_cents, description=description)


def hold_escrow(
    db: Session, wallet: Wallet, amount_cents: int, task_id: uuid.UUID, description: str
) -> None:
    """Move funds from available into escrow when a task is funded."""
    if wallet.available_cents < amount_cents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance to fund this task",
        )
    wallet.available_cents -= amount_cents
    wallet.escrow_cents += amount_cents
    _record(db, wallet, "escrow_hold", amount_cents, task_id=task_id, description=description)


def payout(
    db: Session,
    poster_wallet: Wallet,
    worker_wallet: Wallet,
    amount_cents: int,
    task_id: uuid.UUID,
    description: str,
) -> None:
    """Release one slot's reward from the poster's escrow to a worker."""
    poster_wallet.escrow_cents -= amount_cents
    worker_wallet.available_cents += amount_cents
    _record(db, worker_wallet, "payout", amount_cents, task_id=task_id, description=description)


def refund(
    db: Session, wallet: Wallet, amount_cents: int, task_id: uuid.UUID, description: str
) -> None:
    """Return unspent escrow to the poster's available balance."""
    if amount_cents <= 0:
        return
    wallet.escrow_cents -= amount_cents
    wallet.available_cents += amount_cents
    _record(db, wallet, "refund", amount_cents, task_id=task_id, description=description)
