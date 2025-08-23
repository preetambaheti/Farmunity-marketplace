// frontend/src/components/Marketplace.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Filter, MapPin, Star, MessageCircle, TrendingUp, TrendingDown } from "lucide-react";
import { api } from "../services/api";
import ChatBox from "./ChatBox";

const CROPS = ["Wheat", "Rice", "Corn", "Tomato", "Onion", "Potato"];

export default function Marketplace({ onUnauthorized }) {
  const [selectedFilter, setSelectedFilter] = useState("all");

  // ---- Prices controls ----
  const [priceView, setPriceView] = useState("wholesale"); // 'wholesale' | 'retail'
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState("Karnataka");

  // ---- Prices data ----
  const [prices, setPrices] = useState([]); // [{crop, price_per_qt, change_pct, unit, state}, ...]
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceErr, setPriceErr] = useState("");

  // ---- Listings (protected) ----
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatListing, setChatListing] = useState(null);

  // ---- Safe fallback listings (shown only if API fails) ----
  const fallbackListings = [
    {
      id: "fb-1",
      ownerId: "dummy-owner-1",
      farmer: "Raj Kumar",
      crop: "Organic Wheat",
      quantity: "500 quintals",
      price: 2200,
      location: "Ludhiana, Punjab",
      quality: "Grade A",
      rating: 4.8,
      image:
        "https://images.pexels.com/photos/265216/pexels-photo-265216.jpeg?auto=compress&cs=tinysrgb&w=600",
      category: "grains",
    },
    {
      id: "fb-2",
      ownerId: "dummy-owner-2",
      farmer: "Mohan Singh",
      crop: "Fresh Tomatoes",
      quantity: "150 quintals",
      price: 3400,
      location: "Nashik, Maharashtra",
      quality: "Grade A",
      rating: 4.6,
      image:
        "https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=600",
      category: "vegetables",
    },
  ];

  // ------------------------
  // Fetch STATES once
  // ------------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await api.getStates();
        const list =
          r?.states?.length
            ? r.states
            : [
                "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
                "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
                "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
                "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
                "Jammu and Kashmir"
              ];
        if (!mounted) return;
        setStates(list);
        if (!list.includes(selectedState)) setSelectedState(list[0]);
      } catch {
        // fallback already handled above
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------
  // Fetch TODAY PRICES whenever state/type changes
  // ------------------------
  useEffect(() => {
    let mounted = true;
    setPriceLoading(true);
    setPriceErr("");
    api
      .getTodayPrices({ state: selectedState, type: priceView })
      .then((r) => {
        if (!mounted) return;
        setPrices(r?.items || []);
      })
      .catch((e) => {
        if (!mounted) return;
        setPriceErr(e.message || "Failed to load prices");
        setPrices([]);
      })
      .finally(() => mounted && setPriceLoading(false));
    return () => { mounted = false; };
  }, [selectedState, priceView]);

  // ------------------------
  // Fetch protected crop listings
  // ------------------------
  useEffect(() => {
    (async () => {
      try {
        const res = await api.getCrops(); // PROTECTED API CALL
        const normalized = (res.items || []).map((x, idx) => ({
          id: x.id || x._id || String(idx),
          ownerId: x.ownerId || x.createdBy || null,
          farmer: x.farmer || x.ownerName || "Farmer",
          crop: x.crop || x.title || "Crop",
          quantity: x.quantity || x.qty || "—",
          price: x.price ?? 0,
          location: x.location || "—",
          quality: x.quality || "—",
          rating: x.rating ?? 4.6,
          image:
            x.image ||
            "https://images.pexels.com/photos/265216/pexels-photo-265216.jpeg?auto=compress&cs=tinysrgb&w=600",
          category:
            x.category ||
            (String(x.crop || "")
              .toLowerCase()
              .match(/tomato|onion|potato|vegetable/)
              ? "vegetables"
              : String(x.crop || "").toLowerCase().match(/rice|wheat|corn|grain/)
              ? "grains"
              : "organic"),
        }));
        setItems(normalized);
      } catch (e) {
        setErr(e.message);
        if (onUnauthorized) onUnauthorized();
        setItems(fallbackListings);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Client-side filter for listings ----
  const filteredListings = useMemo(() => {
    if (selectedFilter === "all") return items;
    return items.filter((it) => {
      const cat = (it.category || "").toLowerCase();
      if (selectedFilter === "organic") {
        return /organic/i.test(it.crop) || cat === "organic";
      }
      return cat === selectedFilter;
    });
  }, [items, selectedFilter]);

  // ---- Helper: map price array by crop for quick access ----
  const priceByCrop = useMemo(() => {
    const m = {};
    for (const r of prices) m[r.crop] = r;
    return m;
  }, [prices]);

  // ---- Small component for % change badge ----
  const Change = ({ pct }) => {
    if (pct === null || pct === undefined) return <span className="text-gray-400">—</span>;
    const pos = Number(pct) >= 0;
    return (
      <div className={`flex items-center justify-center text-xs ${pos ? "text-green-600" : "text-red-600"}`}>
        {pos ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
        {Math.abs(Number(pct)).toFixed(1)}%
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Crop Marketplace</h1>
          <p className="text-gray-600">Connect directly with buyers and sellers for fair trade</p>

          {(err || priceErr) && (
            <div className="mt-3 inline-block text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {err || priceErr}
            </div>
          )}
        </div>

        {/* Real-time Price Dashboard */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900">Today's Market Prices</h2>

              <div className="flex items-center gap-3">
                {/* State dropdown */}
                <label className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">State</span>
                  <select
                    className="border rounded-md px-3 py-2 text-sm focus:outline-none"
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                  >
                    {states.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Wholesale / Retail toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setPriceView("wholesale")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      priceView === "wholesale"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Wholesale
                  </button>
                  <button
                    onClick={() => setPriceView("retail")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      priceView === "retail"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Retail
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Prices grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-6">
            {CROPS.map((crop) => {
              const row = priceByCrop[crop] || {};
              return (
                <div key={crop} className="text-center">
                  <div className="text-sm text-gray-600 mb-1">{crop}</div>
                  <div className="text-lg font-bold text-gray-900 mb-1">
                    {row.price_per_qt != null ? `₹${row.price_per_qt}/qt` : "—"}
                  </div>
                  <Change pct={row.change_pct} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {["all", "grains", "vegetables", "fruits", "organic"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedFilter === filter
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Crop Listings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredListings.length === 0 ? (
            <div className="col-span-full text-gray-600">No listings found.</div>
          ) : (
            filteredListings.map((listing) => (
              <div
                key={listing.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-w-16 aspect-h-9">
                  <img src={listing.image} alt={listing.crop} className="w-full h-48 object-cover" />
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{listing.crop}</h3>
                      <p className="text-sm text-gray-600">by {listing.farmer}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium text-gray-700">{listing.rating}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-500">Quantity:</span>
                      <div className="font-medium text-gray-900">{listing.quantity}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Quality:</span>
                      <div className="font-medium text-gray-900">{listing.quality}</div>
                    </div>
                  </div>

                  <div className="flex items-center text-sm text-gray-600 mb-4">
                    <MapPin className="h-4 w-4 mr-1" />
                    {listing.location}
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-2xl font-bold text-green-600">
                      ₹{Number(listing.price).toLocaleString()}/qt
                    </div>
                    <button
                      onClick={() => {
                        if (!listing.ownerId) {
                          alert("Seller ID missing for this listing. Please re-seed crops with owner mapping.");
                          return;
                        }
                        setChatListing(listing);
                        setChatOpen(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Contact Seller
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat modal */}
      <ChatBox open={chatOpen} onClose={() => setChatOpen(false)} listing={chatListing} />
    </div>
  );
}
