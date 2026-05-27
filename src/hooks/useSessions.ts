"use client"

import { useState, useCallback } from "react"
import { ChatSession } from "@/types"
import { loadSessions, createSession, deleteSession } from "@/lib/firestore"

export function useSessions(uid: string | null) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  /** Load danh sách sessions */
  const fetchSessions = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    try {
      const list = await loadSessions(uid)
      setSessions(list)
      // Tự động chọn session mới nhất nếu chưa có
      if (list.length > 0 && !activeSessionId) {
        setActiveSessionId(list[0].id)
      }
    } catch (err) {
      console.warn("fetchSessions error:", err)
    } finally {
      setLoading(false)
    }
  }, [uid, activeSessionId])

  /** Tạo session mới */
  const newSession = useCallback(async (firstMessage = "Cuộc trò chuyện mới") => {
    if (!uid) return null
    const sessionId = await createSession(uid, firstMessage)
    const newSess: ChatSession = {
      id: sessionId,
      title: firstMessage.slice(0, 50),
      lastMessage: "",
      createdAt: new Date() as unknown as import("firebase/firestore").Timestamp,
      updatedAt: new Date() as unknown as import("firebase/firestore").Timestamp,
      messageCount: 0,
    }
    setSessions((prev) => [newSess, ...prev])
    setActiveSessionId(sessionId)
    return sessionId
  }, [uid])

  /** Xóa session */
  const removeSession = useCallback(async (sessionId: string) => {
    if (!uid) return
    await deleteSession(uid, sessionId)
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    // Nếu xóa session đang active → chuyển sang session kế tiếp
    if (activeSessionId === sessionId) {
      setSessions((prev) => {
        const remaining = prev.filter((s) => s.id !== sessionId)
        setActiveSessionId(remaining[0]?.id ?? null)
        return remaining
      })
    }
  }, [uid, activeSessionId])

  /** Cập nhật title/lastMessage trong local state */
  const updateSessionLocal = useCallback((sessionId: string, data: Partial<ChatSession>) => {
    setSessions((prev) =>
      prev.map((s) => s.id === sessionId ? { ...s, ...data } : s)
    )
  }, [])

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    loading,
    fetchSessions,
    newSession,
    removeSession,
    updateSessionLocal,
  }
}
