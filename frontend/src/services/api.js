// frontend/src/services/api.js

// ---- Base URL ----
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ---- Auth header helper ----
export function authHeaders() {
  const raw = localStorage.getItem("auth");
  if (!raw) return {};
  try {
    const { token } = JSON.parse(raw);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

// ---- Low-level request wrapper ----
async function req(path, options = {}) {
  let resp;
  try {
    resp = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
  } catch (networkErr) {
    // Network/CORS failures won't have a response
    throw new Error(`Network error: ${networkErr.message}`);
  }

  let data = {};
  try {
    data = await resp.json();
  } catch {
    // non-JSON response (e.g., 500 with HTML) -> keep data = {}
  }

  // Optional global 401 handling
  if (resp.status === 401) {
    // Clear auth for safety so protected pages can redirect
    localStorage.removeItem("auth");
  }

  if (!resp.ok) {
    // Prefer backend-provided message, else include status code
    const msg = data?.error || `HTTP ${resp.status} ${resp.statusText}` || "Request failed";
    throw new Error(msg);
  }

  return data;
}

// ---- Public helpers for saving/reading auth ----
export function saveAuth({ token, user }) {
  localStorage.setItem("auth", JSON.stringify({ token, user }));
}
export function getAuth() {
  const raw = localStorage.getItem("auth");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function clearAuth() {
  localStorage.removeItem("auth");
}

// ---- API surface ----
export const api = {
  // ----- Auth -----
  signup: (payload) =>
    req("/api/auth/signup", { method: "POST", body: JSON.stringify(payload) }),

  login: (payload) =>
    req("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),

  me: () => req("/api/auth/me", { headers: { ...authHeaders() } }),

  // ----- Example secure sample (optional) -----
  getSecureSample: () =>
    req("/api/secure/sample", { headers: { ...authHeaders() } }),

  // ----- CROPS (protected) -----
  // Accepts optional filters: { q, category, minPrice, maxPrice, limit, skip, sort, order }
  getCrops: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString() ? `?${params.toString()}` : "";
    return req(`/api/crops${qs}`, { headers: { ...authHeaders() } });
  },

  // Stubs if you later add these endpoints on the backend
  getEquipment: () => req("/api/equipment", { headers: { ...authHeaders() } }),
  getKnowledge: () => req("/api/knowledge", { headers: { ...authHeaders() } }),

  // Dashboard summary (protected)
  getDashboardSummary: () =>
    req("/api/dashboard/summary", { headers: { ...authHeaders() } }),

  // ----- CHAT (protected) -----
  // Start (or fetch) a conversation with a seller for a given crop
  startConversation: ({ recipientId, cropId }) =>
    req("/api/chat/start", {
      method: "POST",
      headers: { ...authHeaders() },
      body: JSON.stringify({ recipientId, cropId }),
    }),

  // List my conversations
  getConversations: () =>
    req("/api/chat/conversations", { headers: { ...authHeaders() } }),

  // Get messages in a conversation
  getMessages: (conversationId) =>
    req(`/api/chat/messages/${conversationId}`, {
      headers: { ...authHeaders() },
    }),

  // Send a message
  sendMessage: ({ conversationId, text }) =>
    req("/api/chat/messages", {
      method: "POST",
      headers: { ...authHeaders() },
      body: JSON.stringify({ conversationId, text }),
    }),
};

export default api;
