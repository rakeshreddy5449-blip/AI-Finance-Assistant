import { useCallback, useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import api from "../services/api";
import TransactionForm from "./TransactionForm";

function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [insights, setInsights] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setError("");

      const [dashboardResponse, transactionsResponse, insightsResponse] =
        await Promise.all([
          api.get("/dashboard"),
          api.get("/transactions"),
          api.get("/insights"),
        ]);

      setDashboard(dashboardResponse.data);
      setTransactions(transactionsResponse.data);
      setInsights(insightsResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  let cancelled = false;

  Promise.all([
    api.get("/dashboard"),
    api.get("/transactions"),
    api.get("/insights"),
  ])
    .then(([dashboardResponse, transactionsResponse, insightsResponse]) => {
      if (cancelled) {
        return;
      }

      setDashboard(dashboardResponse.data);
      setTransactions(transactionsResponse.data);
      setInsights(insightsResponse.data);
    })
    .catch((err) => {
      if (cancelled) {
        return;
      }

      setError(
        err.response?.data?.detail ||
          "Unable to load dashboard data."
      );
    })
    .finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

  return () => {
    cancelled = true;
  };
}, []);

  if (loading) {
    return (
      <div className="dashboard-card">
        <p>Loading your financial dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-card">
        <p>{error}</p>
      </div>
    );
  }

  const categoryData = Object.entries(
    dashboard?.category_spending || {}
  ).map(([category, amount]) => ({
    category,
    amount: Number(amount),
  }));

  const monthlyData = (
    dashboard?.monthly_trends || []
  ).map((item) => ({
    month: item.month,
    expenses: Number(item.expenses),
  }));

  const recentTransactions = [...transactions]
    .sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    })
    .slice(0, 5);

  const totalIncome = Number(dashboard?.total_income || 0);
  const totalExpenses = Number(dashboard?.total_expenses || 0);
  const balance = Number(dashboard?.balance || 0);
  const monthlySavings = Number(
    dashboard?.current_month?.savings || 0
  );

  const savingsRate = Number(
    dashboard?.current_month?.savings_rate || 0
  );

  const firstInsight = insights?.insights?.[0];

    const mainInsight =
        typeof firstInsight === "string"
        ? firstInsight
        : firstInsight?.message ||
        insights?.messages?.[0] ||
        insights?.insight ||
        "Keep tracking your expenses to receive personalized financial insights.";

  return (
    <div>
      {/* WELCOME */}
      <section className="welcome-section">
        <h2>Good evening, Rakesh 👋</h2>

        <p>
          Here's a simple overview of your financial activity.
        </p>
      </section>

      {/* SUMMARY CARDS */}
      <section className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-header">
            <h3>Total Income</h3>
            <div className="summary-icon">↗</div>
          </div>

          <p className="summary-value">
            ₹{totalIncome.toLocaleString()}
          </p>

          <p className="summary-subtitle">
            All recorded income
          </p>
        </div>

        <div className="summary-card">
          <div className="summary-card-header">
            <h3>Total Expenses</h3>
            <div className="summary-icon">↘</div>
          </div>

          <p className="summary-value">
            ₹{totalExpenses.toLocaleString()}
          </p>

          <p className="summary-subtitle">
            All recorded expenses
          </p>
        </div>

        <div className="summary-card">
          <div className="summary-card-header">
            <h3>Balance</h3>
            <div className="summary-icon">₹</div>
          </div>

          <p className="summary-value">
            ₹{balance.toLocaleString()}
          </p>

          <p className="summary-subtitle">
            Income minus expenses
          </p>
        </div>

        <div className="summary-card">
          <div className="summary-card-header">
            <h3>Monthly Savings</h3>
            <div className="summary-icon">★</div>
          </div>

          <p className="summary-value">
            ₹{monthlySavings.toLocaleString()}
          </p>

          <p className="summary-subtitle">
            Savings rate: {savingsRate.toFixed(1)}%
          </p>
        </div>
      </section>

      {/* CHARTS */}
      <section className="chart-grid">
        <div className="dashboard-card">
          <h3>Spending by Category</h3>

          <p className="card-description">
            Understand where your money is going.
          </p>

          {categoryData.length === 0 ? (
            <p>No expense data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={105}
                  label
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`category-${index}`} />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value) => `₹${value}`}
                />

                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="dashboard-card">
          <h3>Monthly Expense Trend</h3>

          <p className="card-description">
            Track how your expenses change over time.
          </p>

          {monthlyData.length === 0 ? (
            <p>No monthly expense data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="month" />

                <YAxis />

                <Tooltip
                  formatter={(value) => `₹${value}`}
                />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ADD TRANSACTION */}
      <section className="dashboard-card transaction-card">
        <h3>Add Transaction</h3>

        <p className="card-description">
          Record your income or expense. Expense categories are
          automatically detected by the AI model.
        </p>

        <TransactionForm
          onTransactionAdded={loadDashboard}
        />

        <div className="ai-note">
          🤖 AI categorization is automatic for expense
          transactions. You can review the predicted category
          after adding a transaction.
        </div>
      </section>

      {/* LOWER SECTION */}
      <section className="lower-grid">
        {/* RECENT TRANSACTIONS */}
        <div className="dashboard-card">
          <h3>Recent Transactions</h3>

          <p className="card-description">
            Your latest recorded financial activity.
          </p>

          {recentTransactions.length === 0 ? (
            <p>No transactions available.</p>
          ) : (
            <div className="transaction-list">
              {recentTransactions.map((transaction) => (
                <div
                  className="transaction-row"
                  key={transaction.transaction_id}
                >
                  <div className="transaction-info">
                    <div className="transaction-icon">
                      {transaction.type === "income"
                        ? "↗"
                        : "↘"}
                    </div>

                    <div>
                      <div className="transaction-description">
                        {transaction.description}
                      </div>

                      <div className="transaction-category">
                        {transaction.category} •{" "}
                        {transaction.date}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`transaction-amount ${
                      transaction.type === "income"
                        ? "income"
                        : "expense"
                    }`}
                  >
                    {transaction.type === "income"
                      ? "+"
                      : "-"}
                    ₹
                    {Number(
                      transaction.amount
                    ).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI INSIGHT */}
        <div className="dashboard-card">
          <h3>AI Financial Insight</h3>

          <p className="card-description">
            Simple observations based on your spending.
          </p>

          <div className="insight-box">
            <h4>💡 Your Finance Assistant</h4>

            <p>{mainInsight}</p>
          </div>

          <p className="card-description">
            Insights are educational suggestions based on your
            recorded financial activity and are not professional
            financial advice.
          </p>
        </div>
      </section>

      {/* CHATBOT ENTRY */}
      <button
        className="chatbot-button"
        title="Open AI Finance Chat"
        onClick={() => {
          alert(
            "AI Finance Chat will be connected here next."
          );
        }}
      >
        🤖
      </button>
    </div>
  );
}

export default Dashboard;