import React, { useEffect, useState } from "react";
import NotificationBell from "../components/NotificationBell";
import { User, Star, Trash2, X, Plus } from "lucide-react";
import { api, getAuth } from "../services/api";
import NiceFileInput from "../components/NiceFileInput";

// -------- Certification UI helpers --------
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
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${map[status] || "bg-gray-100 text-gray-700"}`}
      title={`Certification status: ${label}`}
    >
      {label}
    </span>
  );
}

function CertificateModal({ open, onClose, cert }) {
  if (!open || !cert) return null;
  const doc = cert?.documents?.find((d) => d.type === "certificate");
  const inv = cert?.documents?.find((d) => d.type === "invoice");
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Certification Details</h3>
          <button
            aria-label="Close"
            onClick={onClose}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-zinc-500">Issuer</div>
            <div>{cert.issuer || "—"}</div>
          </div>
          <div>
            <div className="text-zinc-500">Certificate No.</div>
            <div>{cert.certificateNo || "—"}</div>
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

        <div className="flex gap-3 mt-4">
          {doc?.url && (
            <a
              className="px-3 py-2 rounded-lg border hover:bg-gray-50"
              href={doc.url}
              target="_blank"
              rel="noreferrer"
            >
              View Certificate
            </a>
          )}
          {inv?.url && (
            <a
              className="px-3 py-2 rounded-lg border hover:bg-gray-50"
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

// ---- Admin review panel ----
function AdminCertsPanel() {
  const [items, setItems] = useState([]);
  const [openCert, setOpenCert] = useState(null);

  async function load() {
    try {
      const d = await api.getPendingCerts();
      setItems(d.items || []);
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id, approve) {
    try {
      await api.approveCert(id, { approve });
      setItems((prev) => prev.filter((x) => x._id !== id));
    } catch (e) {
      alert(e.message || "Action failed");
    }
  }

  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold mb-3">Certifications Pending</h2>
      <div className="divide-y rounded-xl border bg-white">
        {items.length === 0 && (
          <div className="p-4 text-sm text-zinc-500">No pending requests.</div>
        )}
        {items.map((it) => {
          const cert = it.certification;
          const doc = cert?.documents?.find((d) => d.type === "certificate");
          return (
            <div
              key={it._id}
              className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <div className="font-medium">{it.title}</div>
                <div className="text-xs text-zinc-500">
                  {cert?.issuer || "—"} • {cert?.certificateNo || "no-number"}
                </div>
                <button
                  className="text-sm underline text-blue-600"
                  onClick={() => setOpenCert(cert)}
                >
                  Preview details
                </button>
              </div>
              <div className="flex gap-2">
                {doc?.url && (
                  <a
                    className="px-2 py-1 border rounded"
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Doc
                  </a>
                )}
                <button
                  onClick={() => decide(it._id, true)}
                  className="px-3 py-1 rounded bg-green-600 text-white"
                >
                  Approve
                </button>
                <button
                  onClick={() => decide(it._id, false)}
                  className="px-3 py-1 rounded bg-red-600 text-white"
                >
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <CertificateModal
        open={!!openCert}
        onClose={() => setOpenCert(null)}
        cert={openCert}
      />
    </div>
  );
}

// ---- Seller upload form (uses NiceFileInput) ----
function UploadCertForm({ eid, onDone }) {
  const [invoice, setInvoice] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [issuer, setIssuer] = useState("");
  const [certificateNo, setCertificateNo] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const allFilled =
    !!invoice &&
    !!certificate &&
    issuer.trim() &&
    certificateNo.trim() &&
    issueDate &&
    expiryDate;

  async function submit() {
    setErr("");
    setOkMsg("");
    if (!allFilled) {
      setErr("Please upload both documents and fill all fields.");
      return;
    }

    try {
      setLoading(true);
      await api.uploadCerts(eid, {
        invoice,
        certificate,
        issuer: issuer.trim(),
        certificateNo: certificateNo.trim(),
        issueDate,
        expiryDate,
      });

      setOkMsg("Form submitted for review");
      console.log("Form submitted");

      // Optional: clear inputs; keep success state visible
      setInvoice(null);
      setCertificate(null);
      setIssuer("");
      setCertificateNo("");
      setIssueDate("");
      setExpiryDate("");

      onDone?.();
    } catch (e) {
      setErr(e.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border p-3 space-y-2 bg-white">
      {okMsg && (
        <div className="px-3 py-2 rounded-lg text-green-800 bg-green-50 border border-green-200">
          {okMsg}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <NiceFileInput
          label="Invoice (PDF/JPG/PNG)"
          required
          accept=".pdf,.jpg,.jpeg,.png"
          file={invoice}
          onChange={setInvoice}
        />
        <NiceFileInput
          label="Certificate (PDF/JPG/PNG)"
          required
          accept=".pdf,.jpg,.jpeg,.png"
          file={certificate}
          onChange={setCertificate}
        />

        <input
          className="border rounded p-2 text-sm"
          placeholder="Issuer (e.g., Accredited Lab)"
          value={issuer}
          onChange={(e) => setIssuer(e.target.value)}
        />
        <input
          className="border rounded p-2 text-sm"
          placeholder="Certificate No."
          value={certificateNo}
          onChange={(e) => setCertificateNo(e.target.value)}
        />

        <label className="text-sm">
          Issue Date <span className="text-red-500">*</span>
          <input
            className="w-full border rounded p-2 text-sm"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </label>

        <label className="text-sm">
          Expiry Date <span className="text-red-500">*</span>
          <input
            className="w-full border rounded p-2 text-sm"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </label>
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      <button
        onClick={submit}
        disabled={loading || okMsg !== ""}
        className={`px-3 py-2 rounded-lg text-white ${
          okMsg ? "bg-green-600 opacity-80 cursor-default" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "Submitting..." : okMsg ? "Submitted" : "Submit for Review"}
      </button>
    </div>
  );
}

export default function Dashboard() {
  const me = getAuth()?.user || null;
  const isFarmer = me?.role === "farmer";
  const isAdmin = me?.role === "admin";

  const [metrics, setMetrics] = useState({
    totalSales: "₹12,50,000",
    completedOrders: 45,
    totalListings: 0,
    rating: 4.8,
  });

  // ========== CROPS ==========
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
    pullCrops();
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

  // ========== EQUIPMENT ==========
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
    pullEquipment();
    const t = setInterval(pullEquipment, 8000);
    const stop = api.openEquipmentStream?.(() => pullEquipment());
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
    features: "",
    status: "Active",
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

  async function handleDeleteEquipment(id) {
    if (!window.confirm("Delete this equipment item?")) return;
    try {
      await api.deleteEquipment(id);
      setMyEquip((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert(err?.message || "Failed to delete equipment");
    }
  }

  // If not farmer/admin, hide page
  if (!isFarmer && !isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
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

              <div className="flex items-center gap-3">
                <NotificationBell />
                <button
                  onClick={() =>
                    document.getElementById("open-edit-profile")?.click?.()
                  }
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Crop Listings (farmer only) */}
        {isFarmer && (
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
        )}

        {/* Equipment Activity (farmer view) */}
        {isFarmer && (
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
                <div className="text-gray-500">No equipment yet. Click “Add item”.</div>
              ) : (
                <div className="space-y-4">
                  {myEquip.map((it) => {
                    const certStatus = it.certification?.status;
                    return (
                      <div
                        key={it.id}
                        className="p-4 bg-gray-50 rounded-lg border flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between">
                          {/* Left: title + features */}
                          <div className="min-w-0 pr-4">
                            <h3 className="font-medium text-gray-900 truncate flex items-center gap-2">
                              {it.title}
                              <CertBadge status={certStatus} />
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

                        {/* Seller: show upload form if not certified */}
                        {certStatus !== "certified" && (
                          <UploadCertForm eid={it.id} onDone={pullEquipment} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin: Pending Certifications Panel */}
        {isAdmin && <AdminCertsPanel />}
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
