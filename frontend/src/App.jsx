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
import Chatbox from "./components/Chatbox";

import { getAuth, clearAuth } from "./services/api";
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
  // '/chat/:id' is not shown in header; it will default to 'home'
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
  // Read from localStorage immediately so direct /dashboard loads don’t bounce
  const [user, setUser] = useState(() => getAuth()?.user || null);
  const isAuthed = !!user;

  const [currentPage, setCurrentPage] = useState("home");
  const navigate = useNavigate();
  const location = useLocation();

  // Keep header highlight in sync with path
  useEffect(() => {
    setCurrentPage(pathToPage[location.pathname] || "home");
  }, [location.pathname]);

  function onNavigate(page) {
    // Block protected pages if not logged in
    if (PROTECTED.has(page) && !isAuthed) {
      navigate("/login");
      return;
    }
    // Farmer-only dashboard
    if (page === "dashboard" && user?.role !== "farmer") {
      navigate("/"); // or show a toast/notice if you have one
      return;
    }
    const path = pageToPath[page] || "/";
    navigate(path);
  }

  function onAuthSuccess(u) {
    // `Auth` should already save token+user in localStorage
    setUser(u);
    navigate("/");
  }

  function onLogout() {
    clearAuth();
    setUser(null);
    navigate("/");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <Header
        currentPage={currentPage}
        onNavigate={onNavigate}
        onMenuToggle={() => {}}
        isMenuOpen={false}
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
            element={<Auth onAuthSuccess={onAuthSuccess} onNavigate={onNavigate} />}
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
                <Chatbox />
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
