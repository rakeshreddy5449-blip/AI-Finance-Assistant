from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.models.transaction import Transaction


def get_monthly_expenses(
    db: Session,
    user_id: int,
) -> list[dict]:
    """
    Get monthly expense totals for one user.
    """

    rows = (
        db.query(
            func.extract("year", Transaction.date).label("year"),
            func.extract("month", Transaction.date).label("month"),
            func.coalesce(
                func.sum(Transaction.amount),
                0,
            ).label("expenses"),
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
        )
        .group_by(
            func.extract("year", Transaction.date),
            func.extract("month", Transaction.date),
        )
        .order_by(
            func.extract("year", Transaction.date),
            func.extract("month", Transaction.date),
        )
        .all()
    )

    return [
        {
            "month": f"{int(year):04d}-{int(month):02d}",
            "expenses": float(expenses),
        }
        for year, month, expenses in rows
    ]


def get_next_month(month_value: str) -> str:
    """
    Return the month immediately after YYYY-MM.
    """

    year, month = map(
        int,
        month_value.split("-"),
    )

    if month == 12:
        return f"{year + 1:04d}-01"

    return f"{year:04d}-{month + 1:02d}"


def forecast_spending(
    db: Session,
    user_id: int,
) -> dict:
    """
    Estimate next month's spending.

    Logic:
    1 month:
        Use the current/latest month as the baseline.

    2+ months:
        Compare the latest two monthly totals.
        Forecast the next month using the same absolute
        month-to-month change.

    Example:
        September = ₹11,000
        October   = ₹13,000

        Change = ₹13,000 - ₹11,000
               = ₹2,000

        November forecast
               = ₹13,000 + ₹2,000
               = ₹15,000
    """

    monthly_data = get_monthly_expenses(
        db=db,
        user_id=user_id,
    )

    # -----------------------------------------------------
    # NO EXPENSE DATA
    # -----------------------------------------------------

    if len(monthly_data) == 0:
        return {
            "forecast_available": False,
            "message": (
                "No expense data is available for forecasting. "
                "Add an expense transaction to generate a "
                "spending estimate."
            ),
            "historical_months": 0,
            "historical_data": [],
            "model": "MonthToMonthTrend",
            "forecast_method": "month-to-month trend",
        }

    # -----------------------------------------------------
    # ONE MONTH OF DATA
    # -----------------------------------------------------

    if len(monthly_data) == 1:
        latest_month = monthly_data[-1]

        latest_expenses = latest_month["expenses"]

        forecast_month = get_next_month(
            latest_month["month"]
        )

        return {
            "forecast_available": True,
            "forecast_month": forecast_month,
            "predicted_expense": round(
                latest_expenses,
                2,
            ),
            "historical_months": 1,
            "historical_data": monthly_data,
            "previous_month_expense": None,
            "latest_month_expense": round(
                latest_expenses,
                2,
            ),
            "change_amount": None,
            "change_percentage": None,
            "trend": "baseline",
            "model": "MonthToMonthTrend",
            "forecast_method": (
                "latest-month baseline"
            ),
            "note": (
                "Only one month of expense history is "
                "available, so the latest month's spending "
                "is used as the baseline for the next month."
            ),
        }

    # -----------------------------------------------------
    # TWO OR MORE MONTHS
    # -----------------------------------------------------

    previous_month = monthly_data[-2]
    latest_month = monthly_data[-1]

    previous_expenses = float(
        previous_month["expenses"]
    )

    latest_expenses = float(
        latest_month["expenses"]
    )

    # Absolute change between the latest two months.
    change_amount = (
        latest_expenses -
        previous_expenses
    )

    # Forecast using the same observed change.
    predicted_expense = (
        latest_expenses +
        change_amount
    )

    predicted_expense = max(
        0.0,
        predicted_expense,
    )

    # Percentage change is useful for displaying
    # the trend to the user.
    if previous_expenses != 0:
        change_percentage = (
            change_amount /
            previous_expenses
        ) * 100
    else:
        change_percentage = None

    if change_amount > 0:
        trend = "increased"
    elif change_amount < 0:
        trend = "decreased"
    else:
        trend = "stable"

    forecast_month = get_next_month(
        latest_month["month"]
    )

    return {
        "forecast_available": True,
        "forecast_month": forecast_month,
        "predicted_expense": round(
            predicted_expense,
            2,
        ),
        "historical_months": len(
            monthly_data
        ),
        "historical_data": monthly_data,

        "previous_month": {
            "month": previous_month["month"],
            "expenses": round(
                previous_expenses,
                2,
            ),
        },

        "latest_month": {
            "month": latest_month["month"],
            "expenses": round(
                latest_expenses,
                2,
            ),
        },

        "previous_month_expense": round(
            previous_expenses,
            2,
        ),

        "latest_month_expense": round(
            latest_expenses,
            2,
        ),

        "change_amount": round(
            change_amount,
            2,
        ),

        "change_percentage": (
            round(
                change_percentage,
                2,
            )
            if change_percentage is not None
            else None
        ),

        "trend": trend,

        "model": "MonthToMonthTrend",

        "forecast_method": (
            "latest-month trend"
        ),

        "note": (
            "The forecast compares the latest two "
            "months and extends their spending change "
            "into the next month. This is an estimate "
            "based on historical spending behavior."
        ),
    }