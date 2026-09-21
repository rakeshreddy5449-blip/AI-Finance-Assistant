import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const budgetCategories = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Other",
];

const getCurrentMonth = () => {
  const today = new Date();

  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
};

const getMonthKey = (dateValue) => {
  if (!dateValue) {
    return "";
  }

  if (typeof dateValue === "string") {
    return dateValue.slice(0, 7);
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
};

const formatMonth = (monthValue) => {
  if (!monthValue) {
    return "";
  }

  const [year, month] = monthValue.split("-");

  if (!year || !month) {
    return monthValue;
  }

  const date = new Date(
    Number(year),
    Number(month) - 1,
    1
  );

  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());

  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    category: "Food",
    amount: "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadBudgetData = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          budgetsResponse,
          transactionsResponse,
        ] = await Promise.all([
          api.get("/budgets"),
          api.get("/transactions"),
        ]);

        if (cancelled) {
          return;
        }

        setBudgets(budgetsResponse.data);
        setTransactions(transactionsResponse.data);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Budget page loading error:",
          err
        );

        setError(
          err?.response?.data?.detail ||
            "Unable to load budget information."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadBudgetData();

    return () => {
      cancelled = true;
    };
  }, []);

  const monthBudgets = useMemo(() => {
    return budgets.filter(
      (budget) =>
        getMonthKey(budget.month) === selectedMonth
    );
  }, [budgets, selectedMonth]);

  const monthExpenses = useMemo(() => {
    const expenseTotals = {};

    transactions.forEach((transaction) => {
      if (transaction.type !== "expense") {
        return;
      }

      if (
        getMonthKey(transaction.date) !==
        selectedMonth
      ) {
        return;
      }

      const category =
        transaction.category || "Other";

      const amount = Number(
        transaction.amount || 0
      );

      expenseTotals[category] =
        (expenseTotals[category] || 0) + amount;
    });

    return expenseTotals;
  }, [transactions, selectedMonth]);

  const budgetCards = useMemo(() => {
    return monthBudgets
      .map((budget) => {
        const limit = Number(budget.amount || 0);

        const spent = Number(
          monthExpenses[budget.category] || 0
        );

        const remaining = limit - spent;

        const percentage =
          limit > 0
            ? (spent / limit) * 100
            : 0;

        let status = "Within budget";

        if (percentage >= 100) {
          status = "Over budget";
        } else if (percentage >= 80) {
          status = "Near limit";
        }

        return {
          ...budget,
          limit,
          spent,
          remaining,
          percentage,
          status,
        };
      })
      .sort((a, b) =>
        a.category.localeCompare(b.category)
      );
  }, [monthBudgets, monthExpenses]);

  const availableCategories = useMemo(() => {
    const alreadyUsed = new Set(
      monthBudgets.map(
        (budget) => budget.category
      )
    );

    return budgetCategories.filter(
      (category) => !alreadyUsed.has(category)
    );
  }, [monthBudgets]);

  const totalBudget = useMemo(() => {
    return budgetCards.reduce(
      (total, budget) =>
        total + budget.limit,
      0
    );
  }, [budgetCards]);

  const totalSpent = useMemo(() => {
    return budgetCards.reduce(
      (total, budget) =>
        total + budget.spent,
      0
    );
  }, [budgetCards]);

  const totalRemaining =
    totalBudget - totalSpent;

  const openModal = () => {
    setError("");

    const firstAvailable =
      availableCategories[0] || "Food";

    setFormData({
      category: firstAvailable,
      amount: "",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    if (!submitting) {
      setShowModal(false);
    }
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAddBudget = async (event) => {
    event.preventDefault();

    if (!formData.category) {
      setError("Please select a category.");
      return;
    }

    if (
      !formData.amount ||
      Number(formData.amount) <= 0
    ) {
      setError(
        "Please enter a valid monthly budget amount."
      );
      return;
    }

    const existingBudget = monthBudgets.find(
      (budget) =>
        budget.category ===
        formData.category
    );

    if (existingBudget) {
      setError(
        `${formData.category} already has a budget for ${formatMonth(
          selectedMonth
        )}. Delete the existing budget before adding another one.`
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await api.post(
        "/budgets",
        {
          category: formData.category,
          month: `${selectedMonth}-01`,
          amount: Number(formData.amount),
        }
      );

      setBudgets((current) => [
        response.data,
        ...current,
      ]);

      setShowModal(false);

      setFormData({
        category:
          availableCategories[0] || "Food",
        amount: "",
      });
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to create the budget."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBudget = async (budgetId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this budget?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(
        `/budgets/${budgetId}`
      );

      setBudgets((current) =>
        current.filter(
          (budget) =>
            budget.budget_id !== budgetId
        )
      );
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to delete the budget."
      );
    }
  };

  return (
    <div className="budgets-page">
      {/* PAGE INTRO */}

      <section className="budgets-intro-card">
        <div className="budgets-heading">
          <div className="budgets-heading-icon">
            🎯
          </div>

          <div>
            <h2>Budgets</h2>

            <p>
              Set monthly spending limits and track
              your actual expenses.
            </p>
          </div>
        </div>
      </section>

      {/* MONTH CONTROLS */}

      <section className="budgets-control-card">
        <div>
          <span className="budget-control-label">
            Monthly Budget
          </span>

          <h3>
            {formatMonth(selectedMonth)}
          </h3>

          <p>
            Set category limits for this month.
            Spending is taken automatically from
            your transactions.
          </p>
        </div>

        <div className="budgets-controls">
          <label>
            <span>Select Month</span>

            <input
              type="month"
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(
                  event.target.value
                )
              }
            />
          </label>

          <button
            className="primary-action-button"
            onClick={openModal}
            disabled={
              availableCategories.length === 0
            }
          >
            + Add Budget
          </button>
        </div>
      </section>

      {/* MONTH SUMMARY */}

      <section className="budget-summary-grid">
        <div className="budget-summary-card">
          <span>Total Budget</span>
          <strong>
            {formatCurrency(totalBudget)}
          </strong>
        </div>

        <div className="budget-summary-card">
          <span>Total Spent</span>
          <strong>
            {formatCurrency(totalSpent)}
          </strong>
        </div>

        <div className="budget-summary-card">
          <span>Remaining</span>
          <strong
            className={
              totalRemaining < 0
                ? "budget-negative"
                : "budget-positive"
            }
          >
            {formatCurrency(totalRemaining)}
          </strong>
        </div>
      </section>

      {/* ERROR */}

      {error && (
        <div className="budgets-error">
          {error}
        </div>
      )}

      {/* LOADING */}

      {loading ? (
        <div className="budgets-empty-state">
          Loading budgets...
        </div>
      ) : budgetCards.length === 0 ? (
        <div className="budgets-empty-card">
          <div className="budgets-empty-icon">
            🎯
          </div>

          <h3>
            No budgets set for{" "}
            {formatMonth(selectedMonth)}
          </h3>

          <p>
            Create your first category budget to
            start tracking your spending.
          </p>

          <button
            className="primary-action-button"
            onClick={openModal}
            disabled={
              availableCategories.length === 0
            }
          >
            + Add Budget
          </button>
        </div>
      ) : (
        <div className="budget-cards-grid">
          {budgetCards.map((budget) => {
            const progressWidth = Math.min(
              budget.percentage,
              100
            );

            const statusClass =
              budget.status === "Over budget"
                ? "budget-status-over"
                : budget.status === "Near limit"
                ? "budget-status-near"
                : "budget-status-ok";

            return (
              <article
                className="budget-card"
                key={budget.budget_id}
              >
                <div className="budget-card-header">
                  <div>
                    <h3>
                      {budget.category}
                    </h3>

                    <span>
                      Monthly spending limit
                    </span>
                  </div>

                  <button
                    className="budget-delete-button"
                    onClick={() =>
                      handleDeleteBudget(
                        budget.budget_id
                      )
                    }
                    title="Delete budget"
                  >
                    🗑️
                  </button>
                </div>

                <div className="budget-values">
                  <div>
                    <span>Limit</span>
                    <strong>
                      {formatCurrency(
                        budget.limit
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Spent</span>
                    <strong>
                      {formatCurrency(
                        budget.spent
                      )}
                    </strong>
                  </div>
                </div>

                <div className="budget-progress-track">
                  <div
                    className={`budget-progress-fill ${statusClass}`}
                    style={{
                      width: `${progressWidth}%`,
                    }}
                  ></div>
                </div>

                <div className="budget-progress-info">
                  <span>
                    {Math.round(
                      budget.percentage
                    )}
                    %
                  </span>

                  <span>
                    {budget.remaining >= 0
                      ? `${formatCurrency(
                          budget.remaining
                        )} remaining`
                      : `${formatCurrency(
                          Math.abs(
                            budget.remaining
                          )
                        )} over`}
                  </span>
                </div>

                <div
                  className={`budget-status ${statusClass}`}
                >
                  <span>
                    {budget.status ===
                    "Over budget"
                      ? "⚠"
                      : budget.status ===
                        "Near limit"
                      ? "!"
                      : "✓"}
                  </span>

                  <span>
                    {budget.status}
                  </span>
                </div>

                <p className="budget-source-note">
                  Spent amount is calculated
                  automatically from your expense
                  transactions.
                </p>
              </article>
            );
          })}
        </div>
      )}

      {/* ADD BUDGET MODAL */}

      {showModal && (
        <div
          className="budget-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="budget-modal">
            <div className="budget-modal-header">
              <div>
                <h3>
                  Set Category Budget
                </h3>

                <p>
                  Create a monthly spending limit
                  for {formatMonth(selectedMonth)}.
                </p>
              </div>

              <button
                type="button"
                className="budget-modal-close"
                onClick={closeModal}
                disabled={submitting}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddBudget}>
              <div className="budget-form-field">
                <label htmlFor="budget-category">
                  Category
                </label>

                <select
                  id="budget-category"
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  disabled={
                    availableCategories.length === 0
                  }
                >
                  {availableCategories.length ===
                  0 ? (
                    <option value="">
                      No categories available
                    </option>
                  ) : (
                    availableCategories.map(
                      (category) => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>
                      )
                    )
                  )}
                </select>
              </div>

              <div className="budget-form-field">
                <label htmlFor="budget-month">
                  Month
                </label>

                <input
                  id="budget-month"
                  type="text"
                  value={formatMonth(
                    selectedMonth
                  )}
                  readOnly
                />
              </div>

              <div className="budget-form-field">
                <label htmlFor="budget-amount">
                  Monthly Limit
                </label>

                <div className="budget-amount-wrapper">
                  <span>₹</span>

                  <input
                    id="budget-amount"
                    name="amount"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="e.g. 5000"
                    value={formData.amount}
                    onChange={handleFormChange}
                    required
                  />
                </div>
              </div>

              <div className="budget-info-note">
                💡 Your actual spending will be
                calculated automatically from the
                transactions you add for this
                category and month.
              </div>

              {error && (
                <div className="budget-modal-error">
                  {error}
                </div>
              )}

              <div className="budget-modal-actions">
                <button
                  type="button"
                  className="budget-cancel-button"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="budget-submit-button"
                  disabled={
                    submitting ||
                    availableCategories.length === 0
                  }
                >
                  {submitting
                    ? "Saving..."
                    : "Save Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Budgets;