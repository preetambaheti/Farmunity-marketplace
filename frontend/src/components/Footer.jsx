import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import FarmunityMark from "../assets/farmunity-mark.svg";

export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-green-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center mb-4">
              <Link
                to="/"
                onClick={() => onNavigate?.("home")}
                className="flex items-center group"
                aria-label="Farmunity – Home"
              >
                <img
                  src={FarmunityMark}
                  alt="Farmunity"
                  className="w-8 h-8"
                  width={32}
                  height={32}
                />
                <span className="ml-2 text-xl font-bold text-white group-hover:opacity-90">
                  Farmunity
                </span>
              </Link>
            </div>

            <p className="text-green-100 mb-4 max-w-sm">
              Empowering farmers with fair prices, equipment access, and
              knowledge for a sustainable future.
            </p>

            <div className="flex flex-wrap gap-3 sm:gap-4">
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Facebook"
                title="Facebook"
              >
                <Facebook className="h-5 w-5 text-green-50" />
              </a>
              <a
                href="https://twitter.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Twitter"
                title="Twitter"
              >
                <Twitter className="h-5 w-5 text-green-50" />
              </a>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Instagram"
                title="Instagram"
              >
                <Instagram className="h-5 w-5 text-green-50" />
              </a>
              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="YouTube"
                title="YouTube"
              >
                <Youtube className="h-5 w-5 text-green-50" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  onClick={() => onNavigate?.("home")}
                  className="text-green-200 hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/marketplace"
                  onClick={() => onNavigate?.("marketplace")}
                  className="text-green-200 hover:text-white transition-colors"
                >
                  Marketplace
                </Link>
              </li>
              <li>
                <Link
                  to="/equipment"
                  onClick={() => onNavigate?.("equipment")}
                  className="text-green-200 hover:text-white transition-colors"
                >
                  Equipment Rental
                </Link>
              </li>
              <li>
                <Link
                  to="/knowledge"
                  onClick={() => onNavigate?.("knowledge")}
                  className="text-green-200 hover:text-white transition-colors"
                >
                  Knowledge Hub
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  onClick={() => onNavigate?.("dashboard")}
                  className="text-green-200 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/help" className="text-green-200 hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-green-200 hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  to="/guidelines"
                  className="text-green-200 hover:text-white transition-colors"
                >
                  Community Guidelines
                </Link>
              </li>
              <li>
                <Link
                  to="/safety"
                  className="text-green-200 hover:text-white transition-colors"
                >
                  Safety &amp; Security
                </Link>
              </li>
              <li>
                <Link to="/report" className="text-green-200 hover:text-white transition-colors">
                  Report an Issue
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <div className="space-y-3">
              <p className="text-green-200">
                <span className="block font-medium">Helpline</span>
                <a
                  href="tel:18001234567"
                  className="hover:text-white transition-colors inline-block"
                >
                  1800-123-4567 (Toll Free)
                </a>
              </p>
              <p className="text-green-200">
                <span className="block font-medium">Email</span>
                <a
                  href="mailto:support@farmunity.com"
                  className="hover:text-white transition-colors inline-block break-all"
                >
                  support@farmunity.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-green-700 mt-8 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-green-200 text-sm">
            © 2025 Farmunity. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-green-200">
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link to="/cookies" className="hover:text-white transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
