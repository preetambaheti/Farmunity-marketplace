import React from 'react';
import { Menu, User } from 'lucide-react';

export default function Header({ currentPage, onNavigate, onMenuToggle, isMenuOpen, isAuthed, onLogout }) {
  return (
    <header className="bg-white shadow-sm border-b border-green-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="ml-2 text-xl font-bold text-green-800">Farmunity</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {["home","marketplace","equipment","knowledge"].map(key => (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  currentPage === key
                    ? 'text-green-700 bg-green-50'
                    : 'text-gray-700 hover:text-green-700 hover:bg-green-50'
                }`}
              >
                {key.charAt(0).toUpperCase()+key.slice(1)}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {isAuthed && (
              <button
                onClick={() => onNavigate('dashboard')}
                className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full transition-colors"
              >
                <User className="h-4 w-4" />
              </button>
            )}

            {!isAuthed ? (
              <button
                onClick={() => onNavigate('login')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Login
              </button>
            ) : (
              <button
                onClick={onLogout}
                className="bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-md text-sm font-medium transition-colors border border-green-200"
              >
                Logout
              </button>
            )}

            <button
              onClick={onMenuToggle}
              className="md:hidden text-gray-600 hover:text-green-600 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu (unchanged except Login link) */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-green-100">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white">
            {["home","marketplace","equipment","knowledge"].map(key => (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className={`block w-full text-left px-3 py-2 text-base font-medium rounded-md transition-colors ${
                  currentPage === key
                    ? 'text-green-700 bg-green-50'
                    : 'text-gray-700 hover:text-green-700 hover:bg-green-50'
                }`}
              >
                {key.charAt(0).toUpperCase()+key.slice(1)}
              </button>
            ))}

            {!isAuthed && (
              <button
                onClick={() => onNavigate('login')}
                className="block w-full text-left px-3 py-2 text-base font-medium rounded-md text-green-700 hover:bg-green-50"
              >
                Login
              </button>
            )}
            {isAuthed && (
              <button
                onClick={onLogout}
                className="block w-full text-left px-3 py-2 text-base font-medium rounded-md text-green-700 hover:bg-green-50"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
