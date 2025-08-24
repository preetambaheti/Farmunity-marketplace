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
  const panelRef = useRef(null);
  const firstFocusRef = useRef(null);
  const lastFocusRef = useRef(null);
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
      if (
        anchorRef.current &&
        !anchorRef.current.contains(e.target) &&
        panelRef.current &&
        !panelRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Esc to close + basic focus trap for accessibility
  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        // return focus to bell
        anchorRef.current?.querySelector("button")?.focus();
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // When panel opens, focus the first action
  useEffect(() => {
    if (open) {
      // small delay so element exists
      const t = setTimeout(() => {
        firstFocusRef.current?.focus();
      }, 0);
      return () => clearTimeout(t);
    }
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
      setOpen(false);
      navigate(`/chat/${convId}`);
    } catch (e) {
      alert(e?.message || "Failed to open chat. Please try again.");
    }
  };

  return (
    <div className="relative flex items-center" ref={anchorRef}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="relative p-2 rounded-full border border-gray-200 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70"
        title="Notifications"
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open ? "true" : "false"}
        aria-controls="notif-panel"
      >
        <Bell className="h-5 w-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      <div
        id="notif-panel"
        ref={panelRef}
        className={`absolute right-0 mt-2 origin-top-right rounded-xl border border-gray-200 bg-white shadow-xl transition-[opacity,transform] duration-200
        ${open ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1"}
        w-full sm:w-[380px] max-w-[90vw]`}
        role="dialog"
        aria-modal="false"
        aria-label="Notifications"
      >
        {/* Only render contents when open for a11y + perf */}
        {open && (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h4 className="text-sm font-semibold text-gray-900">Notifications</h4>
              <div className="flex items-center gap-2">
                <button
                  ref={firstFocusRef}
                  onClick={pull}
                  className="p-2 rounded hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70"
                  title="Refresh"
                >
                  <RotateCcw className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs border-gray-300 hover:bg-gray-50 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70"
                >
                  <Check className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-auto" aria-live="polite">
              {loading && (
                <div className="px-4 py-6 text-sm text-gray-500">Loading…</div>
              )}
              {err && <div className="px-4 py-3 text-sm text-red-600">{err}</div>}
              {!loading && !err && items.length === 0 && (
                <div className="px-4 py-6 text-sm text-gray-500">
                  You have no notifications yet.
                </div>
              )}

              {items.map((n, idx) => {
                const isInterest = n.type === "equipment_interest";
                const canReply = isInterest && !!n?.metadata?.requesterId;

                const isLast = idx === items.length - 1;

                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-t ${n.isRead ? "bg-white" : "bg-green-50/50"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <MessageSquare
                          className={`h-5 w-5 ${isInterest ? "text-green-600" : "text-gray-500"}`}
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
                        {/* Reply action */}
                        {canReply && (
                          <div className="mt-2">
                            <button
                              onClick={() => handleReply(n)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs border-gray-300 hover:bg-gray-50 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70"
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

            {/* Focus sentinel for simple trap */}
            <button
              ref={lastFocusRef}
              className="sr-only"
              onFocus={() => firstFocusRef.current?.focus()}
              tabIndex={0}
            >
              .
            </button>
          </>
        )}
      </div>
    </div>
  );
}
