from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.transaction import Transaction
from backend.app.schemas.transaction import (
    TRANSACTION_CATEGORIES,
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
)
from backend.app.models.user import User
from backend.app.security.auth import get_current_user
from backend.app.services.ml_service import predict_category


router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"],
)


@router.post(
    "",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_transaction(
    transaction_data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = transaction_data.category

    # Automatically predict category for expenses
    # when the user does not provide one.
    if transaction_data.type == "expense" and category is None:
        try:
            prediction = predict_category(transaction_data.description)
            category = prediction["category"]
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

    # Income transactions without a category use "Other".
    if category is None:
        category = "Other"

    if category not in TRANSACTION_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transaction category",
        )

    transaction = Transaction(
        user_id=current_user.user_id,
        date=transaction_data.date,
        description=transaction_data.description,
        amount=transaction_data.amount,
        type=transaction_data.type,
        category=category,
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction


@router.get(
    "",
    response_model=list[TransactionResponse],
)
def get_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.user_id
        )
        .order_by(
            Transaction.date.desc(),
            Transaction.transaction_id.desc(),
        )
        .all()
    )

    return transactions


@router.put(
    "/{transaction_id}",
    response_model=TransactionResponse,
)
def update_transaction(
    transaction_id: int,
    transaction_data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.transaction_id == transaction_id,
            Transaction.user_id == current_user.user_id,
        )
        .first()
    )

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    update_data = transaction_data.model_dump(
        exclude_unset=True
    )

    if "category" in update_data:
        if update_data["category"] not in TRANSACTION_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid transaction category",
            )

    for field, value in update_data.items():
        setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)

    return transaction


@router.delete(
    "/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.transaction_id == transaction_id,
            Transaction.user_id == current_user.user_id,
        )
        .first()
    )

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    db.delete(transaction)
    db.commit()

    return None