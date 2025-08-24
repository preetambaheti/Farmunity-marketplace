// frontend/src/services/api.js

// ---- Base URL ----
const API_URL = import.meta.env.VITE_API_URL;

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

// ---- Fetch with timeout ----
async function fetchWithTimeout(resource, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// ---- Low-level request wrapper ----
// Auto-sets JSON Content-Type unless the body is FormData
async function req(path, options = {}) {
  let resp;

  const isFormData = options?.body instanceof FormData;
  const baseHeaders = isFormData ? {} : { "Content-Type": "application/json" };
  const headers = { ...baseHeaders, ...(options.headers || {}) };
  const timeoutMs = options.timeoutMs || 10000;

  try {
    resp = await fetchWithTimeout(`${API_URL}${path}`, { ...options, headers }, timeoutMs);
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
  // ===== Infra warmup =====
  /** Ping tiny endpoints at boot to avoid first-request cold start lag. */
  prewarm: async () => {
    try {
      await Promise.race([
        req("/api/health", { timeoutMs: 5000 }),
        new Promise((_, r) => setTimeout(() => r(new Error("warmup timeout")), 5000)),
      ]);
      // Optionally also touch DB health (non-blocking)
      req("/api/health/db", { timeoutMs: 5000 }).catch(() => {});
    } catch { /* ignore */ }
  },

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
   * Supports: name, location, phone, avatarUrl, preferredLanguage, crops (array), soil (object)
   * @param {Object} payload
   * @returns {Promise<{user: object}>}
   */
  updateProfile: (payload) =>
    req("/api/users/me", {
      method: "PUT",
      headers: { ...authHeaders() },
      body: JSON.stringify(payload),
    }),

  // ===== Crops (protected) =====
  // List (generic filters, protected)
  getCrops: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString() ? `?${params.toString()}` : "";
    return req(`/api/crops${qs}`, { headers: { ...authHeaders() } });
  },

  // Create a crop listing (expects: { farmer, crop, quantity, price, location, quality })
  createCrop: (payload) =>
    req("/api/crops", {
      method: "POST",
      headers: { ...authHeaders() },
      body: JSON.stringify(payload),
    }),

  // Get only current farmer's crops (with inquiries/status)
  getMyCrops: () =>
    req("/api/crops/mine", { headers: { ...authHeaders() } }),

  // Delete a crop (owner only)
  deleteCrop: (id) =>
    req(`/api/crops/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    }),

  // Optional realtime via SSE (if backend enabled)
  openCropsStream(onMessage) {
    const ev = new EventSource(`${API_URL}/api/crops/stream`.replace(`${API_URL}//`, `${API_URL}/`));
    ev.onmessage = (e) => {
      try { onMessage?.(JSON.parse(e.data)); } catch {}
    };
    ev.onerror = () => ev.close();
    return () => ev.close();
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
    const ev = new EventSource(`${API_URL}/api/equipment/stream`.replace(`${API_URL}//`, `${API_URL}/`));
    ev.onmessage = (e) => {
      try { onMessage?.(JSON.parse(e.data)); } catch {}
    };
    ev.onerror = () => ev.close();
    return () => ev.close();
  },

  // ===== Equipment (mine, protected) =====
  getMyEquipment: () =>
    req("/api/equipment/mine", { headers: { ...authHeaders() } }),

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

  // ===== AI Assistant (Gemini-backed, protected) =====
  /**
   * Ask the AI assistant (Gemini). If you pass a sessionId, conversation is continued.
   * Returns: { sessionId, reply }
   */
  aiAsk: ({ message, sessionId = null }) =>
    req("/api/ai/ask", {
      method: "POST",
      headers: { ...authHeaders() },
      body: JSON.stringify({ message, sessionId }),
    }),

  /** List my AI chat sessions (latest first) */
  aiListSessions: () =>
    req("/api/ai/sessions", { headers: { ...authHeaders() } }),

  /** Get a specific AI session with messages */
  aiGetSession: (sid) =>
    req(`/api/ai/sessions/${sid}`, { headers: { ...authHeaders() } }),

  /** Delete an AI session */
  aiDeleteSession: (sid) =>
    req(`/api/ai/sessions/${sid}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    }),

  // ===== Forum / Community =====
  forumList: (params = {}, fetchOptions = {}) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") sp.append(k, v);
    });
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return req(`/api/forum/discussions${qs}`, fetchOptions);
  },

  forumCreate: ({ title, text, category }) =>
    req("/api/forum/discussions", {
      method: "POST",
      headers: { ...authHeaders() },
      body: JSON.stringify({ title, text, category }),
    }),

  forumReply: (id, { text }) =>
    req(`/api/forum/discussions/${id}/replies`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: JSON.stringify({ text }),
    }),

  // ===== Weather =====
  weatherNow: ({ lat, lon, q } = {}) => {
    const sp = new URLSearchParams();
    if (lat != null) sp.append("lat", lat);
    if (lon != null) sp.append("lon", lon);
    if (q) sp.append("q", q);
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return req(`/api/weather/now${qs}`);
  },

  weatherAdvisory: ({ lat, lon, q } = {}) =>
    req(
      `/api/weather/advisory${
        (() => {
          const sp = new URLSearchParams();
          if (lat != null) sp.append("lat", lat);
          if (lon != null) sp.append("lon", lon);
          if (q) sp.append("q", q);
          const qs = sp.toString() ? `?${sp.toString()}` : "";
          return qs;
        })()
      }`,
      { headers: { ...authHeaders() } }
    ),

  // ===== Notifications (protected) =====
  myNotifications: () =>
    req("/api/notifications", { headers: { ...authHeaders() } }),

  // =========================
  // === PRICE AGGREGATION ===
  // =========================

  /** Get list of states that have price data for today (sorted). */
  getStates: () => req("/api/states"),

  /**
   * Get today’s market prices for the six crops for a given state & type.
   * @param {{state?: string, type?: 'wholesale'|'retail'}} params
   * @returns {Promise<{state:string,type:string,date:string,items:Array}>}
   */
  getTodayPrices: ({ state = "Karnataka", type = "wholesale" } = {}) => {
    const s = encodeURIComponent(state);
    const t = encodeURIComponent(type);
    return req(`/api/prices/today?state=${s}&type=${t}`);
  },

  // ===============================
  // === CERTIFICATION ENDPOINTS ===
  // ===============================

  /**
   * Upload invoice + certificate files for a specific equipment.
   * payload: { invoice: File, certificate: File, issuer?, certificateNo?, issueDate?, expiryDate? }
   * NOTE: Do NOT set Content-Type manually; browser sets multipart boundary.
   */
  async uploadCerts(equipmentId, payload) {
    const fd = new FormData();
    fd.append("invoice", payload.invoice);
    fd.append("certificate", payload.certificate);
    if (payload.issuer) fd.append("issuer", payload.issuer);
    if (payload.certificateNo) fd.append("certificateNo", payload.certificateNo);
    if (payload.issueDate) fd.append("issueDate", payload.issueDate);
    if (payload.expiryDate) fd.append("expiryDate", payload.expiryDate);

    // Use direct fetch to avoid the JSON header; only auth header is added
    const resp = await fetch(`${API_URL}/api/equipment/${equipmentId}/certs`, {
      method: "POST",
      headers: { ...(authHeaders()) }, // no Content-Type on purpose
      body: fd,
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data?.error || "Upload failed");
    return data;
  },

  /** Admin: list all pending certification requests */
  getPendingCerts: () =>
    req("/api/admin/certs/pending", { headers: { ...authHeaders() } }),

  /**
   * Admin: approve or reject a specific equipment certification
   * body: { approve: boolean, notes?, expiryDate? }
   */
  approveCert: (equipmentId, body) =>
    req(`/api/admin/certs/${equipmentId}/approve`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: JSON.stringify(body),
    }),
};

export default api;
