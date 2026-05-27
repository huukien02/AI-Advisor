"use client"

import { useState, useMemo } from "react"
import { ChatSession } from "@/types"
import { Timestamp } from "firebase/firestore"

interface Props {
  sessions: ChatSession[]
  activeSessionId: string | null
  onSelect: (sessionId: string) => void
  onNew: () => void
  onDelete: (sessionId: string) => void
  isOpen: boolean
  onClose: () => void
}

// ─── Nhóm theo ngày ──────────────────────────────────────────
type DateGroup = "today" | "yesterday" | "week" | "older"

const GROUP_LABELS: Record<DateGroup, string> = {
  today:     "Hôm nay",
  yesterday: "Hôm qua",
  week:      "7 ngày qua",
  older:     "Cũ hơn",
}

const GROUP_ORDER: DateGroup[] = ["today", "yesterday", "week", "older"]

function getDateGroup(session: ChatSession): DateGroup {
  const ts = session.updatedAt
  const ms =
    ts && typeof ts === "object" && "seconds" in (ts as object)
      ? (ts as Timestamp).seconds * 1000
      : Date.now()

  const now        = Date.now()
  const todayStart = new Date().setHours(0, 0, 0, 0)
  const yestStart  = todayStart - 86_400_000
  const weekStart  = now - 7 * 86_400_000

  if (ms >= todayStart) return "today"
  if (ms >= yestStart)  return "yesterday"
  if (ms >= weekStart)  return "week"
  return "older"
}

// ─── SessionItem ─────────────────────────────────────────────
function SessionItem({
  session, isActive, onSelect, onDelete, onClose,
}: {
  session: ChatSession
  isActive: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  return (
    <div
      className="group flex items-start gap-2 px-3 py-2.5 mx-1 rounded-lg cursor-pointer transition relative"
      style={{ background: isActive ? "var(--bg-hover)" : "transparent" }}
      onClick={() => { onSelect(session.id); onClose() }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
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
  )
}

// ─── Sidebar chính ───────────────────────────────────────────
export default function ChatSidebar({
  sessions, activeSessionId, onSelect, onNew, onDelete, isOpen, onClose,
}: Props) {
  const [search, setSearch] = useState("")

  // Lọc theo search (title + lastMessage)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.lastMessage?.toLowerCase().includes(q)
    )
  }, [sessions, search])

  // Nhóm theo ngày (chỉ khi không search)
  const grouped = useMemo(() => {
    if (search.trim()) return null   // search mode → danh sách phẳng
    const map = new Map<DateGroup, ChatSession[]>()
    for (const s of filtered) {
      const g = getDateGroup(s)
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(s)
    }
    return map
  }, [filtered, search])

  const isSearching = search.trim().length > 0

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
        {/* Header */}
        <div className="p-3 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Lịch sử chat
          </span>
          <button
            onClick={onNew}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition"
            style={{ background: "#2563eb", color: "#fff" }}
            title="Tạo chat mới"
          >
            ＋ Mới
          </button>
        </div>

        {/* Ô tìm kiếm */}
        <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="relative">
            <span
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
              style={{ color: "var(--text-muted)" }}
            >
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm đoạn chat..."
              className="w-full text-xs pl-7 pr-7 py-1.5 rounded-md outline-none transition"
              style={{
                background: "var(--bg-hover)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            />
            {/* Nút xóa search */}
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs leading-none"
                style={{ color: "var(--text-muted)" }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Danh sách session */}
        <div className="flex-1 overflow-y-auto py-2">

          {/* Không có kết quả */}
          {filtered.length === 0 && (
            <p className="text-xs text-center mt-6 px-4" style={{ color: "var(--text-muted)" }}>
              {isSearching
                ? `Không tìm thấy "${search}"`
                : "Chưa có cuộc trò chuyện nào"}
            </p>
          )}

          {/* ── Search mode: danh sách phẳng + số kết quả ── */}
          {isSearching && filtered.length > 0 && (
            <>
              <p className="text-xs px-4 pb-1" style={{ color: "var(--text-muted)" }}>
                {filtered.length} kết quả
              </p>
              {filtered.map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  isActive={s.id === activeSessionId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onClose={onClose}
                />
              ))}
            </>
          )}

          {/* ── Normal mode: nhóm theo ngày ── */}
          {!isSearching && grouped && GROUP_ORDER.map((group) => {
            const items = grouped.get(group)
            if (!items?.length) return null
            return (
              <div key={group} className="mb-1">
                {/* Group header */}
                <p
                  className="text-xs font-semibold px-4 pt-3 pb-1 uppercase tracking-wide"
                  style={{ color: "var(--text-muted)" }}
                >
                  {GROUP_LABELS[group]}
                </p>
                {items.map((s) => (
                  <SessionItem
                    key={s.id}
                    session={s}
                    isActive={s.id === activeSessionId}
                    onSelect={onSelect}
                    onDelete={onDelete}
                    onClose={onClose}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </aside>
    </>
  )
}
