import React, { useState } from 'react';
import { MessageCircle, Users, BookOpen, Cloud, Lightbulb, Send, Search } from 'lucide-react';

export default function Knowledge() {
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState('chatbot');

  const forumPosts = [
    {
      id: 1,
      title: 'Best fertilizer for wheat crop in Punjab?',
      author: 'Manjeet Singh',
      replies: 12,
      time: '2 hours ago',
      category: 'Fertilizers'
    },
    {
      id: 2,
      title: 'Organic pest control methods for tomatoes',
      author: 'Priya Sharma',
      replies: 8,
      time: '5 hours ago',
      category: 'Pest Control'
    },
    {
      id: 3,
      title: 'Water-saving irrigation techniques',
      author: 'Rajesh Kumar',
      replies: 15,
      time: '1 day ago',
      category: 'Irrigation'
    },
    {
      id: 4,
      title: 'Soil testing services in Karnataka',
      author: 'Lakshmi Devi',
      replies: 6,
      time: '2 days ago',
      category: 'Soil Health'
    }
  ];

  const knowledgeArticles = [
    {
      id: 1,
      title: 'Complete Guide to Drip Irrigation',
      category: 'Water Management',
      readTime: '8 min read',
      image: 'https://images.pexels.com/photos/416978/pexels-photo-416978.jpeg?auto=compress&cs=tinysrgb&w=300'
    },
    {
      id: 2,
      title: 'Sustainable Farming Practices',
      category: 'Sustainability',
      readTime: '12 min read',
      image: 'https://images.pexels.com/photos/1595104/pexels-photo-1595104.jpeg?auto=compress&cs=tinysrgb&w=300'
    },
    {
      id: 3,
      title: 'Crop Rotation Benefits',
      category: 'Crop Management',
      readTime: '6 min read',
      image: 'https://images.pexels.com/photos/1595108/pexels-photo-1595108.jpeg?auto=compress&cs=tinysrgb&w=300'
    }
  ];

  const weatherData = {
    location: 'Punjab, India',
    temperature: '28°C',
    condition: 'Partly Cloudy',
    humidity: '65%',
    rainfall: '12mm expected',
    forecast: '3 days of moderate rain expected'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Knowledge & Advisory Hub</h1>
          <p className="text-gray-600">Get expert guidance, connect with farmers, and stay informed</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('chatbot')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'chatbot'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  AI Assistant
                </div>
              </button>
              <button
                onClick={() => setActiveTab('forum')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'forum'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Community Forum
                </div>
              </button>
              <button
                onClick={() => setActiveTab('articles')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'articles'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Articles
                </div>
              </button>
              <button
                onClick={() => setActiveTab('weather')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'weather'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  Weather
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'chatbot' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Farming Assistant</h3>
                  <p className="text-gray-600 mb-6">Get instant answers about crops, weather, fertilizers, and farming techniques</p>
                </div>

                {/* Chat Interface */}
                <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto mb-4">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm max-w-md">
                        <p className="text-sm text-gray-800">Hello! I'm your AI farming assistant. I can help you with crop guidance, weather forecasts, fertilizer suggestions, and more. What would you like to know?</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat Input */}
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about crops, weather, fertilizers, or farming techniques..."
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors">
                    <Send className="h-4 w-4" />
                  </button>
                </div>

                {/* Quick Suggestions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    'Weather forecast',
                    'Fertilizer advice',
                    'Pest control',
                    'Crop prices'
                  ].map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setChatInput(suggestion)}
                      className="p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'forum' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Community Discussions</h3>
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                    Start Discussion
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search discussions..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Forum Posts */}
                <div className="space-y-4">
                  {forumPosts.map((post) => (
                    <div key={post.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900 hover:text-green-600 cursor-pointer">{post.title}</h4>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">{post.category}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 space-x-4">
                        <span>by {post.author}</span>
                        <span>{post.replies} replies</span>
                        <span>{post.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'articles' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Knowledge Articles</h3>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">All</button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">Popular</button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">Recent</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {knowledgeArticles.map((article) => (
                    <div key={article.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                      <img src={article.image} alt={article.title} className="w-full h-40 object-cover" />
                      <div className="p-4">
                        <div className="text-sm text-green-600 font-medium mb-2">{article.category}</div>
                        <h4 className="font-semibold text-gray-900 mb-2">{article.title}</h4>
                        <div className="text-sm text-gray-600">{article.readTime}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'weather' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Cloud className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Weather Forecast</h3>
                  <p className="text-gray-600">Stay informed about weather conditions for better farming decisions</p>
                </div>

                {/* Current Weather */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">{weatherData.temperature}</div>
                    <div className="text-xl mb-1">{weatherData.condition}</div>
                    <div className="text-blue-100">{weatherData.location}</div>
                  </div>
                </div>

                {/* Weather Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Current Conditions</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Humidity:</span>
                        <span className="font-medium">{weatherData.humidity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Expected Rainfall:</span>
                        <span className="font-medium">{weatherData.rainfall}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Farming Advisory</h4>
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-600">{weatherData.forecast}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
