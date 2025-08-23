import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, MapPin, Star, Users, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

export default function Equipment() {
  // UI state
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState("rent");

  // Data state
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const navigate = useNavigate();

  // Categories (must match DB values)
  const categories = useMemo(
    () => [
      { id: "All", name: "All Equipment" },
      { id: "Tractors", name: "Tractors" },
      { id: "Harvesters", name: "Harvesters" },
      { id: "Drones", name: "Drones" },
      { id: "Tillers", name: "Tillers" },
      { id: "Irrigation", name: "Irrigation" },
    ],
    []
  );

  // Build API filter params
  const filters = useMemo(
    () => ({
      page,
      limit: 12,
      sort: "rating:desc",
      ...(selectedCategory && selectedCategory !== "All"
        ? { category: selectedCategory }
        : {}),
    }),
    [page, selectedCategory]
  );

  // Fetch data
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setErr("");

    api
      .getEquipment(filters)
      .then((res) => {
        if (cancel) return;
        setItems(res.items || []);
        setHasMore(res.hasMore);
      })
      .catch((e) => !cancel && setErr(e.message || "Failed to load equipment"))
      .finally(() => !cancel && setLoading(false));

    return () => {
      cancel = true;
    };
  }, [filters]);

  // Realtime refresh via SSE (no-op if not supported)
  useEffect(() => {
    const stop = api.openEquipmentStream?.(() => {
      api.getEquipment(filters).then((res) => {
        setItems(res.items || []);
        setHasMore(res.hasMore);
      });
    });
    return () => {
      if (typeof stop === "function") stop();
    };
  }, [filters]);

  // Reset page when category changes
  useEffect(() => {
    setPage(1);
  }, [selectedCategory]);

  // Book Now -> notify owner + open chat
  async function handleBookNow(item) {
    try {
      const res = await api.requestEquipment(item.id);
      const id = res?.conversationId;
      if (!id) {
        alert("Could not open chat. Please try again.");
        return;
      }
      navigate(`/chat/${id}`);
      requestAnimationFrame(() => window.scrollTo(0, 0));
    } catch (e) {
      alert(e.message || "Could not send booking request");
      console.error(e);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Equipment Rental Hub</h1>
          <p className="text-gray-600">Access modern farming equipment when you need it</p>
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
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error / Loading */}
        {err && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}
        {loading && <div className="mb-6 text-sm text-gray-600">Loading equipment…</div>}

        {/* Equipment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => {
            const img = item.images?.[0] || "/placeholder.jpg";
            const priceDay = item.price?.day ?? 0;
            const priceWeek = item.price?.week ?? 0;
            const ownerName = item.owner?.name || "—";
            const location =
              item.location?.city && item.location?.state
                ? `${item.location.city}, ${item.location.state}`
                : item.location?.city || item.location?.state || "—";
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative">
                  <img src={img} alt={item.title} className="w-full h-48 object-cover" />
                  <div
                    className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium ${
                      item.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {item.available ? "Available" : "Booked"}
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600">by {ownerName}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium text-gray-700">
                        {item.rating ?? "—"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center text-sm text-gray-600 mb-4">
                    <MapPin className="h-4 w-4 mr-1" />
                    {location}
                  </div>

                  {!!(item.features?.length) && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-2">Features:</div>
                      <div className="flex flex-wrap gap-2">
                        {item.features.map((f, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <div className="text-lg font-bold text-green-600">
                        ₹{Number(priceDay).toLocaleString()}/day
                      </div>
                      <div className="text-sm text-gray-600">
                        ₹{Number(priceWeek).toLocaleString()}/week
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleBookNow(item)}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                        item.available
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                      disabled={!item.available}
                    >
                      {item.available ? "Book Now" : "Unavailable"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {!loading && hasMore && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-6 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50"
            >
              Load more
            </button>
          </div>
        )}

        
      </div>
    </div>
  );
}
