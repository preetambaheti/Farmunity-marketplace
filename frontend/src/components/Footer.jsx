import React from 'react';
import { Facebook, Twitter, Instagram, Youtube, Globe } from 'lucide-react';

export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-green-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-green-800 font-bold text-sm">F</span>
              </div>
              <span className="ml-2 text-xl font-bold">Farmunity</span>
            </div>
            <p className="text-green-100 mb-4">
              Empowering farmers with fair prices, equipment access, and knowledge for a sustainable future.
            </p>
            <div className="flex space-x-4">
              <button className="text-green-200 hover:text-white transition-colors">
                <Facebook className="h-5 w-5" />
              </button>
              <button className="text-green-200 hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
              </button>
              <button className="text-green-200 hover:text-white transition-colors">
                <Instagram className="h-5 w-5" />
              </button>
              <button className="text-green-200 hover:text-white transition-colors">
                <Youtube className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="text-green-200 hover:text-white transition-colors"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('marketplace')}
                  className="text-green-200 hover:text-white transition-colors"
                >
                  Marketplace
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('equipment')}
                  className="text-green-200 hover:text-white transition-colors"
                >
                  Equipment Rental
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('knowledge')}
                  className="text-green-200 hover:text-white transition-colors"
                >
                  Knowledge Hub
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="text-green-200 hover:text-white transition-colors"
                >
                  Dashboard
                </button>
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
            <h3 className="text-lg font-semibold mb-4">Language & Contact</h3>
            <div className="mb-4">
              <button className="flex items-center gap-2 text-green-200 hover:text-white transition-colors mb-2">
                <Globe className="h-4 w-4" />
                Language
              </button>
              <div className="ml-6 space-y-1">
                <button className="block text-green-200 hover:text-white transition-colors text-sm">English</button>
                <button className="block text-green-200 hover:text-white transition-colors text-sm">हिंदी</button>
                <button className="block text-green-200 hover:text-white transition-colors text-sm">ಕನ್ನಡ</button>
              </div>
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
