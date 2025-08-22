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
    throw new Error(`Network error: ${networkErr.message}`);
  }

  let data = {};
  try {
    data = await resp.json();
  } catch {
    // non-JSON response is fine
  }

  // Optional global 401 handling
  if (resp.status === 401) {
    localStorage.removeItem("auth");
  }

  if (!resp.ok) {
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
// Update only the cached user object (handy after /users/me updates)
export function setAuthUser(userUpdates = {}) {
  const raw = localStorage.getItem("auth");
  if (!raw) return;
  try {
    const blob = JSON.parse(raw);
    const next = { ...blob, user: { ...(blob.user || {}), ...userUpdates } };
    localStorage.setItem("auth", JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

// ---- API surface ----
export const api = {
  // ===== Auth =====
  signup: (payload) =>
    req("/api/auth/signup", { method: "POST", body: JSON.stringify(payload) }),

  login: (payload) =>
    req("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),

  me: () => req("/api/auth/me", { headers: { ...authHeaders() } }),

  // Example secure sample
  getSecureSample: () =>
    req("/api/secure/sample", { headers: { ...authHeaders() } }),

  // ===== User profile (protected) =====
  /**
   * Update currently logged-in user's profile
   * @param {{name?:string, location?:string, phone?:string, avatarUrl?:string}} payload
   * @returns {Promise<{user: object}>}
   */
  updateProfile: (payload) =>
    req("/api/users/me", {
      method: "PUT",
      headers: { ...authHeaders() },
      body: JSON.stringify(payload),
    }),

  // ===== Crops (protected) =====
  // filters: { q, category, minPrice, maxPrice, limit, skip, sort, order }
  getCrops: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString() ? `?${params.toString()}` : "";
    return req(`/api/crops${qs}`, { headers: { ...authHeaders() } });
  },

  // ===== Equipment (public list + protected CRUD) =====
  /**
   * List equipment with filters
   * filters: { q, category, city, available, minPrice, maxPrice, page, limit, sort }
   * sort ∈ ['price:asc','price:desc','rating:desc','latest']
   */
  getEquipment: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString() ? `?${params.toString()}` : "";
    // public endpoint (no auth header needed)
    return req(`/api/equipment${qs}`);
  },

  getEquipmentById: (id) => req(`/api/equipment/${id}`),

  createEquipment: (payload) =>
    req("/api/equipment", {
      method: "POST",
      headers: { ...authHeaders() },
      body: JSON.stringify(payload),
    }),

  updateEquipment: (id, updates) =>
    req(`/api/equipment/${id}`, {
      method: "PUT",
      headers: { ...authHeaders() },
      body: JSON.stringify(updates),
    }),

  deleteEquipment: (id) =>
    req(`/api/equipment/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    }),

  requestEquipment: (equipmentId, note) =>
    req(`/api/equipment/${equipmentId}/request`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: JSON.stringify({ note }),
    }),

  // Optional: live updates via Server-Sent Events (Atlas/replica set only)
  openEquipmentStream(onMessage) {
    const ev = new EventSource(`${API_URL}/api/equipment/stream`);
    ev.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessage?.(data);
      } catch {}
    };
    ev.onerror = () => {
      ev.close();
    };
    return () => ev.close();
  },

  // ===== Dashboard (protected) =====
  getDashboardSummary: () =>
    req("/api/dashboard/summary", { headers: { ...authHeaders() } }),

  // alias used by Dashboard.jsx (polling)
  dashboardMetrics: () =>
    req("/api/dashboard/summary", { headers: { ...authHeaders() } }),

  // ===== Chat (protected) =====
  startConversation: ({ recipientId, cropId }) =>
    req("/api/chat/start", {
      method: "POST",
      headers: { ...authHeaders() },
      body: JSON.stringify({ recipientId, cropId }),
    }),

  getConversations: () =>
    req("/api/chat/conversations", { headers: { ...authHeaders() } }),

  getMessages: (conversationId) =>
    req(`/api/chat/messages/${conversationId}`, {
      headers: { ...authHeaders() },
    }),

  sendMessage: ({ conversationId, text }) =>
    req("/api/chat/messages", {
      method: "POST",
      headers: { ...authHeaders() },
      body: JSON.stringify({ conversationId, text }),
    }),
};

export default api;
