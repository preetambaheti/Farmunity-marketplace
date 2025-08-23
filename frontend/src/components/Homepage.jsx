import React from 'react';
import { ArrowRight, Users, Truck, BookOpen, TrendingUp, Shield, Heart } from 'lucide-react';

export default function Homepage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Empowering Farmers with Fair Prices,
              <br className="hidden md:block" />
              Equipment Access, and Knowledge
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-green-100 max-w-3xl mx-auto">
              Join India's most trusted digital ecosystem for farmers. Connect directly with buyers, 
              access modern equipment, and grow with expert guidance.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => onNavigate('marketplace')}
                className="w-full sm:w-auto bg-white text-green-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <TrendingUp className="h-5 w-5" />
                Sell Crops
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => onNavigate('equipment')}
                className="w-full sm:w-auto bg-green-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-900 transition-colors flex items-center justify-center gap-2"
              >
                <Truck className="h-5 w-5" />
                Rent Equipment
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => onNavigate('knowledge')}
                className="w-full sm:w-auto bg-yellow-500 text-green-900 px-8 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2"
              >
                <BookOpen className="h-5 w-5" />
                Get Support
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0 bg-repeat"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
      </div>

      {/* Quick Services Highlight */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Farmunity?</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Built by farmers, for farmers. We understand your challenges and provide solutions that work.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {/* Direct Market Access */}
          <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-green-100">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Direct Market Access</h3>
            <p className="text-gray-600 mb-4">
              Skip middlemen and sell directly to buyers at fair prices. Real-time market rates with transparent pricing.
            </p>
            <button
              onClick={() => onNavigate('marketplace')}
              className="text-green-600 hover:text-green-700 font-medium flex items-center gap-1 mx-auto"
            >
              Explore Marketplace <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Equipment Sharing */}
          <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-green-100">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Equipment Sharing</h3>
            <p className="text-gray-600 mb-4">
              Access modern farming equipment when you need it. Rent, lease, or share with fellow farmers.
            </p>
            <button
              onClick={() => onNavigate('equipment')}
              className="text-green-600 hover:text-green-700 font-medium flex items-center gap-1 mx-auto"
            >
              Browse Equipment <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Expert Guidance */}
          <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-green-100">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Expert Guidance</h3>
            <p className="text-gray-600 mb-4">
              Get AI-powered crop advice, weather updates, and connect with agricultural experts anytime.
            </p>
            <button
              onClick={() => onNavigate('knowledge')}
              className="text-green-600 hover:text-green-700 font-medium flex items-center gap-1 mx-auto"
            >
              Get Support <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
