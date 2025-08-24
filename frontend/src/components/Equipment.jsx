// frontend/src/components/Equipment.jsx
import React, { useEffect, useMemo, useState } from "react";
import { MapPin, Star, Filter, Search } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../services/api";

// ---------- Small inline components for Certification UI ----------
function CertBadge({ status }) {
  if (!status || status === "none") return null;
  const map = {
    certified: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    rejected: "bg-red-100 text-red-800",
    expired: "bg-gray-200 text-gray-700",
  };
  const label = status[0].toUpperCase() + status.slice(1);
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {label}
    </span>
  );
}

function CertificateModal({ open, onClose, cert }) {
  if (!open || !cert) return null;
  const doc = cert?.documents?.find((d) => d.type === "certificate");
  const inv = cert?.documents?.find((d) => d.type === "invoice");
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-0">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base sm:text-lg font-semibold">Certification Details</h3>
          <button
            aria-label="Close"
            onClick={onClose}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-zinc-500">Issuer</div>
            <div>{cert.issuer || "—"}</div>
          </div>
          <div>
            <div className="text-zinc-500">Certificate No.</div>
            <div className="break-all">{cert.certificateNo || "—"}</div>
          </div>
          <div>
            <div className="text-zinc-500">Issue Date</div>
            <div>{cert.issueDate || "—"}</div>
          </div>
          <div>
            <div className="text-zinc-500">Expiry Date</div>
            <div>{cert.expiryDate || "—"}</div>
          </div>
          <div>
            <div className="text-zinc-500">Status</div>
            <div className="capitalize">{cert.status || "—"}</div>
          </div>
          <div>
            <div className="text-zinc-500">Verified By</div>
            <div>{cert.verifiedBy ? "Admin" : "—"}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
          {doc?.url && (
            <a
              className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-center"
              href={doc.url}
              target="_blank"
              rel="noreferrer"
            >
              View Certificate
            </a>
          )}
          {inv?.url && (
            <a
              className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-center"
              href={inv.url}
              target="_blank"
              rel="noreferrer"
            >
              View Invoice
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Skeleton card for instant first paint ----------
function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-40 sm:h-48 bg-gray-200" />
      <div className="p-5 sm:p-6 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export default function Equipment() {
  // ===== Router =====
  const navigate = useNavigate();
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const initialCity = params.get("city") || "";

  // Placeholder image
  const EQUIPMENT_PLACEHOLDER =
    "https://images.unsplash.com/photo-1594322436404-5f0390aa2f43?auto=format&fit=crop&w=1600&q=80";

  // ===== UI state =====
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cityInput, setCityInput] = useState(initialCity);
  const [selectedCity, setSelectedCity] = useState(initialCity);

  // ===== Data state =====
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ===== Cert modal state =====
  const [openCert, setOpenCert] = useState(null);

  // ===== Categories (must match DB values) =====
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

  // ===== Build API filter params =====
  const filters = useMemo(
    () => ({
      page,
      limit: 12,
      sort: "rating:desc",
      ...(selectedCategory && selectedCategory !== "All" ? { category: selectedCategory } : {}),
      ...(selectedCity ? { city: selectedCity } : {}),
    }),
    [page, selectedCategory, selectedCity]
  );

  // ===== Fetch data (fast & abortable) =====
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErr("");

    api
      .getEquipment(filters)
      .then((res) => {
        if (ac.signal.aborted) return;
        setItems(res.items || []);
        setHasMore(res.hasMore);
      })
      .catch((e) => {
        if (!ac.signal.aborted) setErr(e.message || "Failed to load equipment");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [filters]);

  // ===== Realtime refresh via SSE (no-op if not supported) =====
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

  // ===== Handlers =====
  function handleSearchCity(e) {
    e?.preventDefault?.();
    const next = cityInput.trim();
    setSelectedCity(next);
    setPage(1);
    // Keep URL in sync
    const qs = new URLSearchParams(loc.search);
    if (next) qs.set("city", next);
    else qs.delete("city");
    navigate({ pathname: "/equipment", search: qs.toString() ? `?${qs}` : "" }, { replace: true });
  }

  function clearCity() {
    setCityInput("");
    setSelectedCity("");
    setPage(1);
    const qs = new URLSearchParams(loc.search);
    qs.delete("city");
    navigate({ pathname: "/equipment", search: qs.toString() ? `?${qs}` : "" }, { replace: true });
  }

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

  const skeletons = useMemo(
    () => Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />),
    []
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Equipment Rental Hub</h1>
          <p className="text-gray-600 text-sm sm:text-base">Access modern farming equipment when you need it</p>
        </div>

        {/* Location Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Filter by Location</h3>
            <form onSubmit={handleSearchCity} className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter city (e.g., Ludhiana, Bengaluru)"
                />
              </div>
              <div className="flex flex-col xs:flex-row gap-2 w-full md:w-auto">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white min-h-[44px]"
                >
                  <Search className="h-4 w-4" />
                  Search
                </button>
                {selectedCity && (
                  <button
                    type="button"
                    onClick={clearCity}
                    className="px-5 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 min-h-[44px]"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>

            {selectedCity && (
              <div className="mt-3">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-800 text-sm border border-green-200">
                  <MapPin className="h-4 w-4" />
                  {selectedCity}
                </span>
              </div>
            )}
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

        {/* Error */}
        {err && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {/* Equipment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading
            ? skeletons
            : items.map((item) => {
                const imgSrc = item.images?.[0] || EQUIPMENT_PLACEHOLDER;
                const priceDay = item.price?.day ?? 0;
                const priceWeek = item.price?.week ?? 0;
                const ownerName = item.owner?.name || "—";
                const location =
                  item.location?.city && item.location?.state
                    ? `${item.location.city}, ${item.location.state}`
                    : item.location?.city || item.location?.state || "—";

                const certStatus = item.certification?.status;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="relative w-full h-40 sm:h-48">
                      <img
                        src={imgSrc}
                        alt={item.title || "Farm equipment"}
                        className="absolute inset-0 w-full h-full object-cover bg-gray-100"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = EQUIPMENT_PLACEHOLDER;
                        }}
                      />
                      <div
                        className={`absolute top-3 right-3 sm:top-4 sm:right-4 px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                          item.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.available ? "Available" : "Booked"}
                      </div>
                    </div>

                    <div className="p-5 sm:p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">
                            {item.title}
                          </h3>
                          <p className="text-sm text-gray-600">by {ownerName}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {certStatus && <CertBadge status={certStatus} />}
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium text-gray-700">
                              {item.rating ?? "—"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600 mb-4">
                        <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{location}</span>
                      </div>

                      {!!item.features?.length && (
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

                        {item.certification && (
                          <button
                            type="button"
                            className="text-sm underline text-blue-600"
                            onClick={() => setOpenCert(item.certification)}
                          >
                            View Certificate
                          </button>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleBookNow(item)}
                          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors min-h-[44px] ${
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

        {/* Pagination (placeholder for future load-more) */}
        {!loading && hasMore && <div className="flex justify-center mt-8"></div>}
      </div>

      {/* Global certificate modal */}
      <CertificateModal open={!!openCert} onClose={() => setOpenCert(null)} cert={openCert} />
    </div>
  );
}
