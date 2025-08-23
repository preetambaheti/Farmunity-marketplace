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
  const [scrolled, setScrolled] = useState(false);
  const isFarmer = isAuthed && user?.role === "farmer";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Transparent only on Home when not scrolled; otherwise dark
  const isHeroGlass = currentPage === "home" && !scrolled;
  const isDark = !isHeroGlass; // dark on non-home or once scrolled on home

  const headerBg = isHeroGlass ? "bg-transparent" : "bg-zinc-900/95";
  const headerBorder = isHeroGlass ? "border-transparent" : "border-zinc-800";
  const shadow = isDark ? "shadow-sm" : "shadow-none";

  // Text/CTA styles
  const brandText = isHeroGlass ? "text-white" : "text-white";
  const linkText = isHeroGlass ? "text-white/85" : "text-zinc-200";
  const linkHover = "hover:text-green-200";
  const activeText = "text-white";
  const activeBg = "bg-white/10";

  const ctaBase =
    "px-4 py-2 text-sm font-medium rounded-md transition-colors border";
  const loginBtn = isDark
    ? `${ctaBase} border-green-600 bg-green-600 text-white hover:bg-green-700`
    : `${ctaBase} border-white/40 bg-white/10 text-white hover:bg-white/20`;
  const logoutBtn = isDark
    ? `${ctaBase} border-white/30 bg-white/10 text-white hover:bg-white/20`
    : `${ctaBase} border-white/40 bg-white/10 text-white hover:bg-white/20`;

  const iconColor = "text-white";
  const iconHover = "hover:text-green-200";

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 ${headerBg} ${headerBorder} ${shadow} border-b transition-all duration-300`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <button
                onClick={() => onNavigate("home")}
                className="flex-shrink-0 flex items-center group"
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
              {["home", "marketplace", "equipment", "knowledge"].map((key) => {
                const isActive = currentPage === key;
                return (
                  <button
                    key={key}
                    onClick={() => onNavigate(key)}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? `${activeText} ${activeBg}`
                        : `${linkText} ${linkHover}`
                    }`}
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
                  onClick={() => onNavigate("dashboard")}
                  className={`p-2 rounded-full transition-colors ${iconColor} ${iconHover} ${
                    isDark ? "bg-white/10 hover:bg-white/20" : "bg-white/10"
                  }`}
                  aria-label="Open dashboard"
                  title="Dashboard"
                >
                  <User className="h-5 w-5" />
                </button>
              )}

              {!isAuthed ? (
                <button onClick={() => onNavigate("login")} className={loginBtn}>
                  Login
                </button>
              ) : (
                <button onClick={onLogout} className={logoutBtn}>
                  Logout
                </button>
              )}

              <button
                onClick={onMenuToggle}
                className={`md:hidden transition-colors ${iconColor} ${iconHover} p-2 rounded-md`}
                aria-label="Toggle menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div
            className={`md:hidden border-t ${
              isDark
                ? "bg-zinc-900/95 text-white border-zinc-800"
                : "bg-zinc-900/90 text-white border-transparent"
            }`}
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {["home", "marketplace", "equipment", "knowledge"].map((key) => {
                const isActive = currentPage === key;
                return (
                  <button
                    key={key}
                    onClick={() => onNavigate(key)}
                    className={`block w-full text-left px-3 py-2 text-base font-medium rounded-md transition-colors ${
                      isActive ? "bg-white/10 text-white" : "text-white/90 hover:bg-white/10"
                    }`}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                );
              })}

              {isFarmer && (
                <button
                  onClick={() => onNavigate("dashboard")}
                  className={`block w-full text-left px-3 py-2 text-base font-medium rounded-md transition-colors ${
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
                  onClick={() => onNavigate("login")}
                  className="block w-full text-left px-3 py-2 text-base font-medium rounded-md transition-colors text-white hover:bg-white/10"
                >
                  Login
                </button>
              )}
              {isAuthed && (
                <button
                  onClick={onLogout}
                  className="block w-full text-left px-3 py-2 text-base font-medium rounded-md transition-colors text-white hover:bg-white/10"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Spacer so fixed header never overlaps content when not transparent */}
      {isDark && <div className="h-16" aria-hidden />}
    </>
  );
}
