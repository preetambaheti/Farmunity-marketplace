import React, { useEffect, useRef, useState } from "react";
import { X, SendHorizonal } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { api, getAuth } from "../services/api";

export default function ChatBox({ open, onClose, listing }) {
  // Modes
  const { conversationId: routeId } = useParams();
  const isModal = typeof open !== "undefined";
  const isRoute = !!routeId && !isModal;
  const navigate = useNavigate();

  // State
  const [conversation, setConversation] = useState(null); // { id, peer?, cropId? }
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);
  const scrollerRef = useRef(null);

  const auth = getAuth();
  const meId = auth?.user?.id;

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function loadMessages(id) {
    const res = await api.getMessages(id);
    setMessages(res.messages || []);
  }

  // Modal mode: start (or fetch) conversation for listing
  useEffect(() => {
    if (!isModal) return;
    if (!open) {
      stopPolling();
      return;
    }
    if (!listing?.ownerId) return;

    let cancelled = false;
    (async () => {
      setError("");
      setLoading(true);
      try {
        const start = await api.startConversation({
          recipientId: listing.ownerId,
          cropId: listing.id,
        });
        if (cancelled) return;

        const conv = start.conversation;
        setConversation(conv);

        await loadMessages(conv.id);
        if (cancelled) return;

        stopPolling();
        pollRef.current = setInterval(() => {
          api.getMessages(conv.id)
            .then((upd) => setMessages(upd.messages || []))
            .catch(() => {});
        }, 1500);
      } catch (e) {
        setError(e.message || "Failed to open chat");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [isModal, open, listing?.ownerId, listing?.id]);

  // Route mode: load by conversationId in URL
  useEffect(() => {
    if (!isRoute) return;
    if (!routeId) return;

    let cancelled = false;
    (async () => {
      setError("");
      setLoading(true);
      try {
        // Try to enrich peer info from conversations list (best effort)
        try {
          const list = await api.getConversations();
          const match = (list.conversations || []).find((c) => c.id === routeId);
          setConversation(match || { id: routeId });
        } catch {
          setConversation({ id: routeId });
        }

        await loadMessages(routeId);
        if (cancelled) return;

        stopPolling();
        pollRef.current = setInterval(() => {
          api.getMessages(routeId)
            .then((upd) => setMessages(upd.messages || []))
            .catch(() => {});
        }, 1500);
      } catch (e) {
        setError(e.message || "Failed to load chat");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [isRoute, routeId]);

  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages, open, isRoute]);

  async function send() {
    if (!text.trim() || !conversation?.id) return;
    const t = text.trim();
    setText("");
    try {
      const res = await api.sendMessage({
        conversationId: conversation.id,
        text: t,
      });
      setMessages((prev) => [...prev, res.message]); // optimistic
    } catch (e) {
      setError(e.message || "Failed to send");
    }
  }

  // Only hide in modal mode when explicitly closed
  if (isModal && !open) return null;

  const titleName = listing?.farmer || conversation?.peer?.name || "Seller";
  const subline = listing?.crop || (conversation?.cropId ? `Crop #${conversation.cropId}` : "");

  const Wrapper = ({ children }) =>
    isModal ? (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/20 p-2 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-green-100 flex flex-col h-[80vh] sm:h-[70vh]">
          {children}
        </div>
      </div>
    ) : (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="max-w-4xl w-full mx-auto bg-white border border-green-100 shadow-sm rounded-none sm:rounded-xl mt-0 sm:mt-6 flex flex-col h-screen sm:h-[80vh]">
          {children}
        </div>
      </div>
    );

  return (
    <Wrapper>
      {/* Header */}
      <div className="px-4 py-3 border-b border-green-100 flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{isModal ? "Chat with" : "Conversation"}</div>
          <div className="font-semibold text-green-800">{titleName}</div>
          {subline ? <div className="text-xs text-gray-500">{subline}</div> : null}
        </div>

        {isModal ? (
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-green-50 text-gray-600 hover:text-green-700"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            title="Back"
          >
            Back
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 bg-green-50/40 z-0"
      >
        {loading && <div className="text-center text-sm text-gray-500 py-2">Loading chat…</div>}
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
      <div className="p-3 border-t border-green-100 relative z-10 bg-white">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="flex-1 border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Type your message…"
            autoFocus
          />
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-60"
            disabled={!conversation?.id}
            title={conversation?.id ? "Send" : "Conversation not ready yet"}
          >
            <SendHorizonal className="h-4 w-4" />
            Send
          </button>
        </form>
      </div>
    </Wrapper>
  );
}
