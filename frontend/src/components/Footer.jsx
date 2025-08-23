import React from 'react';
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Youtube, Globe } from 'lucide-react';
import FarmunityMark from "../assets/farmunity-mark.svg";

export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-green-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center mb-4">
              <a href="/" className="flex items-center group" aria-label="Farmunity – Home">
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
              </a>
            </div>

            <p className="text-green-100 mb-4">
              Empowering farmers with fair prices, equipment access, and knowledge for a sustainable future.
            </p>

            <div className="flex space-x-4">
              <button className="text-green-200 hover:text-white transition-colors" aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </button>
              <button className="text-green-200 hover:text-white transition-colors" aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </button>
              <button className="text-green-200 hover:text-white transition-colors" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </button>
              <button className="text-green-200 hover:text-white transition-colors" aria-label="YouTube">
                <Youtube className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-green-200 hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/marketplace"
                  className="text-green-200 hover:text-white transition-colors"
                >
                  Marketplace
                </Link>
              </li>
              <li>
                <Link
                  to="/equipment"
                  className="text-green-200 hover:text-white transition-colors"
                >
                  Equipment Rental
                </Link>
              </li>
              <li>
                <Link
                  to="/knowledge"
                  className="text-green-200 hover:text-white transition-colors"
                >
                  Knowledge Hub
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
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
                <button className="text-green-200 hover:text-white transition-colors">
                  Help Center
                </button>
              </li>
              <li>
                <button className="text-green-200 hover:text-white transition-colors">
                  Contact Us
                </button>
              </li>
              <li>
                <button className="text-green-200 hover:text-white transition-colors">
                  Community Guidelines
                </button>
              </li>
              <li>
                <button className="text-green-200 hover:text-white transition-colors">
                  Safety & Security
                </button>
              </li>
              <li>
                <button className="text-green-200 hover:text-white transition-colors">
                  Report an Issue
                </button>
              </li>
            </ul>
          </div>

          {/* Language & Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <div className="mb-4">
            </div>
            <div className="space-y-2">
              <p className="text-green-200">
                <span className="block font-medium">Helpline</span>
                1800-123-4567 (Toll Free)
              </p>
              <p className="text-green-200">
                <span className="block font-medium">Email</span>
                support@farmunity.com
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-green-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-green-200 text-sm">
            © 2025 Farmunity. All rights reserved.
          </div>
          <div className="flex space-x-6 text-sm text-green-200 mt-4 md:mt-0">
            <button className="hover:text-white transition-colors">Privacy Policy</button>
            <button className="hover:text-white transition-colors">Terms of Service</button>
            <button className="hover:text-white transition-colors">Cookie Policy</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
