// src/App.jsx
import React, { useEffect, useState } from "react";
import Header from "./components/Header";
import Homepage from "./components/Homepage";
import Marketplace from "./components/Marketplace";
import Equipment from "./components/Equipment";
import Knowledge from "./components/Knowledge";
import Dashboard from "./components/Dashboard";
import Footer from "./components/Footer";
import Auth from "./components/Auth";
import ChatBox from "./components/ChatBox";
import { getAuth, clearAuth, api } from "./services/api";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

const PROTECTED = new Set(["marketplace", "equipment", "knowledge", "dashboard"]);

const pageToPath = {
  home: "/",
  marketplace: "/marketplace",
  equipment: "/equipment",
  knowledge: "/knowledge",
  dashboard: "/dashboard",
  login: "/login",
};

const pathToPage = {
  "/": "home",
  "/marketplace": "marketplace",
  "/equipment": "equipment",
  "/knowledge": "knowledge",
  "/dashboard": "dashboard",
  "/login": "login",
};

function RequireAuth({ authed, children }) {
  if (!authed) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ user, role, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}

export default function App() {
  // read cached auth immediately to avoid flicker on protected routes
  const [user, setUser] = useState(() => getAuth()?.user || null);
  const isAuthed = !!user;

  const [currentPage, setCurrentPage] = useState("home");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Warm the API once on boot to reduce first-load latency (cold starts)
  useEffect(() => {
    api.prewarm?.();
  }, []);

  // keep header highlight in sync with path & close mobile menu on navigation
  useEffect(() => {
    setCurrentPage(pathToPage[location.pathname] || "home");
    setIsMenuOpen(false);
  }, [location.pathname]);

  function onNavigate(page) {
    // gate protected pages
    if (PROTECTED.has(page) && !isAuthed) {
      navigate("/login");
      return;
    }
    // farmer-only dashboard
    if (page === "dashboard" && user?.role !== "farmer") {
      navigate("/");
      return;
    }
    const path = pageToPath[page] || "/";
    navigate(path);
    setIsMenuOpen(false);
  }

  function onAuthSuccess(u) {
    // token & user already saved in Auth; just update state and route once
    setUser(u);
    const role = String(u?.role || "").toLowerCase();
    navigate(role === "farmer" ? "/dashboard" : "/marketplace", { replace: true });
  }

  function onLogout() {
    clearAuth();
    setUser(null);
    navigate("/");
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ScrollToTop />

      <Header
        currentPage={currentPage}
        onNavigate={onNavigate}
        onMenuToggle={() => setIsMenuOpen((s) => !s)}
        isMenuOpen={isMenuOpen}
        isAuthed={isAuthed}
        onLogout={onLogout}
        user={user}
      />

      <main className="flex-1">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Homepage onNavigate={onNavigate} />} />
          <Route
            path="/login"
            element={
              isAuthed ? (
                <Navigate to="/" replace />
              ) : (
                <Auth onAuthSuccess={onAuthSuccess} />
              )
            }
          />

          {/* Protected (any logged-in user) */}
          <Route
            path="/marketplace"
            element={
              <RequireAuth authed={isAuthed}>
                <Marketplace />
              </RequireAuth>
            }
          />
          <Route
            path="/equipment"
            element={
              <RequireAuth authed={isAuthed}>
                <Equipment />
              </RequireAuth>
            }
          />
          <Route
            path="/knowledge"
            element={
              <RequireAuth authed={isAuthed}>
                <Knowledge />
              </RequireAuth>
            }
          />

          {/* Farmer-only */}
          <Route
            path="/dashboard"
            element={
              <RequireRole user={user} role="farmer">
                <Dashboard user={user} />
              </RequireRole>
            }
          />

          {/* Chat route (for Book Now redirect) */}
          <Route
            path="/chat/:conversationId"
            element={
              <RequireAuth authed={isAuthed}>
                <ChatBox />
              </RequireAuth>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}
