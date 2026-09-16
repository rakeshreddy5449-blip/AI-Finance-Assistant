from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.budget import Budget
from backend.app.models.transaction import Transaction
from backend.app.models.user import User
from backend.app.security.auth import get_current_user
from backend.app.services.insights import analyze_spending
from backend.app.services.budget_analysis import analyze_budget

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("")
def get_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):    
    from datetime import date

    today = date.today()
    current_month_start = today.replace(day=1)

    if today.month == 12:
        next_month_start = date(today.year + 1, 1, 1)
    else:
        next_month_start = date(
            today.year,
            today.month + 1,
            1,
        )

    category_rows = (
        db.query(
            Transaction.category,
            Transaction.amount,
        )
        .filter(
            Transaction.user_id == current_user.user_id,
            Transaction.type == "expense",
            Transaction.date >= current_month_start,
            Transaction.date < next_month_start,
        )
        .all()
    )
    

    category_spending = {}

    for category, amount in category_rows:
        if category not in category_spending:
            category_spending[category] = 0

        category_spending[category] += amount

    monthly_rows = (
        db.query(
            Transaction.date,
            Transaction.amount,
        )
        .filter(
            Transaction.user_id == current_user.user_id,
            Transaction.type == "expense",
        )
        .order_by(Transaction.date)
        .all()
    )

    monthly_totals = {}

    for transaction_date, amount in monthly_rows:
        month_key = transaction_date.strftime("%Y-%m")

        if month_key not in monthly_totals:
            monthly_totals[month_key] = 0

        monthly_totals[month_key] += amount

    monthly_trends = [
        {
            "month": month,
            "expenses": amount,
        }
        for month, amount in sorted(monthly_totals.items())
    ]

    insights = analyze_spending(
        category_spending=category_spending,
        monthly_trends=monthly_trends,
    )
    budgets = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.user_id,
            Budget.month == current_month_start,
        )
        .all()
    )

    budget_analysis = []

    for budget in budgets:
        spent_amount = category_spending.get(
            budget.category,
            0,
        )

        analysis = analyze_budget(
            budget_amount=budget.amount,
            spent_amount=spent_amount,
        )

        budget_analysis.append(
            {
                "category": budget.category,
                "month": budget.month,
                **analysis,
            }
        )

    for analysis in budget_analysis:
        if analysis["status"] == "over_budget":
            insights.append(
                {
                    "type": "budget_warning",
                    "category": analysis["category"],
                    "status": "over_budget",
                    "message": (
                        f"Your {analysis['category']} spending is "
                        f"₹{abs(analysis['remaining']):.2f} over "
                        f"your monthly budget."
                    ),
                }
            )

        elif analysis["status"] == "approaching_limit":
            insights.append(
                {
                    "type": "budget_warning",
                    "category": analysis["category"],
                    "status": "approaching_limit",
                    "message": (
                        f"Your {analysis['category']} spending has used "
                        f"{analysis['percentage_used']:.2f}% of your "
                        f"monthly budget and is approaching the limit."
                    ),
                }
            )

    return {
        "insights": insights,
        "budget_analysis": budget_analysis,
    }