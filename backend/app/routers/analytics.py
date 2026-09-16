from backend.app.services.insights import analyze_spending
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.transaction import Transaction
from backend.app.models.user import User
from backend.app.security.auth import get_current_user


router = APIRouter(
    prefix="/dashboard",
    tags=["Analytics"],
)


@router.get("")
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()

    current_month_start = today.replace(day=1)

    if today.month == 12:
        next_month_start = date(today.year + 1, 1, 1)
    else:
        next_month_start = date(today.year, today.month + 1, 1)

    income = db.query(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).filter(
        Transaction.user_id == current_user.user_id,
        Transaction.type == "income",
    ).scalar()

    expenses = db.query(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).filter(
        Transaction.user_id == current_user.user_id,
        Transaction.type == "expense",
    ).scalar()

    monthly_income = db.query(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).filter(
        Transaction.user_id == current_user.user_id,
        Transaction.type == "income",
        Transaction.date >= current_month_start,
        Transaction.date < next_month_start,
    ).scalar()

    monthly_expenses = db.query(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).filter(
        Transaction.user_id == current_user.user_id,
        Transaction.type == "expense",
        Transaction.date >= current_month_start,
        Transaction.date < next_month_start,
    ).scalar()

    balance = income - expenses
    monthly_savings = monthly_income - monthly_expenses

    category_rows = db.query(
        Transaction.category,
        func.coalesce(func.sum(Transaction.amount), 0)
    ).filter(
        Transaction.user_id == current_user.user_id,
        Transaction.type == "expense",
        Transaction.date >= current_month_start,
        Transaction.date < next_month_start,
    ).group_by(
        Transaction.category
    ).all()

    category_spending = {
        category: amount
        for category, amount in category_rows
    }
    monthly_rows = db.query(
        func.extract("year", Transaction.date).label("year"),
        func.extract("month", Transaction.date).label("month"),
        func.coalesce(func.sum(Transaction.amount), 0).label("expenses"),
    ).filter(
        Transaction.user_id == current_user.user_id,
        Transaction.type == "expense",
    ).group_by(
        func.extract("year", Transaction.date),
        func.extract("month", Transaction.date),
    ).order_by(
        func.extract("year", Transaction.date),
        func.extract("month", Transaction.date),
    ).all()

    monthly_trends = [
        {
            "month": f"{int(year):04d}-{int(month):02d}",
            "expenses": expenses,
        }
        for year, month, expenses in monthly_rows
    ]

    if monthly_income > 0:
        savings_rate = (
            monthly_savings / monthly_income
        ) * 100
    else:
        savings_rate = 0

    insights = analyze_spending(
        category_spending=category_spending,
        monthly_trends=monthly_trends,
    )

    return {
        "total_income": income,
        "total_expenses": expenses,
        "balance": balance,
        "current_month": {
            "income": monthly_income,
            "expenses": monthly_expenses,
            "savings": monthly_savings,
            "savings_rate": round(savings_rate, 2),
        },
        "category_spending": category_spending,
        "monthly_trends": monthly_trends,
        "insights": insights,
    }