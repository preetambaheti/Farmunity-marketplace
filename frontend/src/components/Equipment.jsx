import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Star, Users, Filter } from 'lucide-react';

export default function Equipment() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('rent');

  const equipment = [
    {
      id: 1,
      name: 'John Deere 5050D Tractor',
      category: 'tractor',
      owner: 'Ram Singh',
      location: 'Amritsar, Punjab',
      pricePerDay: 1200,
      pricePerWeek: 7500,
      rating: 4.8,
      available: true,
      image: 'https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=400',
      features: ['GPS Tracking', 'Fuel Efficient', 'Well Maintained']
    },
    {
      id: 2,
      name: 'Mahindra Rice Harvester',
      category: 'harvester',
      owner: 'Gurjeet Kaur',
      location: 'Jalandhar, Punjab',
      pricePerDay: 2500,
      pricePerWeek: 16000,
      rating: 4.9,
      available: true,
      image: 'https://images.pexels.com/photos/9350/agriculture-farm-farming-tractor.jpg?auto=compress&cs=tinysrgb&w=400',
      features: ['Latest Model', 'High Efficiency', 'Operator Included']
    },
    {
      id: 3,
      name: 'DJI Agras T30 Drone',
      category: 'drone',
      owner: 'Tech Farm Solutions',
      location: 'Bangalore, Karnataka',
      pricePerDay: 800,
      pricePerWeek: 5000,
      rating: 4.7,
      available: false,
      image: 'https://images.pexels.com/photos/442587/pexels-photo-442587.jpeg?auto=compress&cs=tinysrgb&w=400',
      features: ['Precision Spraying', 'Weather Resistant', 'Training Provided']
    },
    {
      id: 4,
      name: 'Rotary Tillers Set',
      category: 'tiller',
      owner: 'Krishnan Farms',
      location: 'Coimbatore, Tamil Nadu',
      pricePerDay: 600,
      pricePerWeek: 3500,
      rating: 4.6,
      available: true,
      image: 'https://images.pexels.com/photos/296230/pexels-photo-296230.jpeg?auto=compress&cs=tinysrgb&w=400',
      features: ['Multiple Attachments', 'Fuel Efficient', 'Easy Operation']
    }
  ];

  const categories = [
    { id: 'all', name: 'All Equipment' },
    { id: 'tractor', name: 'Tractors' },
    { id: 'harvester', name: 'Harvesters' },
    { id: 'drone', name: 'Drones' },
    { id: 'tiller', name: 'Tillers' },
    { id: 'irrigation', name: 'Irrigation' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Equipment Rental Hub</h1>
          <p className="text-gray-600">Access modern farming equipment when you need it</p>
        </div>

        {/* Service Type Toggle */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Type</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setSelectedType('rent')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedType === 'rent'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <Clock className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-medium">Short-term Rental</div>
                  <div className="text-sm text-gray-600">Daily/Weekly</div>
                </div>
              </button>
              
              <button
                onClick={() => setSelectedType('lease')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedType === 'lease'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <Calendar className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-medium">Long-term Lease</div>
                  <div className="text-sm text-gray-600">Monthly/Seasonal</div>
                </div>
              </button>
              
              <button
                onClick={() => setSelectedType('share')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedType === 'share'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <Users className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-medium">Peer-to-Peer Sharing</div>
                  <div className="text-sm text-gray-600">Community</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Equipment Categories:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Equipment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {equipment
            .filter(item => selectedCategory === 'all' || item.category === selectedCategory)
            .map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-48 object-cover"
                />
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium ${
                  item.available
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {item.available ? 'Available' : 'Booked'}
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.name}</h3>
                    <p className="text-sm text-gray-600">by {item.owner}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium text-gray-700">{item.rating}</span>
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <MapPin className="h-4 w-4 mr-1" />
                  {item.location}
                </div>
                
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">Features:</div>
                  <div className="flex flex-wrap gap-2">
                    {item.features.map((feature, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <div className="text-lg font-bold text-green-600">
                      ₹{item.pricePerDay.toLocaleString()}/day
                    </div>
                    <div className="text-sm text-gray-600">
                      ₹{item.pricePerWeek.toLocaleString()}/week
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      item.available
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!item.available}
                  >
                    {item.available ? 'Book Now' : 'Unavailable'}
                  </button>
                  <button className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors">
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Booking Calendar Section */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Equipment Availability Calendar</h2>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">Select equipment above to view availability calendar</p>
              <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors">
                View Calendar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
