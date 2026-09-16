from decimal import Decimal


def analyze_budget(
    budget_amount: Decimal,
    spent_amount: Decimal,
) -> dict:
    """
    Compare actual spending with the configured budget.
    """

    budget_amount = Decimal(str(budget_amount))
    spent_amount = Decimal(str(spent_amount))

    remaining = budget_amount - spent_amount

    if budget_amount > 0:
        percentage_used = (
            spent_amount / budget_amount
        ) * Decimal("100")
    else:
        percentage_used = Decimal("0")

    if spent_amount > budget_amount:
        status = "over_budget"
    elif percentage_used >= Decimal("80"):
        status = "approaching_limit"
    else:
        status = "within_budget"

    return {
        "budget": float(budget_amount),
        "spent": float(spent_amount),
        "remaining": float(remaining),
        "percentage_used": round(float(percentage_used), 2),
        "status": status,
    }