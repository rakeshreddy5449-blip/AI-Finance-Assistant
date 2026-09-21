import { useEffect, useState } from "react";
import api from "./services/api";
import Dashboard from "./components/Dashboard";
import Transactions from "./components/Transactions";
import Analytics from "./components/Analytics";
import Budgets from "./components/Budgets";
import Insights from "./components/Insights";
import "./App.css";

function App() {
  const [mode, setMode] = useState("login");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem("token"))
  );

  const [activePage, setActivePage] = useState("Dashboard");
  useEffect(() => {
  const handleAuthExpired = () => {
    setLoggedIn(false);
    setActivePage("Dashboard");
  };

  window.addEventListener(
    "auth-expired",
    handleAuthExpired
  );

  return () => {
    window.removeEventListener(
      "auth-expired",
      handleAuthExpired
    );
  };
}, []);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      if (mode === "register") {
        await api.post("/register", {
          name: form.name,
          email: form.email,
          password: form.password,
        });

        setMessage("Registration successful. Please login.");
        setMode("login");

        return;
      }

      const response = await api.post("/login", {
        email: form.email,
        password: form.password,
      });

      localStorage.setItem("token", response.data.access_token);
      setLoggedIn(true);
      setMessage("");
    } catch (error) {
      setMessage(
        error.response?.data?.detail ||
          "Something went wrong. Please try again."
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setLoggedIn(false);
    setActivePage("Dashboard");
  };

  if (!loggedIn) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">₹</div>

          <h1>AI Finance Assistant</h1>

          <p>
            {mode === "login"
              ? "Login to manage your finances"
              : "Create your personal finance account"}
          </p>

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <input
                type="text"
                name="name"
                placeholder="Full name"
                value={form.name}
                onChange={handleChange}
                required
              />
            )}

            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={form.email}
              onChange={handleChange}
              required
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
            />

            <button type="submit">
              {mode === "login" ? "Login" : "Create Account"}
            </button>
          </form>

          {message && <p>{message}</p>}

          <div className="auth-switch">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setMessage("");
                  }}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setMessage("");
                  }}
                >
                  Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="finance-app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">₹</div>

          <div className="brand-text">
            <h2>AI Finance</h2>
            <span>Personal Assistant</span>
          </div>
        </div>

        <nav className="nav-menu">
          <button
            className={`nav-item ${
              activePage === "Dashboard" ? "active" : ""
            }`}
            onClick={() => setActivePage("Dashboard")}
          >
            <span>🏠</span>
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "Transactions" ? "active" : ""
            }`}
            onClick={() => setActivePage("Transactions")}
          >
            <span>💳</span>
            <span>Transactions</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "Analytics" ? "active" : ""
            }`}
            onClick={() => setActivePage("Analytics")}
          >
            <span>📊</span>
            <span>Analytics</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "Budgets" ? "active" : ""
            }`}
            onClick={() => setActivePage("Budgets")}
          >
            <span>🎯</span>
            <span>Budgets</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "Insights" ? "active" : ""
            }`}
            onClick={() => setActivePage("Insights")}
          >
            <span>💡</span>
            <span>Insights</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "AI Chat" ? "active" : ""
            }`}
            onClick={() => setActivePage("AI Chat")}
          >
            <span>🤖</span>
            <span>AI Chat</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "Profile" ? "active" : ""
            }`}
            onClick={() => setActivePage("Profile")}
          >
            <span>👤</span>
            <span>Profile</span>
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{activePage}</h1>
            <p>Manage and understand your personal finances</p>
          </div>

          <div className="user-area">
            <div className="user-avatar">R</div>

            <span className="user-name">Rakesh</span>

            <button
              className="logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="dashboard-content">
          {activePage === "Dashboard" ? (
            <Dashboard />
          ) : activePage === "Transactions" ? (
            <Transactions />
          ) : activePage === "Analytics" ? (
            <Analytics />
          ) : activePage === "Budgets" ? (
            <Budgets />
          ) : activePage === "Insights" ? (
            <Insights />
          ) : (
            <div className="page-placeholder">
              <h2>{activePage}</h2>
              <p>
                This section will be connected to the corresponding
                finance feature next.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;