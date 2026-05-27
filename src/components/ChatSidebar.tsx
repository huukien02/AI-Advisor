"use client"

import { ChatSession } from "@/types"

interface Props {
  sessions: ChatSession[]
  activeSessionId: string | null
  onSelect: (sessionId: string) => void
  onNew: () => void
  onDelete: (sessionId: string) => void
  isOpen: boolean
  onClose: () => void
}

export default function ChatSidebar({
  sessions, activeSessionId, onSelect, onNew, onDelete, isOpen, onClose,
}: Props) {
  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-30 top-0 left-0 h-full flex flex-col
          transition-transform duration-200 w-64 shrink-0
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border)" }}
      >
        {/* Header sidebar */}
        <div className="p-3 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Lịch sử chat</span>
          <button
            onClick={onNew}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition"
            style={{ background: "#2563eb", color: "#fff" }}
            title="Tạo chat mới"
          >
            ＋ Mới
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto py-2">
          {sessions.length === 0 && (
            <p className="text-xs text-center mt-6" style={{ color: "var(--text-muted)" }}>
              Chưa có cuộc trò chuyện nào
            </p>
          )}

          {sessions.map((session) => (
            <div
              key={session.id}
              className="group flex items-start gap-2 px-3 py-2.5 mx-1 rounded-lg cursor-pointer transition relative"
              style={{
                background: activeSessionId === session.id ? "var(--bg-hover)" : "transparent",
              }}
              onClick={() => { onSelect(session.id); onClose() }}
            >
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {session.title || "Cuộc trò chuyện mới"}
                </p>
                {session.lastMessage && (
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {session.lastMessage}
                  </p>
                )}
              </div>

              {/* Nút xóa — hiện khi hover */}
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(session.id) }}
                className="opacity-0 group-hover:opacity-100 text-xs w-5 h-5 flex items-center
                  justify-center rounded hover:text-red-500 transition shrink-0 mt-0.5"
                style={{ color: "var(--text-muted)" }}
                title="Xóa chat"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
