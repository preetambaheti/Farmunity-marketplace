import React, { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  Users,
  Cloud,
  Lightbulb,
  Send,
  Search,
  Loader2,
  RefreshCcw,
  Reply,
  X,
  User as UserIcon,
} from "lucide-react";
import api, { getAuth } from "../services/api";

/* ===========================
      WEATHER TAB (real-time)
   =========================== */

const fallbackPlace = "Punjab,IN";

function useUserPlace() {
  const auth = getAuth();
  const saved = auth?.user?.location?.trim();
  return saved && saved.length > 0 ? saved : fallbackPlace;
}

function WeatherTab() {
  const [loc, setLoc] = useState({ lat: null, lon: null, q: null });
  const [now, setNow] = useState(null);
  const [adv, setAdv] = useState(null);
  const [loadingNow, setLoadingNow] = useState(false);
  const [loadingAdv, setLoadingAdv] = useState(false);
  const [err, setErr] = useState("");

  const placeFallback = useUserPlace();

  // get browser location (fallback to saved location string)
  useEffect(() => {
    let cancelled = false;
    const useFallbackQ = () => {
      if (!cancelled) setLoc({ lat: null, lon: null, q: placeFallback });
    };
    if (!navigator.geolocation) {
      useFallbackQ();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const { latitude, longitude } = pos.coords;
        setLoc({ lat: latitude, lon: longitude, q: null });
      },
      () => useFallbackQ(),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
    return () => { cancelled = true; };
  }, [placeFallback]);

  // fetch current + forecast
  useEffect(() => {
    if (!loc.lat && !loc.q) return;
    setLoadingNow(true);
    setErr("");
    api.weatherNow(loc)
      .then((data) => setNow(data))
      .catch((e) => setErr(e.message || "Failed to load weather"))
      .finally(() => setLoadingNow(false));
  }, [loc]);

  // fetch advisory (requires auth; handled gracefully)
  useEffect(() => {
    if (!loc.lat && !loc.q) return;
    setLoadingAdv(true);
    setAdv(null);
    api.weatherAdvisory(loc)
      .then((data) => setAdv(data))
      .catch(() => setAdv(null))
      .finally(() => setLoadingAdv(false));
  }, [loc]);

  const temp = now?.current?.tempC;
  const desc = now?.current?.description;
  const locDisp = now?.location?.display || placeFallback;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Cloud className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Weather Forecast</h3>
        <p className="text-gray-600">Stay informed about weather conditions for better farming decisions</p>
      </div>

      {/* Blue current box */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-8 text-center">
        {loadingNow ? (
          <div className="flex items-center justify-center gap-2 text-blue-100">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading current weather…
          </div>
        ) : err ? (
          <div className="text-blue-100">{err}</div>
        ) : (
          <>
            <div className="text-5xl font-extrabold mb-2">
              {temp != null ? `${Math.round(temp)}°C` : "--"}
            </div>
            <div className="text-xl mb-1 capitalize">{desc || "—"}</div>
            <div className="text-blue-100">{locDisp}</div>
          </>
        )}
      </div>

      {/* Details + Advisory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current conditions */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3">Current Conditions</h4>
          {loadingNow ? (
            <div className="text-gray-500 text-sm">Fetching…</div>
          ) : now ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Humidity:</span>
                <span className="font-medium">{now.current?.humidity ?? "—"}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Wind:</span>
                <span className="font-medium">
                  {now.current?.wind_mps != null ? `${now.current.wind_mps} m/s` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pressure:</span>
                <span className="font-medium">
                  {now.current?.pressure != null ? `${now.current.pressure} hPa` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expected Rain (last hour):</span>
                <span className="font-medium">
                  {now.current?.rain_mm != null ? `${now.current.rain_mm} mm` : "0 mm"}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">No data</div>
          )}
        </div>

        {/* Farming advisory by Gemini */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3">Farming Advisory</h4>
          {loadingAdv ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
            </div>
          ) : adv?.advisory ? (
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {adv.advisory}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              No major weather risks detected. Continue routine operations and keep scouting for pests/diseases.
            </div>
          )}

          {/* Optional: show the next 3 days summary under advisory */}
          {now?.forecast3d?.length > 0 && (
            <div className="mt-4 text-xs text-gray-500">
              <div className="font-medium mb-1">Next 3 days (summary):</div>
              <ul className="list-disc ml-5 space-y-1">
                {now.forecast3d.map((d) => (
                  <li key={d.date}>
                    {d.date}: {d.min}–{d.max}°C, {d.rain_mm}mm, {d.desc || d.main || ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===========================
        MAIN KNOWLEDGE PAGE
   =========================== */

export default function Knowledge() {
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState("chatbot");

  // --- AI chat state ---
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI farming assistant. I can help with crop guidance, weather, fertilizers, and more. What would you like to know?",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef(null);

  // Utility to scroll chat to bottom
  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollerRef.current) {
        scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
      }
    });
  };

  const sendToAI = async (text) => {
    if (!text?.trim() || loading) return;
    const me = getAuth();
    if (!me?.token) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "You need to log in to use the AI Assistant. Please sign in and try again.",
        },
      ]);
      return;
    }

    // optimistic update
    setMessages((m) => [...m, { role: "user", content: text }]);
    setChatInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await api.aiAsk({ message: text, sessionId });
      if (res?.sessionId) setSessionId(res.sessionId);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't process that. " +
            (e?.message ? `(${e.message})` : "Please try again."),
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleSend = () => sendToAI(chatInput);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const newChat = () => {
    setSessionId(null);
    setMessages([
      {
        role: "assistant",
        content:
          "New chat started. Ask me anything about crops, weather, fertilizers, or techniques.",
      },
    ]);
    setChatInput("");
    setTimeout(scrollToBottom, 0);
  };

  // ====== Community (DB-backed) ======
  const [forumLoading, setForumLoading] = useState(false);
  const [forumError, setForumError] = useState("");
  const [posts, setPosts] = useState([]); // server shape
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [draft, setDraft] = useState({ title: "", text: "", category: "" });
  const [replyOpen, setReplyOpen] = useState({});
  const [replyText, setReplyText] = useState({});

  const loadForum = async () => {
    setForumError("");
    setForumLoading(true);
    try {
      const res = await api.forumList(q ? { q } : {});
      setPosts(res.items || []);
    } catch (e) {
      setForumError(e.message || "Failed to load discussions");
    } finally {
      setForumLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "forum") loadForum();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (activeTab === "forum") loadForum();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // helper: time-ago (updates every 30s)
  function useTick(ms = 30000) {
    const [, setT] = useState(0);
    useEffect(() => {
      const t = setInterval(() => setT((x) => x + 1), ms);
      return () => clearInterval(t);
    }, [ms]);
  }
  useTick(30000);

  const timeAgo = (date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const sec = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
    const units = [
      ["year", 31536000],
      ["month", 2592000],
      ["day", 86400],
      ["hour", 3600],
      ["minute", 60],
      ["second", 1],
    ];
    for (const [name, s] of units) {
      const val = Math.floor(sec / s);
      if (val >= 1) return `${val} ${name}${val > 1 ? "s" : ""} ago`;
    }
    return "just now";
  };

  const openDiscussion = () => {
    setDraft({ title: "", text: "", category: "" });
    setShowModal(true);
  };
  const closeDiscussion = () => setShowModal(false);

  const submitDiscussion = async () => {
    const { title, text, category } = {
      title: draft.title.trim(),
      text: draft.text.trim(),
      category: draft.category.trim(),
    };
    if (!title || !text) return;

    try {
      await api.forumCreate({ title, text, category });
      setShowModal(false);
      await loadForum();
    } catch (e) {
      alert(e.message || "Failed to create discussion");
    }
  };

  const toggleReply = (postId) =>
    setReplyOpen((s) => ({ ...s, [postId]: !s[postId] }));

  const submitReply = async (postId) => {
    const text = (replyText[postId] || "").trim();
    if (!text) return;
    try {
      const { reply } = await api.forumReply(postId, { text });
      // optimistic update
      setPosts((list) =>
        list.map((p) =>
          p.id === postId
            ? {
                ...p,
                replies: [...(p.replies || []), reply],
                repliesCount: (p.repliesCount || 0) + 1,
              }
            : p
        )
      );
      setReplyText((t) => ({ ...t, [postId]: "" }));
      setReplyOpen((s) => ({ ...s, [postId]: true }));
    } catch (e) {
      alert(e.message || "Failed to reply");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Knowledge & Advisory Hub
          </h1>
          <p className="text-gray-600">
            Get expert guidance, connect with farmers, and stay informed
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("chatbot")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "chatbot"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  AI Assistant
                </div>
              </button>
              <button
                onClick={() => setActiveTab("forum")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "forum"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Community Forum
                </div>
              </button>
              <button
                onClick={() => setActiveTab("weather")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "weather"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  Weather
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "chatbot" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="text-center mx-auto">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      AI Farming Assistant
                    </h3>
                    <p className="text-gray-600 mb-2">
                      Get instant answers about crops, weather, fertilizers, and
                      techniques.
                    </p>
                    {sessionId && (
                      <p className="text-xs text-gray-500">
                        Session: <span className="font-mono">{sessionId}</span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={newChat}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    title="Start a new chat"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    New Chat
                  </button>
                </div>

                {/* Chat Interface */}
                <div
                  ref={scrollerRef}
                  className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto mb-4"
                >
                  <div className="space-y-4">
                    {messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 ${
                          m.role === "user" ? "justify-end" : ""
                        }`}
                      >
                        {m.role !== "user" && (
                          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <MessageCircle className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <div
                          className={`p-3 rounded-lg shadow-sm max-w-[80%] ${
                            m.role === "user"
                              ? "bg-green-600 text-white"
                              : "bg-white text-gray-800"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {m.content}
                          </p>
                        </div>
                      </div>
                    ))}

                    {loading && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Thinking…
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat Input */}
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about crops, weather, fertilizers, or farming techniques..."
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <button
                    onClick={handleSend}
                    disabled={loading || !chatInput.trim()}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Suggestions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    "Weather forecast for my village",
                    "Fertilizer advice for wheat (pH 6.5)",
                    "Tomato pest control (leaf curl)",
                    "Best crop to sow this month in Karnataka",
                  ].map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendToAI(s)}
                      className="p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "forum" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Community Discussions
                  </h3>
                  <button
                    onClick={openDiscussion}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Start Discussion
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    type="text"
                    placeholder="Search discussions..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Server status */}
                {forumLoading && (
                  <div className="text-sm text-gray-500">Loading…</div>
                )}
                {forumError && (
                  <div className="text-sm text-red-600">{forumError}</div>
                )}

                {/* Forum Posts */}
                <div className="space-y-4">
                  {(!posts || posts.length === 0) && !forumLoading && (
                    <div className="text-center text-gray-500 py-12">
                      No discussions yet. Be the first to start one!
                    </div>
                  )}

                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0">
                          <h4 className="font-medium text-gray-900 hover:text-green-600 cursor-pointer break-words">
                            {post.title}
                          </h4>
                          <div className="flex items-center text-sm text-gray-600 gap-2 mt-1">
                            <span className="inline-flex items-center gap-1">
                              <UserIcon className="h-3.5 w-3.5" />
                              {post.author?.name || "Anonymous"}
                            </span>
                            <span>•</span>
                            <span>{timeAgo(post.createdAt)}</span>
                            {post.category && (
                              <>
                                <span>•</span>
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                                  {post.category}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => toggleReply(post.id)}
                          className="px-3 py-1.5 text-sm border rounded-lg text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                          title="Reply"
                        >
                          <Reply className="h-4 w-4" />
                          Reply
                        </button>
                      </div>

                      <p className="text-gray-800 whitespace-pre-wrap">
                        {post.text}
                      </p>

                      {/* Reply box */}
                      {replyOpen[post.id] && (
                        <div className="mt-4 flex items-start gap-2">
                          <textarea
                            value={replyText[post.id] || ""}
                            onChange={(e) =>
                              setReplyText((t) => ({
                                ...t,
                                [post.id]: e.target.value,
                              }))
                            }
                            placeholder="Write your reply..."
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 min-h-[70px]"
                          />
                          <button
                            onClick={() => submitReply(post.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                          >
                            <Send className="h-4 w-4" />
                            Post
                          </button>
                        </div>
                      )}

                      {/* Replies */}
                      {post.replies?.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {post.replies.map((r) => (
                            <div
                              key={r.id}
                              className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                            >
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                <span className="inline-flex items-center gap-1">
                                  <UserIcon className="h-3.5 w-3.5" />
                                  {r.author?.name || "Anonymous"}
                                </span>
                                <span>•</span>
                                <span>{timeAgo(r.createdAt)}</span>
                              </div>
                              <div className="text-gray-800 whitespace-pre-wrap">
                                {r.text}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "weather" && <WeatherTab />}
          </div>
        </div>
      </div>

      {/* Start Discussion Modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Start Discussion</h3>
              </div>
              <button
                onClick={closeDiscussion}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <input
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Title (e.g., Best fertilizer for wheat in Punjab?)"
              />
              <input
                value={draft.category}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, category: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Category (optional, e.g., Fertilizers)"
              />
              <textarea
                value={draft.text}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, text: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[120px] focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Describe your question or topic…"
              />
            </div>

            <div className="px-5 py-4 border-t flex items-center justify-end gap-2">
              <button
                onClick={closeDiscussion}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitDiscussion}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
