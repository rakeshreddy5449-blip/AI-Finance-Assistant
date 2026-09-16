from decimal import Decimal


def analyze_spending(
    category_spending: dict,
    monthly_trends: list[dict],
) -> list[dict]:
    """
    Analyze spending data and generate simple, explainable insights.

    This is rule-based analysis. ML forecasting will be added separately.
    """

    insights = []

    # 1. Find the highest-spending category
    if category_spending:
        highest_category = max(
            category_spending,
            key=category_spending.get,
        )

        highest_amount = category_spending[highest_category]

        insights.append(
            {
                "type": "high_spending_category",
                "category": highest_category,
                "amount": float(highest_amount),
                "message": (
                    f"{highest_category} is your highest spending "
                    f"category this month at ₹{highest_amount}."
                ),
            }
        )
    # 1b. Estimate a potential savings opportunity
        reduction_rate = Decimal("0.10")
        potential_savings = highest_amount * reduction_rate

        if potential_savings > 0:
            insights.append(
                {
                    "type": "potential_savings",
                    "category": highest_category,
                    "reduction_rate": 10,
                    "potential_savings": round(float(potential_savings), 2),
                    "message": (
                        f"If spending in {highest_category} were reduced "
                        f"by 10%, the estimated potential savings would be "
                        f"₹{potential_savings:.2f}."
                    ),
                }
            )

    # 2. Compare the latest month with the previous month
    if len(monthly_trends) >= 2:
        previous_month = monthly_trends[-2]
        current_month = monthly_trends[-1]

        previous_expenses = Decimal(str(previous_month["expenses"]))
        current_expenses = Decimal(str(current_month["expenses"]))

        if previous_expenses > 0:
            change = (
                (current_expenses - previous_expenses)
                / previous_expenses
            ) * 100

            if change > 10:
                insights.append(
                    {
                        "type": "spending_increase",
                        "change_percentage": round(float(change), 2),
                        "message": (
                            f"Your spending increased by "
                            f"{round(float(change), 2)}% compared "
                            f"with the previous month."
                        ),
                    }
                )

            elif change < -10:
                insights.append(
                    {
                        "type": "spending_decrease",
                        "change_percentage": round(float(change), 2),
                        "message": (
                            f"Your spending decreased by "
                            f"{round(abs(float(change)), 2)}% compared "
                            f"with the previous month."
                        ),
                    }
                )

    return insights