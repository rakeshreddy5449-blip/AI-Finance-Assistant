from typing import Literal

from pydantic import BaseModel, Field


CATEGORIES = Literal[
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Entertainment",
    "Health",
    "Education",
    "Other",
]


class CategoryPredictionRequest(BaseModel):
    text: str = Field(
        min_length=1,
        max_length=255,
        description="Transaction description to classify.",
    )


class CategoryPredictionResponse(BaseModel):
    category: CATEGORIES
    method: Literal["rule", "svm"]