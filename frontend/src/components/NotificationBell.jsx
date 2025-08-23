import React, { useEffect, useRef, useState } from "react";
import {
  Bell,
  MessageSquare,
  RotateCcw,
  Check,
  Reply as ReplyIcon,
} from "lucide-react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";

// Small helper to format "time ago"
const timeAgo = (iso) => {
  try {
    const d = typeof iso === "string" ? new Date(iso) : iso;
    const sec = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
    const units = [
      ["y", 31536000],
      ["mo", 2592000],
      ["d", 86400],
      ["h", 3600],
      ["m", 60],
      ["s", 1],
    ];
    for (const [u, s] of units) {
      const v = Math.floor(sec / s);
      if (v >= 1) return `${v}${u} ago`;
    }
  } catch {}
  return "just now";
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const anchorRef = useRef(null);
  const navigate = useNavigate();

  const unreadCount = items.reduce((acc, n) => acc + (n.isRead ? 0 : 1), 0);

  const pull = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.myNotifications();
      setItems(res.items || []);
    } catch (e) {
      setErr(e.message || "Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    pull();
    const t = setInterval(pull, 20000);
    return () => clearInterval(t);
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return;
      if (anchorRef.current && !anchorRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const markAllRead = () => {
    // No server endpoint yet — just clear client-side badge for demo
    setItems((arr) => arr.map((n) => ({ ...n, isRead: true })));
  };

  const handleReply = async (n) => {
    // Only show Reply when we know who to talk to
    const recipientId = n?.metadata?.requesterId;
    if (!recipientId) return;

    try {
      // Ensure/obtain a conversation, then navigate
      const res = await api.startConversation({ recipientId, cropId: null });
      const convId = res?.conversation?.id;
      if (!convId) throw new Error("Could not open chat");
      navigate(`/chat/${convId}`);
    } catch (e) {
      alert(e?.message || "Failed to open chat. Please try again.");
    }
  };

  return (
    <div className="relative" ref={anchorRef}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="relative p-2 rounded-full border border-gray-200 hover:bg-gray-50"
        title="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[380px] max-w-[90vw] rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h4 className="text-sm font-semibold text-gray-900">Notifications</h4>
            <div className="flex items-center gap-2">
              <button
                onClick={pull}
                className="p-2 rounded hover:bg-gray-100"
                title="Refresh"
              >
                <RotateCcw className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                <Check className="h-3.5 w-3.5" />
                Mark all read
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-auto">
            {loading && (
              <div className="px-4 py-6 text-sm text-gray-500">Loading…</div>
            )}
            {err && <div className="px-4 py-3 text-sm text-red-600">{err}</div>}
            {!loading && !err && items.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-500">
                You have no notifications yet.
              </div>
            )}

            {items.map((n) => {
              const isInterest = n.type === "equipment_interest";
              const canReply = isInterest && !!n?.metadata?.requesterId;

              return (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-t ${
                    n.isRead ? "bg-white" : "bg-green-50/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <MessageSquare
                        className={`h-5 w-5 ${
                          isInterest ? "text-green-600" : "text-gray-500"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {n.title || "Notification"}
                        </div>
                        <div className="text-xs text-gray-500 shrink-0">
                          {timeAgo(n.createdAt)}
                        </div>
                      </div>
                      {n.message && (
                        <div className="text-sm text-gray-700 mt-0.5 break-words">
                          {n.message}
                        </div>
                      )}
                      {/* Reply action (NEW) */}
                      {canReply && (
                        <div className="mt-2">
                          <button
                            onClick={() => handleReply(n)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs border-gray-300 hover:bg-gray-50 text-gray-700"
                            title="Reply"
                          >
                            <ReplyIcon className="h-3.5 w-3.5" />
                            Reply
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
