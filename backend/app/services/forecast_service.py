from datetime import date
from math import sqrt

from sqlalchemy import func
from sqlalchemy.orm import Session
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error

from backend.app.models.transaction import Transaction


MINIMUM_MONTHS_REQUIRED = 3


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


def forecast_spending(
    db: Session,
    user_id: int,
) -> dict:
    """
    Forecast next month's spending using Linear Regression.
    """

    monthly_data = get_monthly_expenses(
        db=db,
        user_id=user_id,
    )

    if len(monthly_data) < MINIMUM_MONTHS_REQUIRED:
        return {
            "forecast_available": False,
            "message": (
                "Insufficient historical data for forecasting. "
                f"At least {MINIMUM_MONTHS_REQUIRED} months "
                "of expense history are required."
            ),
            "historical_months": len(monthly_data),
            "model": "LinearRegression",
        }

    x = [
        [index]
        for index in range(1, len(monthly_data) + 1)
    ]

    y = [
        item["expenses"]
        for item in monthly_data
    ]

    # Hold out the most recent month for a simple
    # evaluation of forecast error.
    x_train = x[:-1]
    y_train = y[:-1]

    x_test = x[-1:]
    y_test = y[-1:]

    evaluation_model = LinearRegression()
    evaluation_model.fit(x_train, y_train)

    test_prediction = evaluation_model.predict(x_test)

    mae = mean_absolute_error(
        y_test,
        test_prediction,
    )

    rmse = sqrt(
        mean_squared_error(
            y_test,
            test_prediction,
        )
    )

    # Train final model on all available history.
    final_model = LinearRegression()
    final_model.fit(x, y)

    next_month_number = len(monthly_data) + 1

    predicted_expense = final_model.predict(
        [[next_month_number]]
    )[0]

    # If Linear Regression produces a non-positive
    # spending estimate, use the average of the
    # most recent three months as a practical fallback.
    predicted_expense = float(predicted_expense)
    fallback_used = False

    if predicted_expense <= 0:
        recent_values = y[-3:]
        predicted_expense = sum(recent_values) / len(recent_values)
        fallback_used = True

    predicted_expense = max(
        0.0,
        predicted_expense,
    )

    today = date.today()

    if today.month == 12:
        next_month = date(
            today.year + 1,
            1,
            1,
        )
    else:
        next_month = date(
            today.year,
            today.month + 1,
            1,
        )

    return {
        "forecast_available": True,
        "forecast_month": next_month.strftime("%Y-%m"),
        "predicted_expense": round(
            predicted_expense,
            2,
        ),
        "historical_months": len(monthly_data),
        "historical_data": monthly_data,
        "evaluation": {
            "mae": round(float(mae), 2),
            "rmse": round(float(rmse), 2),
        },
        "model": "LinearRegression",
        "forecast_method": (
            "recent-average fallback"
            if fallback_used
            else "LinearRegression"
        ),
        "note": (
        "This is an estimated future spending value "
        "based on historical expense patterns. "
        "A recent-average fallback is used when "
        "Linear Regression produces a non-positive estimate."
),
        
    }