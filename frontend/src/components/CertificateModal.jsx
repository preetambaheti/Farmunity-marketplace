// frontend/src/components/CertificateModal.jsx
export function CertificateModal({ open, onClose, cert }) {
  if (!open || !cert) return null;
  const doc = cert?.documents?.find(d => d.type === "certificate");
  const inv = cert?.documents?.find(d => d.type === "invoice");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Certification Details</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-black/10">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><div className="text-zinc-500">Issuer</div><div>{cert.issuer || "—"}</div></div>
          <div><div className="text-zinc-500">Certificate No.</div><div>{cert.certificateNo || "—"}</div></div>
          <div><div className="text-zinc-500">Issue Date</div><div>{cert.issueDate || "—"}</div></div>
          <div><div className="text-zinc-500">Expiry Date</div><div>{cert.expiryDate || "—"}</div></div>
          <div><div className="text-zinc-500">Status</div><div className="capitalize">{cert.status}</div></div>
          <div><div className="text-zinc-500">Verified By</div><div>{cert.verifiedBy ? "Admin" : "—"}</div></div>
        </div>

        <div className="flex gap-3">
          {doc?.url && <a className="px-3 py-2 rounded-lg border" href={doc.url} target="_blank">View Certificate</a>}
          {inv?.url && <a className="px-3 py-2 rounded-lg border" href={inv.url} target="_blank">View Invoice</a>}
        </div>
      </div>
    </div>
  );
}
