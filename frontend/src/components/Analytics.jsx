import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import api from "../services/api";

/* =========================================================
   HELPERS
   ========================================================= */

const formatCurrency = (value) => {
  const number = Number(value || 0);

  return `₹${number.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
};

const getMonthlyValue = (item) => {
  if (typeof item === "number") {
    return item;
  }

  return Number(
    item?.expenses ??
      item?.expense ??
      item?.amount ??
      item?.total_expenses ??
      item?.value ??
      0
  );
};

const getMonthlyLabel = (item) => {
  if (typeof item === "string") {
    return item;
  }

  return (
    item?.month_label ||
    item?.label ||
    item?.month ||
    item?.period ||
    ""
  );
};

const getCategoryData = (categorySpending) => {
  if (!categorySpending) {
    return [];
  }

  if (Array.isArray(categorySpending)) {
    return categorySpending
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
      .filter((item) => item.amount > 0);
  }

  return Object.entries(categorySpending)
    .map(([category, amount]) => ({
      category,
      amount: Number(amount || 0),
    }))
    .filter((item) => item.amount > 0);
};

/* =========================================================
   MONTH / DATE HELPERS
   ========================================================= */

const parseMonthDate = (monthValue) => {
  const value = String(monthValue || "");

  const match = value.match(
    /^(\d{4})-(\d{1,2})/
  );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    return null;
  }

  return {
    year,
    month,
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0),
  };
};

const formatMonthLabel = (monthValue) => {
  const monthInfo = parseMonthDate(monthValue);

  if (!monthInfo) {
    return monthValue;
  }

  return monthInfo.start.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
};

const formatAnalyticsDate = (date) => {
  if (!date) {
    return "";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* =========================================================
   CUSTOM LINE CHART TOOLTIP
   ========================================================= */

const AnalyticsTrendTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload;

  if (!point) {
    return null;
  }

  const monthInfo = parseMonthDate(point.month);

  return (
    <div className="analytics-custom-tooltip">
      <div className="analytics-tooltip-month">
        {monthInfo
          ? monthInfo.start.toLocaleDateString(
              "en-IN",
              {
                month: "long",
                year: "numeric",
              }
            )
          : point.monthLabel || point.month}
      </div>

      {monthInfo && (
        <div className="analytics-tooltip-date">
          {formatAnalyticsDate(monthInfo.start)}
          {" – "}
          {formatAnalyticsDate(monthInfo.end)}
        </div>
      )}

      <div className="analytics-tooltip-expense">
        Expenses: {formatCurrency(point.expenses)}
      </div>
    </div>
  );
};

/* =========================================================
   ANALYTICS COMPONENT
   ========================================================= */

const Analytics = () => {
  const [dashboard, setDashboard] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [insights, setInsights] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =======================================================
     LOAD ANALYTICS DATA
     ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          dashboardResponse,
          forecastResponse,
          insightsResponse,
        ] = await Promise.all([
          api.get("/dashboard"),
          api.get("/forecast"),
          api.get("/insights"),
        ]);

        if (cancelled) {
          return;
        }

        setDashboard(dashboardResponse.data);
        setForecast(forecastResponse.data);
        setInsights(insightsResponse.data);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Analytics loading error:",
          err
        );

        setError(
          err?.response?.data?.detail ||
            "Unable to load analytics data."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     LOADING
     ======================================================= */

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">
          Loading analytics...
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
     ======================================================= */

  if (error) {
    return (
      <div className="analytics-page">
        <div className="analytics-error">
          <h3>Unable to load Analytics</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  /* =======================================================
     FINANCIAL TOTALS
     ======================================================= */

  const totalIncome = Number(
    dashboard?.total_income || 0
  );

  const totalExpenses = Number(
    dashboard?.total_expenses || 0
  );

  const currentBalance = Number(
    dashboard?.balance ??
      totalIncome - totalExpenses
  );

  /* =======================================================
     CATEGORY DATA
     ======================================================= */

  const categoryData = getCategoryData(
    dashboard?.category_spending
  );

  const sortedCategories = [...categoryData].sort(
    (a, b) => b.amount - a.amount
  );

  const highestCategory = sortedCategories[0];

  const lowestCategory =
    sortedCategories[sortedCategories.length - 1];

  const highestAmount =
    highestCategory?.amount || 0;

  const lowestAmount =
    lowestCategory?.amount || 0;

  const getCategoryColor = (amount) => {
    if (!categoryData.length) {
      return "#F2C94C";
    }

    if (amount === highestAmount) {
      return "#E53935";
    }

    if (amount === lowestAmount) {
      return "#2F80ED";
    }

    return "#F2C94C";
  };

  /* =======================================================
     MONTHLY EXPENSE DATA
     ======================================================= */

  const monthlyRaw = Array.isArray(
    dashboard?.monthly_trends
  )
    ? dashboard.monthly_trends
    : [];

  const monthlyData = monthlyRaw
    .map((item) => {
      const rawMonth = getMonthlyLabel(item);

      return {
        month: rawMonth,
        monthLabel: formatMonthLabel(rawMonth),
        expenses: getMonthlyValue(item),
      };
    })
    .filter(
      (item) =>
        item.month &&
        item.expenses >= 0
    );

  /* =======================================================
     MONTHLY COMPARISON
     ======================================================= */

  const previousMonthExpenses =
    monthlyData.length >= 2
      ? Number(
          monthlyData[
            monthlyData.length - 2
          ]?.expenses || 0
        )
      : 0;

  const currentMonthExpenses =
    Number(
      dashboard?.current_month_expenses
    ) ||
    (monthlyData.length
      ? Number(
          monthlyData[
            monthlyData.length - 1
          ]?.expenses || 0
        )
      : 0);

  const calculateChange = (
    current,
    previous
  ) => {
    if (previous === 0) {
      return null;
    }

    return (
      ((current - previous) / previous) *
      100
    );
  };

  const expenseChange = calculateChange(
    currentMonthExpenses,
    previousMonthExpenses
  );

  /* =======================================================
     INCOME COMPARISON
     ======================================================= */

  const currentMonthIncome = Number(
    dashboard?.current_month_income || 0
  );

  const monthlyIncomeData = Array.isArray(
    dashboard?.monthly_income_trends
  )
    ? dashboard.monthly_income_trends
    : [];

  const previousMonthIncome =
    monthlyIncomeData.length >= 2
      ? Number(
          monthlyIncomeData[
            monthlyIncomeData.length - 2
          ]?.income || 0
        )
      : 0;

  const incomeChange =
    currentMonthIncome &&
    previousMonthIncome
      ? calculateChange(
          currentMonthIncome,
          previousMonthIncome
        )
      : null;

  /* =======================================================
     INSIGHTS
     ======================================================= */

  const insightList = Array.isArray(
    insights?.insights
  )
    ? insights.insights
    : [];

  const getInsightMessage = (item) => {
    if (typeof item === "string") {
      return item;
    }

    return (
      item?.message ||
      item?.insight ||
      item?.text ||
      ""
    );
  };

  const insightMessages = insightList
    .map(getInsightMessage)
    .filter(Boolean);

  /* =======================================================
     FORECAST
     ======================================================= */

  const forecastAvailable =
    Boolean(
      forecast?.forecast_available
    ) &&
    Number(
      forecast?.predicted_expense || 0
    ) >= 0;

  const predictedExpense = Number(
    forecast?.predicted_expense || 0
  );

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="analytics-page">

      {/* =================================================
          PAGE HEADER
          ================================================= */}

      <div className="analytics-hero">

        <div className="analytics-hero-left">

          <div className="analytics-hero-icon">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div>
            <h1>Analytics</h1>

            <p>
              Understand your income, expenses
              and spending trends
            </p>
          </div>

        </div>

        <div className="analytics-hero-message">
          <div>
            "Better insights
          </div>

          <div>
            A brighter tomorrow"
          </div>
        </div>

      </div>

      {/* =================================================
          FINANCIAL SUMMARY
          ================================================= */}

      <div className="analytics-summary-grid">

        {/* TOTAL INCOME */}

        <div className="analytics-summary-card income-card">

          <div className="summary-icon income-icon">
            ↗
          </div>

          <div className="summary-content">

            <span>
              Total Income
            </span>

            <strong>
              {formatCurrency(totalIncome)}
            </strong>

            {incomeChange !== null && (
              <div className="summary-change positive">

                ↗{" "}
                {Math.abs(
                  incomeChange
                ).toFixed(0)}
                %

                <small>
                  {incomeChange >= 0
                    ? " vs last month"
                    : " below last month"}
                </small>

              </div>
            )}

          </div>

        </div>

        {/* TOTAL EXPENSES */}

        <div className="analytics-summary-card expense-card">

          <div className="summary-icon expense-icon">
            ↓
          </div>

          <div className="summary-content">

            <span>
              Total Expenses
            </span>

            <strong>
              {formatCurrency(totalExpenses)}
            </strong>

            {expenseChange !== null && (
              <div
                className={`summary-change ${
                  expenseChange > 0
                    ? "negative"
                    : "positive"
                }`}
              >

                {expenseChange > 0
                  ? "↗"
                  : "↘"}{" "}

                {Math.abs(
                  expenseChange
                ).toFixed(0)}
                %

                <small>
                  vs last month
                </small>

              </div>
            )}

          </div>

        </div>

        {/* CURRENT BALANCE */}

        <div className="analytics-summary-card balance-card">

          <div className="summary-icon balance-icon">
            ₹
          </div>

          <div className="summary-content">

            <span>
              Current Balance
            </span>

            <strong>
              {formatCurrency(
                currentBalance
              )}
            </strong>

          </div>

        </div>

      </div>

      {/* =================================================
          CHART SECTION
          ================================================= */}

      <div className="analytics-chart-grid">

        {/* =================================================
            SPENDING BY CATEGORY
            ================================================= */}

        <div className="analytics-panel category-panel">

          <div className="analytics-panel-header">

            <div>

              <h2>
                ◔ Spending by Category
              </h2>

              <p>
                See where your money is going
              </p>

            </div>

            <span className="panel-menu">
              •••
            </span>

          </div>

          <div className="category-chart-layout">

            {/* PIE CHART */}

            <div className="category-chart">

              {categoryData.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={270}
                >
                  <PieChart>

                    <Pie
                      data={categoryData.map(
                        (entry) => ({
                          ...entry,
                          fill: getCategoryColor(
                            Number(
                              entry.amount
                            )
                          ),
                        })
                      )}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={88}
                      innerRadius={54}
                      paddingAngle={1}
                    />

                    <Tooltip
                      formatter={(value) =>
                        formatCurrency(
                          value
                        )
                      }
                    />

                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-chart">
                  No category data available
                </div>
              )}

            </div>

            {/* CATEGORY LIST */}

            <div className="category-list">

              {sortedCategories.map(
                (item, index) => (
                  <div
                    className="category-list-item"
                    key={`${item.category}-${index}`}
                  >

                    <div className="category-name">

                      <span
                        className="category-dot"
                        style={{
                          background:
                            getCategoryColor(
                              item.amount
                            ),
                        }}
                      ></span>

                      <span>
                        {item.category}
                      </span>

                    </div>

                    <strong>
                      {formatCurrency(
                        item.amount
                      )}
                    </strong>

                  </div>
                )
              )}

            </div>

          </div>

          {/* CATEGORY LEGEND */}

          <div className="category-legend">

            <span>
              <i className="legend-dot red-dot"></i>
              Highest spending
            </span>

            <span>
              <i className="legend-dot yellow-dot"></i>
              Average spending
            </span>

            <span>
              <i className="legend-dot blue-dot"></i>
              Lowest spending
            </span>

          </div>

        </div>

        {/* =================================================
            MONTHLY EXPENSE TREND
            ================================================= */}

        <div className="analytics-panel trend-panel">

          <div className="analytics-panel-header">

            <div>

              <h2>
                ⌁ Monthly Expense Trend
              </h2>

              <p>
                Track how your expenses
                change over time
              </p>

            </div>

            <span className="panel-menu">
              •••
            </span>

          </div>

          <div className="trend-chart">

            {monthlyData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height={320}
              >

                <LineChart
                  data={monthlyData}
                  margin={{
                    top: 15,
                    right: 18,
                    left: 8,
                    bottom: 15,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="monthLabel"
                    tick={{
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    tick={{
                      fontSize: 12,
                    }}
                    tickFormatter={(value) => {
                      if (value >= 1000) {
                        return `${Math.round(
                          value / 1000
                        )}K`;
                      }

                      return value;
                    }}
                  />

                  {/* CUSTOM DATE TOOLTIP */}

                  <Tooltip
                    content={
                      <AnalyticsTrendTooltip />
                    }
                    cursor={{
                      stroke: "#d9dfeb",
                      strokeDasharray:
                        "4 4",
                    }}
                  />

                  {/* MONTHLY EXPENSE LINE */}

                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#E53935"
                    strokeWidth={3}
                    dot={{
                      r: 5,
                      fill: "#E53935",
                      stroke:
                        "#ffffff",
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 7,
                      fill: "#E53935",
                      stroke:
                        "#ffffff",
                      strokeWidth: 2,
                    }}
                    connectNulls
                  />

                </LineChart>

              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">
                No monthly expense data available
              </div>
            )}

          </div>

        </div>

      </div>

      {/* =================================================
          FORECAST + OVERVIEW
          ================================================= */}

      <div className="analytics-bottom-grid">

        {/* =================================================
            SPENDING FORECAST
            ================================================= */}

        <div className="analytics-panel forecast-panel">

          <div className="analytics-panel-header">

            <div>

              <h2>
                ✣ Spending Forecast
              </h2>

              <p>
                Estimated expense for your next month
              </p>

            </div>

            <span className="panel-menu">
              •••
            </span>

          </div>

          {forecastAvailable ? (
            <>

              <div className="forecast-card">

                <div className="forecast-icon">
                  ▥
                </div>

                <div className="forecast-main">

                  <span>
                    Estimated Next Month Expense
                  </span>

                  <strong>
                    {formatCurrency(
                      predictedExpense
                    )}
                  </strong>

                </div>

              </div>

              <p className="forecast-note">
                Based on your historical
                spending data
              </p>

              <p className="forecast-history">

                Historical months analyzed:{" "}

                <strong>
                  {forecast?.historical_months ??
                    0}
                </strong>

              </p>

            </>
          ) : (

            <div className="forecast-unavailable">

              <div className="forecast-unavailable-icon">
                !
              </div>

              <h3>
                Forecast unavailable
              </h3>

              <p>
                {forecast?.message ||
                  "More historical expense data is required to generate a spending forecast."}
              </p>

            </div>

          )}

        </div>

        {/* =================================================
            SPENDING OVERVIEW
            ================================================= */}

        <div className="analytics-panel overview-panel">

          <div className="analytics-panel-header">

            <div>

              <h2>
                💡 Spending Overview
              </h2>

              <p>
                Key insights from your spending
              </p>

            </div>

            <span className="panel-menu">
              •••
            </span>

          </div>

          <div className="overview-content">

            <div className="overview-icon">
              ◎
            </div>

            <div className="overview-list">

              {highestCategory && (
                <div className="overview-item">

                  <span>›</span>

                  <p>
                    Your highest spending
                    category is{" "}

                    <strong>
                      {highestCategory.category}
                    </strong>
                    .
                  </p>

                </div>
              )}

              <div className="overview-item">

                <span>›</span>

                <p>

                  Your expenses this month are{" "}

                  <strong>
                    {formatCurrency(
                      currentMonthExpenses
                    )}
                  </strong>
                  .

                </p>

              </div>

              {expenseChange !== null && (
                <div className="overview-item">

                  <span>›</span>

                  <p>

                    Your spending has{" "}

                    <strong>
                      {expenseChange >= 0
                        ? "increased"
                        : "decreased"}{" "}
                      by{" "}
                      {Math.abs(
                        expenseChange
                      ).toFixed(0)}
                      %
                    </strong>{" "}

                    compared to last month.

                  </p>

                </div>
              )}

              {insightMessages.length > 0 &&
                insightMessages
                  .slice(0, 1)
                  .map(
                    (message, index) => (
                      <div
                        className="overview-item"
                        key={`insight-${index}`}
                      >

                        <span>›</span>

                        <p>
                          {message}
                        </p>

                      </div>
                    )
                  )}

            </div>

          </div>

          <div className="overview-footer">

            <span>
              Keep track
            </span>

            <span>
              Stay in control!
            </span>

          </div>

        </div>

      </div>

    </div>
  );
};

export default Analytics;