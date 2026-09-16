from datetime import date as DateType
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field


TRANSACTION_CATEGORIES = {
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Entertainment",
    "Health",
    "Education",
    "Other",
}


class TransactionCreate(BaseModel):
    date: DateType
    description: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    type: Literal["income", "expense"]
    category: str = Field(min_length=1, max_length=50)


class TransactionUpdate(BaseModel):
    date: Optional[DateType] = None

    description: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=255,
    )

    amount: Optional[Decimal] = Field(
        default=None,
        gt=0,
        max_digits=12,
        decimal_places=2,
    )

    type: Optional[Literal["income", "expense"]] = None

    category: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=50,
    )


class TransactionResponse(BaseModel):
    transaction_id: int
    user_id: int
    date: DateType
    description: str
    amount: Decimal
    type: str
    category: str

    model_config = {
        "from_attributes": True
    }