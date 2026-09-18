from fastapi import APIRouter, HTTPException

from backend.app.schemas.ml import (
    CategoryPredictionRequest,
    CategoryPredictionResponse,
)

from backend.app.services.ml_service import (
    predict_category,
)


router = APIRouter(
    prefix="/predict-category",
    tags=["ML"],
)


@router.post(
    "",
    response_model=CategoryPredictionResponse,
)
def predict_transaction_category(
    request: CategoryPredictionRequest,
):
    """
    Predict the category of a transaction description.

    The ML service first tries the high-confidence
    rule-based classifier and uses the SVM model as
    a fallback when no rule matches.
    """

    try:

        result = predict_category(
            request.text
        )

        return result

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc