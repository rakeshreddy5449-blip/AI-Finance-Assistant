from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.security.auth import get_current_user
from backend.app.services.forecast_service import forecast_spending


router = APIRouter(
    prefix="/forecast",
    tags=["Forecast"],
)


@router.get("")
def get_forecast(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return the user's next-month spending forecast.
    """

    return forecast_spending(
        db=db,
        user_id=current_user.user_id,
    )