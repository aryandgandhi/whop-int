from fastapi import APIRouter, Depends

from app.deps import get_current_user
from app.models import User
from app.schemas import TransactionOut, WalletOut

router = APIRouter(prefix="/api/wallet", tags=["wallet"])


@router.get("", response_model=WalletOut)
def get_wallet(current_user: User = Depends(get_current_user)) -> WalletOut:
    wallet = current_user.wallet
    return WalletOut(
        available_cents=wallet.available_cents,
        escrow_cents=wallet.escrow_cents,
        transactions=[TransactionOut.model_validate(t) for t in wallet.transactions],
    )
