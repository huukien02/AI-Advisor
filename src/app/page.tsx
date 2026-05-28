"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { useSessions } from "@/hooks/useSessions";
import { useTheme } from "@/hooks/useTheme";
import { initMemory } from "@/lib/firestore";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ChatSidebar from "@/components/ChatSidebar";
import SettingsModal from "@/components/SettingsModal";
import LoginScreen from "@/components/LoginScreen";

export default function Home() {
  const {
    user,
    profile,
    loading,
    loginWithGoogle,
    loginAnonymous,
    logout,
    updatePrefs,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    fetchSessions,
    newSession,
    removeSession,
    updateSessionLocal,
  } = useSessions(user?.uid ?? null);

  const { messages, isLoading, error, sendMessage, loadHistory } = useChat(
    user?.uid ?? null,
    activeSessionId,
    profile?.preferences,
  );

  const bottomRef = useRef<HTMLDivElement>(null);

  // Init khi login
  useEffect(() => {
    if (user) {
      initMemory(user.uid);
      fetchSessions();
    }
  }, [user, fetchSessions]);

  // Load messages khi đổi session
  useEffect(() => {
    if (activeSessionId) loadHistory();
  }, [activeSessionId, loadHistory]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = async () => {
    if (!user) return;
    const sessionId = await newSession("Cuộc trò chuyện mới");
    if (sessionId) setActiveSessionId(sessionId);
    setSidebarOpen(false);
  };

  const handleSend = async (content: string) => {
    if (!user) return;

    // Nếu chưa có session → tạo mới với title = tin nhắn đầu tiên
    let sid = activeSessionId;
    if (!sid) {
      sid = (await newSession(content)) ?? null;
      if (!sid) return;
      setActiveSessionId(sid);
    }

    // Là tin đầu tiên nếu session vừa tạo (chưa có messages)
    const isFirstMsg = messages.length === 0;

    await sendMessage(content, (sessionId) => {
      updateSessionLocal(sessionId, {
        // Cập nhật title ngay trên UI nếu là tin đầu tiên
        ...(isFirstMsg
          ? { title: content.slice(0, 50) + (content.length > 50 ? "..." : "") }
          : {}),
        lastMessage: content.slice(0, 80),
      });
    });
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <div
          className="text-sm animate-pulse"
          style={{ color: "var(--text-muted)" }}
        >
          Đang tải...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen onGoogle={loginWithGoogle} onAnonymous={loginAnonymous} />
    );
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Sidebar */}
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={setActiveSessionId}
        onNew={handleNewChat}
        onDelete={removeSession}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header
          className="px-4 py-3 flex items-center gap-3 border-b shrink-0"
          style={{
            background: "var(--header-bg)",
            borderColor: "var(--border)",
          }}
        >
          {/* Toggle sidebar (mobile + desktop) */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors md:hidden"
            style={{
              background: "var(--bg-hover)",
              color: "var(--text-secondary)",
            }}
          >
            ☰
          </button>

          {/* Logo + title */}
          <img
            src="/vercel.svg"
            alt="AI Advisor"
            className="w-8 h-8 rounded-xl shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h1
              className="font-bold text-sm truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {sessions.find((s) => s.id === activeSessionId)?.title ||
                "AI Advisor"}
            </h1>
            <p
              className="text-xs truncate"
              style={{ color: "var(--text-secondary)" }}
            >
              {profile?.email ?? (user.isAnonymous ? "Ẩn danh" : user.email)}
            </p>
          </div>

          {/* Nút chat mới */}
          <button
            onClick={handleNewChat}
            className="hidden md:flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition"
            style={{
              background: "var(--bg-hover)",
              color: "var(--text-secondary)",
            }}
            title="Tạo chat mới"
          >
            ＋ Chat mới
          </button>

          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{
              background: "var(--bg-hover)",
              color: "var(--text-secondary)",
            }}
            title="Cài đặt"
          >
            ⚙️
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{
              background: "var(--bg-hover)",
              color: "var(--text-secondary)",
            }}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="text-xs px-3 py-1.5 rounded-xl transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            Đăng xuất
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-1">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Bắt đầu cuộc trò chuyện mới
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                AI Advisor sẽ ghi nhớ và học từ mỗi cuộc trò chuyện
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessage
              key={msg.id ?? i}
              message={msg}
              uid={user.uid}
              sessionId={activeSessionId ?? ""}
            />
          ))}

          {error && (
            <div
              className="text-center text-xs py-2 px-4 mx-auto max-w-sm rounded-lg"
              style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)" }}
            >
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>

      {/* Settings Modal */}
      {profile && (
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          uid={user.uid}
          initialPrefs={profile.preferences}
          onSaved={updatePrefs}
        />
      )}
    </div>
  );
}
