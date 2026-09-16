from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.budget import Budget
from backend.app.models.user import User
from backend.app.schemas.budget import BudgetCreate, BudgetResponse
from backend.app.security.auth import get_current_user

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.post(
    "",
    response_model=BudgetResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_budget(
    budget_data: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if budget_data.category not in {
        "Food",
        "Transport",
        "Shopping",
        "Bills",
        "Entertainment",
        "Health",
        "Education",
        "Other",
    }:
        raise HTTPException(
            status_code=400,
            detail="Invalid budget category",
        )

    budget = Budget(
        user_id=current_user.user_id,
        category=budget_data.category,
        month=budget_data.month,
        amount=budget_data.amount,
    )

    db.add(budget)
    db.commit()
    db.refresh(budget)

    return budget


@router.get(
    "",
    response_model=list[BudgetResponse],
)
def get_budgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budgets = (
        db.query(Budget)
        .filter(Budget.user_id == current_user.user_id)
        .order_by(Budget.month.desc(), Budget.budget_id.desc())
        .all()
    )
    

    return budgets

@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = (
        db.query(Budget)
        .filter(
            Budget.budget_id == budget_id,
            Budget.user_id == current_user.user_id,
        )
        .first()
    )

    if budget is None:
        raise HTTPException(
            status_code=404,
            detail="Budget not found",
        )

    db.delete(budget)
    db.commit()

    return None