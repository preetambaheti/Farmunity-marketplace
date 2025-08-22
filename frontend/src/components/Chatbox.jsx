import React, { useEffect, useRef, useState } from "react";
import { X, SendHorizonal } from "lucide-react";
import { api } from "../services/api";
import { getAuth } from "../services/api";

export default function ChatBox({ open, onClose, listing }) {
  // listing must include: { id, ownerId, farmer, crop }
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);
  const scrollerRef = useRef(null);

  const auth = getAuth();
  const meId = auth?.user?.id;

  // Start conversation when opening
  useEffect(() => {
    if (!open || !listing?.ownerId) return;

    let cancelled = false;
    (async () => {
      setError("");
      setLoading(true);
      try {
        const res = await api.startConversation({
          recipientId: listing.ownerId,
          cropId: listing.id,
        });
        if (cancelled) return;
        setConversation(res.conversation);

        // initial messages
        const ms = await api.getMessages(res.conversation.id);
        if (cancelled) return;
        setMessages(ms.messages || []);

        // start polling
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
          try {
            const upd = await api.getMessages(res.conversation.id);
            setMessages(upd.messages || []);
          } catch (_) {}
        }, 1500);
      } catch (e) {
        setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, listing?.ownerId, listing?.id]);

  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages, open]);

  async function send() {
    if (!text.trim() || !conversation) return;
    const t = text.trim();
    setText("");
    try {
      const res = await api.sendMessage({
        conversationId: conversation.id,
        text: t,
      });
      // optimistic update (poll will also refresh)
      setMessages((prev) => [...prev, res.message]);
    } catch (e) {
      setError(e.message);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/20 p-2 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-green-100 flex flex-col h-[80vh] sm:h-[70vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-green-100 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Chat with</div>
            <div className="font-semibold text-green-800">
              {listing?.farmer || conversation?.peer?.name || "Seller"}
            </div>
            <div className="text-xs text-gray-500">{listing?.crop}</div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-green-50 text-gray-600 hover:text-green-700"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-green-50/40">
          {loading && (
            <div className="text-center text-sm text-gray-500 py-2">Loading chat…</div>
          )}
          {error && (
            <div className="text-red-700 bg-red-50 border border-red-200 rounded-md p-2 text-sm">
              {error}
            </div>
          )}
          {!loading && messages.length === 0 && !error && (
            <div className="text-center text-sm text-gray-500 py-2">Say hello 👋</div>
          )}

          {messages.map((m) => {
            const mine = m.senderId === meId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow ${
                    mine
                      ? "bg-green-600 text-white rounded-br-md"
                      : "bg-white border border-green-100 text-gray-800 rounded-bl-md"
                  }`}
                >
                  <div>{m.text}</div>
                  <div className={`mt-1 text-[10px] ${mine ? "text-white/80" : "text-gray-500"}`}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-green-100">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              className="flex-1 border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Type your message…"
            />
            <button
              onClick={send}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl flex items-center gap-2"
            >
              <SendHorizonal className="h-4 w-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
