import React from 'react';
import { User, TrendingUp, Package, Calendar, Star, Eye, Edit, Trash2 } from 'lucide-react';

export default function Dashboard() {
  const farmerProfile = {
    name: 'Raj Kumar Singh',
    location: 'Ludhiana, Punjab',
    joinedDate: 'January 2024',
    rating: 4.8,
    totalSales: '₹12,50,000',
    completedOrders: 45,
    totalListings: 12
  };

  const activeCropListings = [
    {
      id: 1,
      crop: 'Organic Wheat',
      quantity: '500 quintals',
      price: 2200,
      views: 156,
      inquiries: 8,
      status: 'Active'
    },
    {
      id: 2,
      crop: 'Basmati Rice',
      quantity: '300 quintals',
      price: 1900,
      views: 89,
      inquiries: 5,
      status: 'Active'
    },
    {
      id: 3,
      crop: 'Fresh Tomatoes',
      quantity: '100 quintals',
      price: 3400,
      views: 234,
      inquiries: 12,
      status: 'Sold'
    }
  ];

  const equipmentRentals = [
    {
      id: 1,
      equipment: 'John Deere Tractor',
      type: 'Rented Out',
      duration: '3 days',
      earnings: '₹3,600',
      status: 'Active'
    },
    {
      id: 2,
      equipment: 'Rice Harvester',
      type: 'Booked',
      duration: '2 days',
      cost: '₹5,000',
      status: 'Upcoming'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Farmer Dashboard</h1>
          <p className="text-gray-600">Manage your crops, equipment, and track your farming business</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <User className="h-10 w-10 text-green-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-gray-900 mb-1">{farmerProfile.name}</h2>
                <p className="text-gray-600 mb-2">{farmerProfile.location}</p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{farmerProfile.rating}</span>
                  </div>
                  <span className="text-gray-500">Member since {farmerProfile.joinedDate}</span>
                </div>
              </div>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{farmerProfile.totalSales}</div>
                <div className="text-sm text-gray-600">Total Sales</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{farmerProfile.completedOrders}</div>
                <div className="text-sm text-gray-600">Completed Orders</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{farmerProfile.totalListings}</div>
                <div className="text-sm text-gray-600">Active Listings</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{farmerProfile.rating}</div>
                <div className="text-sm text-gray-600">Rating</div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Crop Listings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Active Crop Listings</h2>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                Add New Listing
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crop</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price/Qt</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inquiries</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeCropListings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{listing.crop}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{listing.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">₹{listing.price.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Eye className="h-4 w-4" />
                        {listing.views}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{listing.inquiries}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        listing.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-700">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Equipment Rentals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Equipment Activity</h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {equipmentRentals.map((rental) => (
                <div key={rental.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{rental.equipment}</h3>
                    <p className="text-sm text-gray-600">{rental.type} • {rental.duration}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {rental.earnings || rental.cost}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      rental.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {rental.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
