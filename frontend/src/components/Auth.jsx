import React, { useState } from "react";
import { api, saveAuth } from "../services/api";
import { Eye, EyeOff } from "lucide-react";

export default function Auth({ onAuthSuccess, onNavigate }) {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Farmer", // display label; we'll normalize to lowercase before sending
  });
  const [showPw, setShowPw] = useState(false);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  function normalizeRole(label) {
    // convert "Farmer"/"Buyer" → "farmer"/"buyer"
    return String(label || "").trim().toLowerCase();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return; // prevent double submits
    setError("");
    setLoading(true);
    try {
      const email = form.email.trim();
      const password = form.password; // keep as typed
      const name = form.name.trim();

      const payload =
        mode === "login"
          ? { email, password }
          : {
              name,
              email,
              password,
              role: normalizeRole(form.role),
            };

      const data = mode === "login" ? await api.login(payload) : await api.signup(payload);
      // Expect backend to return: { token, user }
      if (!data?.user || !data?.token) {
        throw new Error("Invalid auth response from server");
      }

      // Persist in localStorage for route guards
      saveAuth({ token: data.token, user: data.user });

      // Let App.jsx store user in state
      onAuthSuccess(data.user);

      // Route based on role
      const role = String(data.user?.role || "").toLowerCase();
      if (role === "farmer") {
        onNavigate("dashboard");
      } else {
        // Buyers (or any other role) -> marketplace
        onNavigate("marketplace");
      }
    } catch (err) {
      setError(err?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-[70vh] flex items-center justify-center bg-white px-3 sm:px-0"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="w-full max-w-md bg-white border border-green-100 rounded-2xl shadow-sm p-6 sm:p-6">
        {/* Brand mark */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold">F</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-center text-2xl font-bold text-green-800">
          {mode === "login" ? "Login to Farmunity" : "Create your Farmunity account"}
        </h2>

        {/* Mode Switch (stacked on mobile, unchanged on desktop) */}
        <div className="mt-4 flex gap-2 justify-center">
          <button
            type="button"
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              mode === "login" ? "bg-green-600 text-white" : "bg-green-50 text-green-700"
            }`}
            onClick={() => setMode("login")}
            disabled={loading}
          >
            Login
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              mode === "signup" ? "bg-green-600 text-white" : "bg-green-50 text-green-700"
            }`}
            onClick={() => setMode("signup")}
            disabled={loading}
          >
            Sign up
          </button>
        </div>

        {/* Form */}
        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          {mode === "signup" && (
            <>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Full Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-[16px]"
                  placeholder="e.g., Rohan Kumar"
                  required
                  autoComplete="name"
                  autoCapitalize="words"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Role</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={onChange}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-[16px]"
                  aria-label="Choose role"
                >
                  <option>Farmer</option>
                  <option>Buyer</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-[16px]"
              placeholder="you@example.com"
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={onChange}
                className="w-full border rounded-md px-3 py-2 pr-11 focus:outline-none focus:ring-2 focus:ring-green-500 text-[16px]"
                placeholder="••••••••"
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                enterKeyHint={mode === "login" ? "go" : "done"}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                aria-label={showPw ? "Hide password" : "Show password"}
                tabIndex={0}
              >
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {/* Mobile helper: keep min 16px font-size to avoid iOS zoom */}
            <p className="sr-only">Password field uses large font size to avoid zoom on mobile.</p>
          </div>

          {error && (
            <div
              className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-2"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium rounded-md py-2 transition-colors disabled:opacity-60"
          >
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </button>

          {/* Subtext (kept subtle; helpful on phones) */}
          <p className="text-[12px] text-gray-500 text-center">
            By continuing, you agree to our{" "}
            <span className="underline">Terms</span> and{" "}
            <span className="underline">Privacy Policy</span>.
          </p>
        </form>
      </div>
    </div>
  );
}
