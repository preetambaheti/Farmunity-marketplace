import React, { useEffect, useState } from "react";
import Header from "./components/Header";
import Homepage from "./components/Homepage";
import Marketplace from "./components/Marketplace";
import Equipment from "./components/Equipment";
import Knowledge from "./components/Knowledge";
import Dashboard from "./components/Dashboard";
import Footer from "./components/Footer";
import Auth from "./components/Auth";
import { getAuth, clearAuth } from "./services/api";

const PROTECTED = new Set(["marketplace", "equipment", "knowledge", "dashboard"]);

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [user, setUser] = useState(null);
  const isAuthed = !!user;

  useEffect(() => {
    // load stored auth on refresh
    const saved = getAuth();
    if (saved?.user) setUser(saved.user);
  }, []);

  function onNavigate(page) {
    // block protected pages if not logged in
    if (PROTECTED.has(page) && !isAuthed) {
      setCurrentPage("login");
      return;
    }
    setCurrentPage(page);
  }

  function onAuthSuccess(u) {
    setUser(u);
  }

  function onLogout() {
    clearAuth();
    setUser(null);
    setCurrentPage("home");
  }

  function renderPage() {
    if (currentPage === "home") return <Homepage onNavigate={onNavigate} />;
    if (currentPage === "marketplace") return <Marketplace />;
    if (currentPage === "equipment") return <Equipment />;
    if (currentPage === "knowledge") return <Knowledge />;
    if (currentPage === "dashboard") return <Dashboard user={user} />;
    if (currentPage === "login") return <Auth onAuthSuccess={onAuthSuccess} onNavigate={onNavigate} />;
    return <Homepage onNavigate={onNavigate} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        currentPage={currentPage}
        onNavigate={onNavigate}
        onMenuToggle={() => {}}
        isMenuOpen={false}
        isAuthed={isAuthed}
        onLogout={onLogout}
      />
      <main className="flex-1">{renderPage()}</main>
      <Footer />
    </div>
  );
}
