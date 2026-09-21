import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const expenseCategories = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Other",
];

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    type: "expense",
    category: "",
  });

  useEffect(() => {
    let cancelled = false;

    api
      .get("/transactions")
      .then((response) => {
        if (cancelled) return;

        setTransactions(response.data);
      })
      .catch((err) => {
        if (cancelled) return;

        setError(
          err.response?.data?.detail ||
            "Unable to load transactions. Please try again."
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

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const description = String(
        transaction.description || ""
      ).toLowerCase();

      const category = String(
        transaction.category || ""
      ).toLowerCase();

      const searchText = search.toLowerCase();

      const matchesSearch =
        description.includes(searchText) ||
        category.includes(searchText);

      const matchesType =
        typeFilter === "all" ||
        String(transaction.type || "").toLowerCase() === typeFilter;

      const matchesCategory =
        categoryFilter === "all" ||
        String(transaction.category || "").toLowerCase() ===
          categoryFilter.toLowerCase();

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, search, typeFilter, categoryFilter]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const openAddModal = () => {
    setError("");

    setFormData({
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: "",
      type: "expense",
      category: "",
    });

    setShowAddModal(true);
  };

  const closeAddModal = () => {
    if (!submitting) {
      setShowAddModal(false);
    }
  };

  const handleAddTransaction = async (event) => {
    event.preventDefault();

    if (!formData.description.trim()) {
      setError("Please enter a transaction description.");
      return;
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        date: formData.date,
        description: formData.description.trim(),
        amount: Number(formData.amount),
        type: formData.type,
        category: formData.category || null,
      };

      const response = await api.post("/transactions", payload);

      setTransactions((current) => [response.data, ...current]);
      setShowAddModal(false);

      setFormData({
        date: new Date().toISOString().split("T")[0],
        description: "",
        amount: "",
        type: "expense",
        category: "",
      });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to add the transaction. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (transactionId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this transaction?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(`/transactions/${transactionId}`);

      setTransactions((currentTransactions) =>
        currentTransactions.filter(
          (transaction) =>
            transaction.transaction_id !== transactionId
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to delete the transaction."
      );
    }
  };

  const handleEdit = () => {
    window.alert(
      "Transaction editing will be connected in the next step."
    );
  };

  const formatAmount = (transaction) => {
    const amount = Number(transaction.amount || 0);
    const isIncome = transaction.type === "income";

    return `${isIncome ? "+" : "-"}₹${amount.toLocaleString("en-IN")}`;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "-";
    }

    return new Date(dateValue).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="transactions-page">
      <section className="page-intro-card">
        <div className="transactions-heading">
          <div className="transactions-heading-icon">▣</div>

          <div>
            <h2>Transactions</h2>
            <p>
              View, add and manage your financial transactions.
            </p>
          </div>
        </div>

        <button
          className="primary-action-button"
          onClick={openAddModal}
        >
          + Add Transaction
        </button>
      </section>

      <section className="transactions-card">
        <div className="transactions-toolbar">
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">All Categories</option>

            {expenseCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="transactions-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="transactions-empty-state">
            Loading transactions...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="transactions-empty-state">
            No transactions found.
          </div>
        ) : (
          <div className="transactions-table-wrapper">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.map((transaction) => {
                  const isIncome =
                    transaction.type === "income";

                  return (
                    <tr key={transaction.transaction_id}>
                      <td>{formatDate(transaction.date)}</td>

                      <td className="transaction-description">
                        {transaction.description}
                      </td>

                      <td
                        className={
                          isIncome
                            ? "transaction-income"
                            : "transaction-expense"
                        }
                      >
                        {formatAmount(transaction)}
                      </td>

                      <td>
                        <span
                          className={
                            isIncome
                              ? "type-badge income-badge"
                              : "type-badge expense-badge"
                          }
                        >
                          {isIncome ? "Income" : "Expense"}
                        </span>
                      </td>

                      <td>
                        <span className="category-badge">
                          {transaction.category || "Other"}
                        </span>
                      </td>

                      <td>
                        <div className="transaction-actions">
                          <button
                            className="edit-button"
                            onClick={handleEdit}
                            title="Edit transaction"
                          >
                            ✏️
                          </button>

                          <button
                            className="delete-button"
                            onClick={() =>
                              handleDelete(transaction.transaction_id)
                            }
                            title="Delete transaction"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="transaction-count">
          Showing {filteredTransactions.length} of{" "}
          {transactions.length} transactions
        </div>
      </section>

      <section className="ai-category-note">
        <span className="ai-category-icon">🤖</span>

        <div>
          <strong>AI expense categorization</strong>

          <p>
            Categories for expense transactions are automatically
            suggested by our ML model. You can review the category
            when needed.
          </p>
        </div>
      </section>

      {showAddModal && (
        <div
          className="transaction-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAddModal();
            }
          }}
        >
          <div className="transaction-modal">
            <div className="transaction-modal-header">
              <div>
                <h3>Add Transaction</h3>
                <p>
                  Record your income or expense. Category will be
                  suggested by AI.
                </p>
              </div>

              <button
                className="modal-close-button"
                onClick={closeAddModal}
                disabled={submitting}
                type="button"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddTransaction}>
              <div className="modal-form-field">
                <label htmlFor="transaction-date">
                  Date
                </label>

                <input
                  id="transaction-date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="modal-form-field">
                <label htmlFor="transaction-description">
                  Description
                </label>

                <input
                  id="transaction-description"
                  name="description"
                  type="text"
                  placeholder="e.g. Uber ride"
                  value={formData.description}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="modal-form-field">
                <label htmlFor="transaction-amount">
                  Amount
                </label>

                <div className="amount-input-wrapper">
                  <span>₹</span>

                  <input
                    id="transaction-amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 500"
                    value={formData.amount}
                    onChange={handleFormChange}
                    required
                  />
                </div>
              </div>

              <div className="modal-form-field">
                <label htmlFor="transaction-type">
                  Type
                </label>

                <select
                  id="transaction-type"
                  name="type"
                  value={formData.type}
                  onChange={handleFormChange}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              {formData.type === "expense" && (
                <div className="modal-form-field">
                  <label htmlFor="transaction-category">
                    Category
                  </label>

                  <select
                    id="transaction-category"
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                  >
                    <option value="">
                      Auto-detect category
                    </option>

                    {expenseCategories.map((category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.type === "expense" && (
                <div className="modal-ai-note">
                  🤖 AI categorization is automatic for expense
                  transactions. Leave the category as Auto-detect
                  to use the ML model.
                </div>
              )}

              {error && (
                <div className="modal-error">
                  {error}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-cancel-button"
                  onClick={closeAddModal}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="modal-submit-button"
                  disabled={submitting}
                >
                  {submitting
                    ? "Adding..."
                    : "Add Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transactions;