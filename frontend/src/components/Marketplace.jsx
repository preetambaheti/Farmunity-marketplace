// frontend/src/components/Marketplace.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Filter,
  MapPin,
  Star,
  MessageCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { api } from "../services/api";
import ChatBox from "./ChatBox";

const CROPS = ["Wheat", "Rice", "Corn", "Tomato", "Onion", "Potato"];

// Simple shimmer card shown while data streams in
function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-40 sm:h-48 bg-gray-200" />
      <div className="p-5 sm:p-6 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
        </div>
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

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

  // ------------------------
  // Fetch STATES once (with AbortController)
  // ------------------------
  useEffect(() => {
    const ac = new AbortController();
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
                "Jammu and Kashmir",
              ];
        if (!ac.signal.aborted) {
          setStates(list);
          if (!list.includes(selectedState)) setSelectedState(list[0]);
        }
      } catch {
        /* ignore — fallback already handled above */
      }
    })();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------
  // Fetch TODAY PRICES whenever state/type changes
  // ------------------------
  useEffect(() => {
    const ac = new AbortController();
    setPriceLoading(true);
    setPriceErr("");
    api
      .getTodayPrices({ state: selectedState, type: priceView })
      .then((r) => {
        if (!ac.signal.aborted) setPrices(r?.items || []);
      })
      .catch((e) => {
        if (!ac.signal.aborted) {
          setPriceErr(e.message || "Failed to load prices");
          setPrices([]);
        }
      })
      .finally(() => !ac.signal.aborted && setPriceLoading(false));
    return () => ac.abort();
  }, [selectedState, priceView]);

  // ------------------------
  // Fetch protected crop listings (fast: fire immediately, abort on unmount)
  // ------------------------
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const res = await api.getCrops(); // PROTECTED API CALL
        if (ac.signal.aborted) return;
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
              : String(x.crop || "")
                  .toLowerCase()
                  .match(/rice|wheat|corn|grain/)
              ? "grains"
              : "organic"),
        }));
        setItems(normalized);
      } catch (e) {
        if (!ac.signal.aborted) {
          setErr(e.message);
          onUnauthorized?.();
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
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
    if (pct === null || pct === undefined)
      return <span className="text-gray-400">—</span>;
    const pos = Number(pct) >= 0;
    return (
      <div
        className={`flex items-center justify-center text-xs ${
          pos ? "text-green-600" : "text-red-600"
        }`}
      >
        {pos ? (
          <TrendingUp className="h-3 w-3 mr-1" />
        ) : (
          <TrendingDown className="h-3 w-3 mr-1" />
        )}
        {Math.abs(Number(pct)).toFixed(1)}%
      </div>
    );
  };

  const skeletons = useMemo(
    () => Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />),
    []
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Crop Marketplace
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Connect directly with buyers and sellers for fair trade
          </p>

          {(err || priceErr) && (
            <div className="mt-3 inline-block text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {err || priceErr}
            </div>
          )}
        </div>

        {/* Real-time Price Dashboard */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Today&apos;s Market Prices
              </h2>

              <div className="flex flex-col xs:flex-row sm:flex-row gap-3 sm:gap-3 items-stretch sm:items-center">
                {/* State dropdown */}
                <label className="flex items-center justify-between sm:justify-start gap-2">
                  <span className="text-sm text-gray-600">State</span>
                  <select
                    className="border rounded-md px-3 py-2 text-sm focus:outline-none w-40 sm:w-44"
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
                <div className="flex bg-gray-100 rounded-lg p-1 self-start">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 sm:p-6">
            {CROPS.map((crop) => {
              const row = priceByCrop[crop] || {};
              return (
                <div key={crop} className="text-center">
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">
                    {crop}
                  </div>
                  <div className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                    {priceLoading
                      ? "—"
                      : row.price_per_qt != null
                      ? `₹${row.price_per_qt}/qt`
                      : "—"}
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
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  Filters:
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {["all", "grains", "vegetables", "fruits", "organic"].map(
                  (filter) => (
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
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Crop Listings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading
            ? skeletons
            : filteredListings.length === 0
            ? (
              <div className="col-span-full text-gray-600">
                No listings found.
              </div>
            )
            : filteredListings.map((listing) => (
                <div
                  key={listing.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="relative w-full h-40 sm:h-48">
                    <img
                      src={listing.image}
                      alt={listing.crop}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">
                          {listing.crop}
                        </h3>
                        <p className="text-sm text-gray-600">
                          by {listing.farmer}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium text-gray-700">
                          {listing.rating}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-500">Quantity:</span>
                        <div className="font-medium text-gray-900">
                          {listing.quantity}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Quality:</span>
                        <div className="font-medium text-gray-900">
                          {listing.quality}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center text-sm text-gray-600 mb-4">
                      <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{listing.location}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xl sm:text-2xl font-bold text-green-600">
                        ₹{Number(listing.price).toLocaleString()}/qt
                      </div>
                      <button
                        onClick={() => {
                          if (!listing.ownerId) {
                            alert(
                              "Seller ID missing for this listing. Please re-seed crops with owner mapping."
                            );
                            return;
                          }
                          setChatListing(listing);
                          setChatOpen(true);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors min-h-[44px] w-full sm:w-auto"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Contact Seller
                      </button>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* Chat modal */}
      <ChatBox
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        listing={chatListing}
      />
    </div>
  );
}
