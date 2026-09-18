import { useState } from "react";
import api from "../services/api";

function TransactionForm({ onTransactionAdded }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    type: "expense",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await api.post("/transactions", {
        date: form.date,
        description: form.description,
        amount: Number(form.amount),
        type: form.type,
      });

      setMessage(
        `Transaction added. Category: ${response.data.category}`
      );

      setForm({
        date: new Date().toISOString().split("T")[0],
        description: "",
        amount: "",
        type: "expense",
      });

      if (onTransactionAdded) {
        onTransactionAdded(response.data);
      }
    } catch (error) {
      setMessage(
        error.response?.data?.detail ||
          "Unable to add transaction."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form
        className="transaction-form"
        onSubmit={handleSubmit}
      >
        <div className="form-field">
          <label htmlFor="transaction-date">
            Date
          </label>

          <input
            id="transaction-date"
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="transaction-description">
            Description
          </label>

          <input
            id="transaction-description"
            type="text"
            name="description"
            placeholder="e.g. Uber ride"
            value={form.description}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="transaction-amount">
            Amount
          </label>

          <input
            id="transaction-amount"
            type="number"
            name="amount"
            placeholder="₹ Amount"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="transaction-type">
            Type
          </label>

          <select
            id="transaction-type"
            name="type"
            value={form.type}
            onChange={handleChange}
          >
            <option value="expense">
              Expense
            </option>

            <option value="income">
              Income
            </option>
          </select>
        </div>

        <button
          className="add-button"
          type="submit"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Transaction"}
        </button>
      </form>

      {message && (
        <p>{message}</p>
      )}
    </div>
  );
}

export default TransactionForm;