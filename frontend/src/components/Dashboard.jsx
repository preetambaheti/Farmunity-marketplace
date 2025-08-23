import React, { useEffect, useState } from "react";
import NotificationBell from "../components/NotificationBell";
import {
  User,
  Star,
  Trash2,
  X,
  Plus,
} from "lucide-react";
import { api, getAuth } from "../services/api";

export default function Dashboard() {
  const me = getAuth()?.user || null;
  const isFarmer = me?.role === "farmer";

  const [metrics, setMetrics] = useState({
    totalSales: "₹12,50,000",
    completedOrders: 45,
    totalListings: 0,
    rating: 4.8,
  });

  // ========== CROPS (live) ==========
  const [crops, setCrops] = useState([]);
  const [loadingCrops, setLoadingCrops] = useState(true);

  async function pullCrops() {
    try {
      const data = await api.getMyCrops();
      const items = data?.items || [];
      setCrops(items);
      setMetrics((m) => ({ ...m, totalListings: items.length }));
    } catch {}
    setLoadingCrops(false);
  }

  useEffect(() => {
    pullCrops(); // initial
    const t = setInterval(pullCrops, 8000);
    return () => clearInterval(t);
  }, []);

  // Add Listing (crop) modal
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    crop: "",
    quantity: "",
    price: "",
    quality: "A",
    location: me?.location || "",
  });
  useEffect(() => {
    setForm((f) => ({ ...f, location: me?.location || "" }));
  }, [me?.location]);

  const canSubmitNew =
    form.crop.trim() &&
    form.quantity.trim() &&
    String(form.price).trim() &&
    form.quality.trim() &&
    (me?.location || form.location.trim());

  async function handleCreate(e) {
    e.preventDefault();
    if (!canSubmitNew) return;
    try {
      await api.createCrop({
        farmer: me?.name || "Farmer",
        crop: form.crop.trim(),
        quantity: form.quantity.trim(),
        price: Number(form.price),
        location: me?.location || form.location.trim(),
        quality: form.quality.trim(),
      });
      setShowNew(false);
      setForm({
        crop: "",
        quantity: "",
        price: "",
        quality: "A",
        location: me?.location || "",
      });
      pullCrops();
    } catch (err) {
      alert(err?.message || "Failed to create listing");
    }
  }

  async function handleDeleteCrop(id) {
    if (!window.confirm("Delete this crop listing?")) return;
    try {
      await api.deleteCrop(id);
      setCrops((prev) => prev.filter((c) => c.id !== id));
      setMetrics((m) => ({
        ...m,
        totalListings: Math.max(0, (m.totalListings || 0) - 1),
      }));
    } catch (err) {
      alert(err?.message || "Failed to delete");
    }
  }

  // ========== EQUIPMENT (live) ==========
  const [myEquip, setMyEquip] = useState([]);
  const [eqLoading, setEqLoading] = useState(true);

  async function pullEquipment() {
    try {
      const data = await api.getMyEquipment();
      setMyEquip(data?.items || []);
    } catch {}
    setEqLoading(false);
  }

  useEffect(() => {
    pullEquipment(); // initial
    const t = setInterval(pullEquipment, 8000);
    const stop = api.openEquipmentStream(() => pullEquipment());
    return () => {
      clearInterval(t);
      stop?.();
    };
  }, []);

  // Add Equipment modal
  const [showEqNew, setShowEqNew] = useState(false);
  const [eqForm, setEqForm] = useState({
    title: "",
    priceDay: "",
    priceWeek: "",
    features: "", // comma-separated
    status: "Active", // Active | Upcoming
  });

  const eqCanSubmit =
    eqForm.title.trim() &&
    (String(eqForm.priceDay).trim() || String(eqForm.priceWeek).trim());

  async function handleCreateEquipment(e) {
    e.preventDefault();
    if (!eqCanSubmit) return;

    const payload = {
      title: eqForm.title.trim(),
      category: "Other",
      features: eqForm.features
        ? eqForm.features.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      available: eqForm.status === "Active",
      price: {
        day: eqForm.priceDay ? Number(eqForm.priceDay) : null,
        week: eqForm.priceWeek ? Number(eqForm.priceWeek) : null,
      },
      location: {},
    };

    try {
      await api.createEquipment(payload);
      setShowEqNew(false);
      setEqForm({
        title: "",
        priceDay: "",
        priceWeek: "",
        features: "",
        status: "Active",
      });
      pullEquipment();
    } catch (err) {
      alert(err?.message || "Failed to add equipment");
    }
  }

  // NEW: delete equipment
  async function handleDeleteEquipment(id) {
    if (!window.confirm("Delete this equipment item?")) return;
    try {
      await api.deleteEquipment(id);
      // optimistic UI update
      setMyEquip((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert(err?.message || "Failed to delete equipment");
    }
  }

  if (!isFarmer) return null; // also route-guarded

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your crops, equipment, and track your farming business
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <User className="h-10 w-10 text-green-600" />
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                  {me?.name}
                </h2>
                <p className="text-gray-600 mb-2">
                  {me?.location || "Add your location in Edit Profile"}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">
                      {Number(metrics.rating).toFixed(1)}
                    </span>
                  </div>
                  <span className="text-gray-500">
                    Member since {me?.joinedDate || "—"}
                  </span>
                </div>
              </div>

              {/* Right controls: Notifications + Edit Profile */}
              <div className="flex items-center gap-3">
                <NotificationBell />
                <button
                  onClick={() => {
                    const el = document.getElementById("open-edit-profile");
                    el?.click?.();
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Crop Listings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Active Crop Listings
              </h2>
              <button
                onClick={() => setShowNew(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add New Listing
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Crop
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price/Qt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inquiries
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {loadingCrops ? (
                  <tr>
                    <td className="px-6 py-6 text-gray-500" colSpan={7}>
                      Loading...
                    </td>
                  </tr>
                ) : crops.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-gray-500" colSpan={7}>
                      No listings yet. Click “Add New Listing”.
                    </td>
                  </tr>
                ) : (
                  crops.map((listing) => (
                    <tr key={listing.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {listing.crop}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {listing.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                        ₹{Number(listing.price ?? 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {listing.quality || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {listing.inquiries ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            listing.status === "Active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {listing.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteCrop(listing.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Equipment Activity (REAL-TIME) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Equipment Activity
            </h2>
            <button
              onClick={() => setShowEqNew(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              title="Add item"
            >
              <Plus className="h-4 w-4" />
              Add item
            </button>
          </div>

          <div className="p-6">
            {eqLoading ? (
              <div className="text-gray-500">Loading...</div>
            ) : myEquip.length === 0 ? (
              <div className="text-gray-500">
                No equipment yet. Click “Add item”.
              </div>
            ) : (
              <div className="space-y-4">
                {myEquip.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    {/* Left: title + features */}
                    <div className="min-w-0 pr-4">
                      <h3 className="font-medium text-gray-900 truncate">
                        {it.title}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">
                        {it.features && it.features.length > 0
                          ? it.features.join(" • ")
                          : "—"}
                      </p>
                    </div>

                    {/* Right: price + status + actions */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          {it.price?.day
                            ? `₹${Number(it.price.day).toLocaleString()}/day`
                            : ""}
                          {it.price?.day && it.price?.week ? " · " : ""}
                          {it.price?.week
                            ? `₹${Number(it.price.week).toLocaleString()}/week`
                            : ""}
                        </div>
                        <span
                          className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                            (it.status || "Active") === "Active"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {it.status || (it.available ? "Active" : "Upcoming")}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteEquipment(it.id)}
                        className="text-red-600 hover:text-red-700 p-2 rounded"
                        title="Delete equipment"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== New Crop Listing Modal ===== */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowNew(false)}
          />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Add New Listing</h3>
              <button
                onClick={() => setShowNew(false)}
                className="p-2 rounded hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Crop
                </label>
                <input
                  value={form.crop}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, crop: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Basmati Rice"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, quantity: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., 500 quintals"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price/qt
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., 2200"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quality
                  </label>
                  <select
                    value={form.quality}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, quality: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="A">A (Premium)</option>
                    <option value="B">B (Good)</option>
                    <option value="C">C (Standard)</option>
                  </select>
                </div>

                {!me?.location && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      value={form.location}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, location: e.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Village/City, District, State"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmitNew}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                >
                  Create Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Add Equipment Modal ===== */}
      {showEqNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowEqNew(false)}
          />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Add Equipment</h3>
              <button
                onClick={() => setShowEqNew(false)}
                className="p-2 rounded hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEquipment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment Name
                </label>
                <input
                  value={eqForm.title}
                  onChange={(e) =>
                    setEqForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., John Deere Tractor"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price / day
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={eqForm.priceDay}
                    onChange={(e) =>
                      setEqForm((f) => ({ ...f, priceDay: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., 1800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price / week
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={eqForm.priceWeek}
                    onChange={(e) =>
                      setEqForm((f) => ({ ...f, priceWeek: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., 10000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Features (comma-separated)
                </label>
                <input
                  value={eqForm.features}
                  onChange={(e) =>
                    setEqForm((f) => ({ ...f, features: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., 75 HP, 4WD, AC cabin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={eqForm.status}
                  onChange={(e) =>
                    setEqForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option>Active</option>
                  <option>Upcoming</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEqNew(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!eqCanSubmit}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                >
                  Add item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
