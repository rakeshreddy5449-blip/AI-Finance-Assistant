from datetime import date as DateType
from decimal import Decimal

from pydantic import BaseModel, Field


class BudgetCreate(BaseModel):
    category: str = Field(min_length=1, max_length=50)
    month: DateType
    amount: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2,
    )


class BudgetResponse(BaseModel):
    budget_id: int
    user_id: int
    category: str
    month: DateType
    amount: Decimal

    model_config = {"from_attributes": True}