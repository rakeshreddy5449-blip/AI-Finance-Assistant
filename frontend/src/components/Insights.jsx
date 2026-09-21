import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
};

const getMonthLabel = (monthValue) => {
  if (!monthValue) {
    return "";
  }

  const [year, month] = String(monthValue).split("-");

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

const categoryIdeas = {
  Food: {
    high:
      "Review restaurant, delivery, and frequent small food purchases separately. Planning a weekly food amount can help control optional spending.",
    average:
      "Your Food spending is at a moderate level. Continue monitoring smaller purchases because they can add up over the month.",
    low:
      "Food is currently one of your lower-spending categories. Continue tracking necessary and optional food purchases separately.",
  },

  Transport: {
    high:
      "Review frequent trips and recurring transport costs. Where practical, grouping trips or comparing travel options may reduce optional spending.",
    average:
      "Transport spending is at a moderate level. Continue monitoring recurring travel costs and frequent small trips.",
    low:
      "Transport is currently one of your lower-spending categories. Continue tracking travel costs while keeping necessary travel expenses in mind.",
  },

  Shopping: {
    high:
      "Separate essential purchases from non-essential purchases. A short waiting period before optional purchases can help reduce impulse spending.",
    average:
      "Shopping spending is moderate. Reviewing non-essential purchases can help you understand where your money is going.",
    low:
      "Shopping is currently one of your lower-spending categories. Continue distinguishing essential purchases from optional ones.",
  },

  Bills: {
    high:
      "Review recurring bills and subscriptions to identify services you no longer use. Separate fixed bills from variable expenses.",
    average:
      "Bills are at a moderate level. Continue monitoring recurring subscriptions and changes in variable bills.",
    low:
      "Bills are currently one of your lower-spending categories. Continue monitoring recurring payments for changes.",
  },

  Entertainment: {
    high:
      "Review subscriptions and optional entertainment purchases. Checking unused subscriptions can help identify avoidable recurring costs.",
    average:
      "Entertainment spending is moderate. Monitoring subscriptions and optional purchases can help maintain control.",
    low:
      "Entertainment is currently one of your lower-spending categories. Continue reviewing optional subscriptions and purchases.",
  },

  Health: {
    high:
      "Review recurring healthcare-related expenses and keep necessary medical spending prioritized. Look for clarity in recurring costs rather than reducing essential care.",
    average:
      "Health spending is at a moderate level. Continue tracking healthcare expenses so important costs remain visible in your budget.",
    low:
      "Health is currently one of your lower-spending categories. Continue keeping necessary healthcare expenses visible in your records.",
  },

  Education: {
    high:
      "Plan tuition, course, and educational payments ahead of time. Reviewing optional course purchases can make educational spending easier to manage.",
    average:
      "Education spending is moderate. Planning larger educational payments in advance can make monthly budgeting easier.",
    low:
      "Education is currently one of your lower-spending categories. Continue recording educational expenses so larger future payments are visible.",
  },

  Other: {
    high:
      "Review transactions categorized as Other and identify whether they belong to a more specific category. Better categorization improves future analysis.",
    average:
      "Other spending is moderate. Reviewing these transactions regularly can help keep your categories accurate.",
    low:
      "Other is currently one of your lower-spending categories. Continue reviewing this category so transactions remain accurately classified.",
  },
};

const getCategoryIdea = (category, level) => {
  const ideas =
    categoryIdeas[category] ||
    categoryIdeas.Other;

  return ideas[level];
};

const getCategoryLevel = (
  amount,
  highestAmount,
  lowestAmount,
  averageAmount,
  categoryCount
) => {
  if (categoryCount === 1) {
    return "average";
  }

  if (amount === highestAmount) {
    return "high";
  }

  if (amount === lowestAmount) {
    return "low";
  }

  if (amount >= averageAmount) {
    return "average";
  }

  return "low";
};

const getLevelLabel = (level) => {
  if (level === "high") {
    return "High spending";
  }

  if (level === "low") {
    return "Lower spending";
  }

  return "Moderate spending";
};

const getLevelIcon = (level) => {
  if (level === "high") {
    return "⚠";
  }

  if (level === "low") {
    return "✓";
  }

  return "ℹ";
};

function Insights() {
  const [dashboard, setDashboard] = useState(null);
  const [insightsData, setInsightsData] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadInsights = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          dashboardResponse,
          insightsResponse,
        ] = await Promise.all([
          api.get("/dashboard"),
          api.get("/insights"),
        ]);

        if (cancelled) {
          return;
        }

        setDashboard(dashboardResponse.data);
        setInsightsData(
          insightsResponse.data
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Insights loading error:",
          err
        );

        setError(
          err?.response?.data?.detail ||
            "Unable to load insights."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadInsights();

    return () => {
      cancelled = true;
    };
  }, []);

  const categoryData = useMemo(() => {
    const source =
      dashboard?.category_spending;

    if (!source) {
      return [];
    }

    if (Array.isArray(source)) {
      return source
        .map((item) => ({
          category:
            item.category ||
            item.name ||
            item.label ||
            "Other",
          amount: Number(
            item.amount ||
              item.value ||
              item.total ||
              0
          ),
        }))
        .filter(
          (item) => item.amount > 0
        );
    }

    return Object.entries(source)
      .map(([category, amount]) => ({
        category,
        amount: Number(amount || 0),
      }))
      .filter(
        (item) => item.amount > 0
      );
  }, [dashboard]);

  const sortedCategories = useMemo(() => {
    return [...categoryData].sort(
      (a, b) => b.amount - a.amount
    );
  }, [categoryData]);

  const highestAmount =
    sortedCategories[0]?.amount || 0;

  const lowestAmount =
    sortedCategories[
      sortedCategories.length - 1
    ]?.amount || 0;

  const averageAmount =
    categoryData.length > 0
      ? categoryData.reduce(
          (sum, item) => sum + item.amount,
          0
        ) / categoryData.length
      : 0;
  const totalCategorySpending =
    categoryData.reduce(
        (sum, item) => sum + item.amount,
    0
  );
  const categoryInsights = sortedCategories.map((item) => {
  const level = getCategoryLevel(
    item.amount,
    highestAmount,
    lowestAmount,
    averageAmount,
    categoryData.length
  );

  const percentageOfTotal =
    totalCategorySpending > 0
      ? (item.amount / totalCategorySpending) * 100
      : 0;

  return {
    ...item,
    level,
    levelLabel: getLevelLabel(level),
    levelIcon: getLevelIcon(level),
    percentageOfTotal,
    idea: getCategoryIdea(
      item.category,
      level
    ),
  };
});

  const rawInsights = Array.isArray(
    insightsData?.insights
  )
    ? insightsData.insights
    : [];

  const highSpendingInsight =
    rawInsights.find(
      (item) =>
        item?.type ===
        "high_spending_category"
    );

  const potentialSavingsInsight =
    rawInsights.find(
      (item) =>
        item?.type ===
        "potential_savings"
    );

  const spendingIncreaseInsight =
    rawInsights.find(
      (item) =>
        item?.type ===
        "spending_increase"
    );

  const spendingDecreaseInsight =
    rawInsights.find(
      (item) =>
        item?.type ===
        "spending_decrease"
    );

  const budgetAnalysis = Array.isArray(
    insightsData?.budget_analysis
  )
    ? insightsData.budget_analysis
    : [];

  const budgetAlerts =
    budgetAnalysis.filter(
      (budget) =>
        budget.status === "over_budget" ||
        budget.status ===
          "approaching_limit"
    );

  const monthlyTrends = Array.isArray(
    dashboard?.monthly_trends
  )
    ? dashboard.monthly_trends
    : [];

  const latestMonth =
    monthlyTrends.length > 0
      ? monthlyTrends[
          monthlyTrends.length - 1
        ]
      : null;

  const previousMonth =
    monthlyTrends.length > 1
      ? monthlyTrends[
          monthlyTrends.length - 2
        ]
      : null;

  const currentMonthAmount =
    Number(
      latestMonth?.expenses || 0
    );

  const previousMonthAmount =
    Number(
      previousMonth?.expenses || 0
    );

  const currentMonthLabel =
    getMonthLabel(
      latestMonth?.month
    );

  const previousMonthLabel =
    getMonthLabel(
      previousMonth?.month
    );

  const spendingChange =
    previousMonthAmount > 0
      ? ((currentMonthAmount -
          previousMonthAmount) /
          previousMonthAmount) *
        100
      : null;

  const combinedAttentionCategories =
    categoryInsights.filter(
      (item) => item.level === "high"
    );

  const highCategoryNames =
    combinedAttentionCategories
      .map((item) => item.category)
      .slice(0, 3);

  

  const totalExpenses = Number(
    dashboard?.total_expenses || 0
  );

  if (loading) {
    return (
      <div className="insights-page">
        <div className="insights-loading">
          Loading insights...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="insights-page">
        <div className="insights-error">
          <h3>
            Unable to load Insights
          </h3>

          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="insights-page">

      {/* =================================================
          PAGE HEADER
          ================================================= */}

      <section className="insights-hero">

        <div className="insights-hero-left">

          <div className="insights-hero-icon">
            💡
          </div>

          <div>
            <h2>Insights</h2>

            <p>
              Understand your spending and
              learn where you can improve.
            </p>
          </div>

        </div>

        <div className="insights-hero-message">
          Smart information for better
          spending decisions.
        </div>

      </section>

      {/* =================================================
          QUICK SUMMARY
          ================================================= */}

      <section className="insights-summary-grid">

        <div className="insight-summary-card">
          <span>Total Spent</span>

          <strong>
            {formatCurrency(
              totalExpenses
            )}
          </strong>

          <small>
            Across your recorded expenses
          </small>
        </div>

        <div className="insight-summary-card">
          <span>Highest Category</span>

          <strong>
            {highSpendingInsight?.category ||
              sortedCategories[0]
                ?.category ||
              "No data"}
          </strong>

          <small>
            {highSpendingInsight
              ? formatCurrency(
                  highSpendingInsight.amount
                )
              : "No category data yet"}
          </small>
        </div>

        <div className="insight-summary-card">
          <span>
            Potential Opportunity
          </span>

          <strong>
            {potentialSavingsInsight
              ? formatCurrency(
                  potentialSavingsInsight.potential_savings
                )
              : "—"}
          </strong>

          <small>
            Illustrative savings opportunity
          </small>
        </div>

      </section>

      {/* =================================================
          ATTENTION ALERT
          ================================================= */}

      {highCategoryNames.length > 0 && (
        <section className="insight-feature-card attention-card">

          <div className="feature-icon warning-feature">
            ⚠
          </div>

          <div className="feature-content">

            <div className="feature-label">
              NEEDS ATTENTION
            </div>

            <h3>
              {highCategoryNames.length === 1
                ? `${highCategoryNames[0]} is your highest-spending category`
                : `${highCategoryNames.join(
                    " and "
                  )} need more attention`}
            </h3>

            <p>
              {highCategoryNames.length === 1
                ? `Your ${highCategoryNames[0]} spending is currently higher than your other recorded categories.`
                : "These categories are currently among your highest-spending areas. Reviewing optional purchases can help identify possible savings opportunities."}
            </p>

            {highCategoryNames.length >
              1 && (
              <div className="combined-alert-note">
                💡 Review these categories
                separately before making
                changes to necessary expenses.
              </div>
            )}

          </div>

        </section>
      )}

      {/* =================================================
          CATEGORY INSIGHTS
          ================================================= */}

      <section className="insights-section">

        <div className="insights-section-header">

          <div>
            <h3>
              Category Insights
            </h3>

            <p>
              See how each spending category
              compares with your current month.
            </p>
          </div>

        </div>

        {categoryInsights.length === 0 ? (
          <div className="insights-empty-card">
            <div className="insights-empty-icon">
              📊
            </div>

            <h3>
              Not enough spending data yet
            </h3>

            <p>
              Add some expense transactions
              to receive category-based
              insights and educational
              suggestions.
            </p>
          </div>
        ) : (
          <div className="category-insights-grid">

            {categoryInsights.map(
              (item) => (
                <article
                  className={`category-insight-card ${item.level}`}
                  key={item.category}
                >

                  <div className="category-insight-header">

                    <div>
                      <span className="category-insight-name">
                        {item.category}
                      </span>

                      <div
                        className={`category-level ${item.level}`}
                      >
                        <span>
                          {item.levelIcon}
                        </span>

                        <span>
                          {item.levelLabel}
                        </span>
                      </div>
                    </div>

                    <strong>
                      {formatCurrency(
                        item.amount
                      )}
                    </strong>

                  </div>

                  <div className="category-percentage">
                    {item.percentageOfTotal.toFixed(
                      1
                    )}
                    % of recorded spending
                  </div>

                  <div className="category-insight-divider"></div>

                  <div className="category-why">

                    <span className="category-mini-label">
                      WHY THIS APPEARS
                    </span>

                    <p>
                      {item.level ===
                      "high"
                        ? `${item.category} is currently one of your highest-spending categories.`
                        : item.level ===
                          "low"
                        ? `${item.category} is currently one of your lower-spending categories.`
                        : `${item.category} is currently around the middle of your category spending.`}
                    </p>

                  </div>

                  <div className="category-saving-idea">

                    <span className="category-mini-label">
                      💡 SAVING / LEARNING IDEA
                    </span>

                    <p>
                      {item.idea}
                    </p>

                  </div>

                </article>
              )
            )}

          </div>
        )}

      </section>

      {/* =================================================
          POTENTIAL SAVINGS
          ================================================= */}

      {potentialSavingsInsight && (
        <section className="insight-feature-card savings-card">

          <div className="feature-icon savings-feature">
            💰
          </div>

          <div className="feature-content">

            <div className="feature-label">
              POTENTIAL SAVINGS OPPORTUNITY
            </div>

            <h3>
              Review{" "}
              {potentialSavingsInsight.category}{" "}
              spending
            </h3>

            <p>
              Spending in{" "}
              <strong>
                {potentialSavingsInsight.category}
              </strong>{" "}
              is currently your highest category.
              An illustrative 10% reduction would
              represent approximately{" "}
              <strong>
                {formatCurrency(
                  potentialSavingsInsight.potential_savings
                )}
              </strong>{" "}
              of potential savings.
            </p>

            <div className="educational-note">
              This is an educational estimate,
              not a required spending reduction.
              Review individual transactions to
              decide whether any reduction is
              practical.
            </div>

          </div>

        </section>
      )}

      {/* =================================================
          MONTHLY SPENDING
          ================================================= */}

      <section className="insights-section">

        <div className="insights-section-header">

          <div>
            <h3>
              Monthly Spending Insight
            </h3>

            <p>
              Understand how your latest
              month compares with the previous
              month.
            </p>
          </div>

        </div>

        <div className="monthly-insight-card">

          <div className="monthly-insight-icon">
            {spendingChange !== null &&
            spendingChange > 0
              ? "📈"
              : spendingChange !== null &&
                spendingChange < 0
              ? "📉"
              : "📊"}
          </div>

          <div className="monthly-insight-content">

            {spendingIncreaseInsight ? (
              <>
                <span className="monthly-status increase">
                  Spending increased
                </span>

                <h3>
                  Your spending increased by{" "}
                  {Math.abs(
                    Number(
                      spendingIncreaseInsight.change_percentage ||
                        spendingChange ||
                        0
                    )
                  ).toFixed(1)}
                  %
                </h3>
              </>
            ) : spendingDecreaseInsight ? (
              <>
                <span className="monthly-status decrease">
                  Spending decreased
                </span>

                <h3>
                  Your spending decreased by{" "}
                  {Math.abs(
                    Number(
                      spendingDecreaseInsight.change_percentage ||
                        spendingChange ||
                        0
                    )
                  ).toFixed(1)}
                  %
                </h3>
              </>
            ) : (
              <>
                <span className="monthly-status stable">
                  Spending trend
                </span>

                <h3>
                  {spendingChange === null
                    ? "More monthly data is needed"
                    : "Spending is relatively stable"}
                </h3>
              </>
            )}

            <p>
              {previousMonthLabel
                ? `${previousMonthLabel}: ${formatCurrency(
                    previousMonthAmount
                  )}`
                : "Previous month: no data"}
              {"  →  "}
              {currentMonthLabel
                ? `${currentMonthLabel}: ${formatCurrency(
                    currentMonthAmount
                  )}`
                : "Current month: no data"}
            </p>

            <div className="monthly-learning-tip">
              💡 Learning idea: compare the
              categories between these two
              months to understand what caused
              the largest change.
            </div>

          </div>

        </div>

      </section>

      {/* =================================================
          BUDGET ALERTS
          ================================================= */}

      <section className="insights-section">

        <div className="insights-section-header">

          <div>
            <h3>
              Budget Alerts
            </h3>

            <p>
              Warnings based on the limits you
              set in the Budgets page.
            </p>
          </div>

        </div>

        {budgetAlerts.length === 0 ? (
          <div className="budget-safe-card">

            <div className="budget-safe-icon">
              ✓
            </div>

            <div>
              <h3>
                No budget warnings
              </h3>

              <p>
                Your current budgets are not
                showing an approaching or
                exceeded limit.
              </p>
            </div>

          </div>
        ) : (
          <div className="budget-alert-list">

            {budgetAlerts.map(
              (budget, index) => {

                const isOver =
                  budget.status ===
                  "over_budget";

                return (
                  <div
                    className={`budget-alert-item ${
                      isOver
                        ? "over"
                        : "near"
                    }`}
                    key={`${budget.category}-${index}`}
                  >

                    <div className="budget-alert-icon">
                      {isOver
                        ? "⚠"
                        : "!"}
                    </div>

                    <div className="budget-alert-content">

                      <strong>
                        {isOver
                          ? `${budget.category} budget exceeded`
                          : `${budget.category} budget approaching limit`}
                      </strong>

                      <p>
                        {isOver
                          ? `Your ${budget.category} spending is ₹${Math.abs(
                              Number(
                                budget.remaining ||
                                  0
                              )
                            ).toLocaleString(
                              "en-IN"
                            )} over your monthly budget.`
                          : `Your ${budget.category} spending has used ${Number(
                              budget.percentage_used ||
                                0
                            ).toFixed(
                              1
                            )}% of your monthly budget.`}
                      </p>

                      <span className="budget-alert-learning">
                        💡 Review recent{" "}
                        {budget.category}{" "}
                        transactions and identify
                        optional spending before
                        making changes to necessary
                        expenses.
                      </span>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>

      {/* =================================================
          SMART SAVING IDEAS
          ================================================= */}

      <section className="insights-section">

        <div className="insights-section-header">

          <div>
            <h3>
              Smart Saving Ideas
            </h3>

            <p>
              Simple educational ideas based
              on the spending patterns detected
              in your data.
            </p>
          </div>

        </div>

        <div className="saving-ideas-grid">

          {categoryInsights
            .filter(
              (item) =>
                item.level === "high"
            )
            .slice(0, 3)
            .map((item) => (
              <div
                className="saving-idea-card"
                key={`idea-${item.category}`}
              >

                <span className="saving-idea-category">
                  {item.category}
                </span>

                <h4>
                  Review your{" "}
                  {item.category.toLowerCase()}{" "}
                  spending
                </h4>

                <p>
                  {item.idea}
                </p>

              </div>
            ))}

          {categoryInsights.filter(
            (item) =>
              item.level === "high"
          ).length === 0 && (
            <div className="saving-idea-card">
              <span className="saving-idea-category">
                GENERAL
              </span>

              <h4>
                Keep reviewing your spending
              </h4>

              <p>
                Regularly reviewing transactions,
                budgets, and category totals can
                help you understand your spending
                habits and identify opportunities
                to save.
              </p>
            </div>
          )}

        </div>

      </section>

      {/* =================================================
          TECHNICAL INFORMATION
          ================================================= */}

      <section className="technical-insights-card">

        <div className="technical-header">

          <div className="technical-icon">
            🔍
          </div>

          <div>
            <h3>
              How These Insights Are Generated
            </h3>

            <p>
              A simple and explainable analysis
              process is used to turn your
              financial data into insights.
            </p>
          </div>

        </div>

        <div className="technical-flow">

          <div className="technical-step">
            <span>1</span>

            <div>
              <strong>
                Transactions
              </strong>

              <p>
                Your recorded income and expense
                transactions provide the source
                data.
              </p>
            </div>
          </div>

          <div className="technical-step">
            <span>2</span>

            <div>
              <strong>
                Category Analysis
              </strong>

              <p>
                Expense amounts are grouped by
                category to identify higher,
                moderate, and lower spending
                areas.
              </p>
            </div>
          </div>

          <div className="technical-step">
            <span>3</span>

            <div>
              <strong>
                Monthly Analysis
              </strong>

              <p>
                Monthly totals are compared to
                identify meaningful increases or
                decreases in spending.
              </p>
            </div>
          </div>

          <div className="technical-step">
            <span>4</span>

            <div>
              <strong>
                Budget Analysis
              </strong>

              <p>
                Actual category spending is
                compared with the limits set by
                the user.
              </p>
            </div>
          </div>

          <div className="technical-step">
            <span>5</span>

            <div>
              <strong>
                Educational Suggestions
              </strong>

              <p>
                The detected pattern is matched
                with a category-specific learning
                or saving idea.
              </p>
            </div>
          </div>

        </div>

        <div className="technical-method">

          <strong>
            Analysis type:
          </strong>

          <span>
            Rule-based + explainable
          </span>

          <strong>
            Data source:
          </strong>

          <span>
            User transactions and budgets
          </span>

        </div>

      </section>

      {/* =================================================
          AI CHATBOT
          ================================================= */}

      <section className="ai-chat-coming-card">

        <div className="ai-chat-coming-icon">
          🤖
        </div>

        <div className="ai-chat-coming-content">

          <span className="feature-label">
            MORE INFORMATION
          </span>

          <h3>
            Want to learn more about your
            spending?
          </h3>

          <p>
            The future AI Finance Chatbot will
            let you ask questions about these
            insights, budgets, spending patterns,
            and more saving ideas.
          </p>

          <button
            type="button"
            className="ai-chat-coming-button"
            disabled
          >
            AI Chatbot coming soon
          </button>

        </div>

      </section>

      {/* =================================================
          DISCLAIMER
          ================================================= */}

      <div className="insights-disclaimer">

        <span>ℹ</span>

        <p>
          These insights are educational
          information based on recorded
          spending data. They are not
          professional financial advice,
          investment advice, tax advice, or
          a guarantee of future financial
          results.
        </p>

      </div>

    </div>
  );
}

export default Insights;