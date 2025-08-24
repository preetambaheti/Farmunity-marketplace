import React, { useEffect, useState } from "react";
import { Menu, User } from "lucide-react";
import FarmunityMark from "../assets/farmunity-mark.svg";

export default function Header({
  currentPage,
  onNavigate,
  onMenuToggle,
  isMenuOpen,
  isAuthed,
  onLogout,
  user,
}) {
  const isFarmer = isAuthed && user?.role === "farmer";

  // --- Always dark navbar (no transparent variant) ---
  const headerBg = "bg-zinc-900/95";
  const headerBorder = "border-zinc-800";
  const shadow = "shadow-sm";

  // Text/CTA styles
  const brandText = "text-white";
  const linkText = "text-zinc-200";
  const linkHover = "hover:text-green-200";
  const activeText = "text-white";
  const activeBg = "bg-white/10";

  const ctaBase =
    "px-4 py-2 text-sm font-medium rounded-md transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70";
  const loginBtn = `${ctaBase} border-green-600 bg-green-600 text-white hover:bg-green-700`;
  const logoutBtn = `${ctaBase} border-white/30 bg-white/10 text-white hover:bg-white/20`;

  const iconColor = "text-white";
  const iconHover = "hover:text-green-200";

  // Lock page scroll when the mobile menu is open
  useEffect(() => {
    const el = document.documentElement;
    if (isMenuOpen) {
      const prev = el.style.overflow;
      el.style.overflow = "hidden";
      return () => {
        el.style.overflow = prev || "";
      };
    }
  }, [isMenuOpen]);

  // Helper: navigate and close mobile menu if open
  const go = (key) => {
    onNavigate?.(key);
    if (isMenuOpen) onMenuToggle?.();
  };

  const navItems = ["home", "marketplace", "equipment", "knowledge"];

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 ${headerBg} ${headerBorder} ${shadow} border-b transition-all duration-300`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center min-w-0">
              <button
                onClick={() => go("home")}
                className="flex-shrink-0 flex items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70 rounded-md"
                aria-label="Go to home"
                title="Farmunity"
              >
                <img
                  src={FarmunityMark}
                  alt="Farmunity"
                  className="w-8 h-8"
                  width={32}
                  height={32}
                />
                <span
                  className={`ml-2 text-xl font-bold transition-colors ${brandText} ${linkHover}`}
                >
                  Farmunity
                </span>
              </button>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex space-x-2">
              {navItems.map((key) => {
                const isActive = currentPage === key;
                return (
                  <button
                    key={key}
                    onClick={() => go(key)}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70 ${
                      isActive
                        ? `${activeText} ${activeBg}`
                        : `${linkText} ${linkHover}`
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center space-x-3">
              {isFarmer && (
                <button
                  onClick={() => go("dashboard")}
                  className={`p-2 sm:p-2.5 rounded-full transition-colors ${iconColor} ${iconHover} bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70`}
                  aria-label="Open dashboard"
                  title="Dashboard"
                >
                  <User className="h-5 w-5" />
                </button>
              )}

              {!isAuthed ? (
                <button onClick={() => go("login")} className={loginBtn}>
                  Login
                </button>
              ) : (
                <button onClick={onLogout} className={logoutBtn}>
                  Logout
                </button>
              )}

              {/* Mobile menu button */}
              <button
                onClick={onMenuToggle}
                className={`md:hidden transition-colors ${iconColor} ${iconHover} p-2 sm:p-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70`}
                aria-label="Toggle menu"
                aria-expanded={isMenuOpen ? "true" : "false"}
                aria-controls="mobile-menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          id="mobile-menu"
          className={`md:hidden border-t border-zinc-800 bg-zinc-900/95 text-white transition-[opacity,transform] duration-200 ${
            isMenuOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-2"
          }`}
        >
          {isMenuOpen && (
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((key) => {
                const isActive = currentPage === key;
                return (
                  <button
                    key={key}
                    onClick={() => go(key)}
                    className={`block w-full text-left px-3 py-2 text-base font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70 ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/90 hover:bg-white/10"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                );
              })}

              {isFarmer && (
                <button
                  onClick={() => go("dashboard")}
                  className={`block w-full text-left px-3 py-2 text-base font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70 ${
                    currentPage === "dashboard"
                      ? "bg-white/10 text-white"
                      : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  Dashboard
                </button>
              )}

              {!isAuthed && (
                <button
                  onClick={() => go("login")}
                  className="block w-full text-left px-3 py-2 text-base font-medium rounded-md transition-colors text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70"
                >
                  Login
                </button>
              )}
              {isAuthed && (
                <button
                  onClick={() => {
                    onLogout?.();
                    if (isMenuOpen) onMenuToggle?.();
                  }}
                  className="block w-full text-left px-3 py-2 text-base font-medium rounded-md transition-colors text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70"
                >
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Spacer so content never hides under fixed header */}
      <div className="h-16" aria-hidden />
    </>
  );
}
