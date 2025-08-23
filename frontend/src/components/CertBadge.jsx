// frontend/src/components/CertBadge.jsx
export function CertBadge({ status }) {
  if (!status || status === "none") return null;
  const map = {
    certified: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    rejected: "bg-red-100 text-red-700",
    expired: "bg-gray-200 text-gray-700",
  };
  const label = status[0].toUpperCase() + status.slice(1);
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {label}
    </span>
  );
}
