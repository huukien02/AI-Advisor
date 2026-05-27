"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Message, Memory, UserProfile } from "@/types"
import {
  saveMessage, loadRecentMessages, getMemory,
  updateMemorySummary, saveMemoryPoint, updateSession,
} from "@/lib/firestore"
import { checkSafety, getSafetyMessage } from "@/lib/safetyEngine"
import { cacheMessages, getCachedMessages } from "@/lib/localCache"
import { Timestamp } from "firebase/firestore"

const MEMORY_UPDATE_INTERVAL = 6

export function useChat(uid: string | null, sessionId: string | null, preferences?: UserProfile["preferences"] | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const memoryRef = useRef<Memory | null>(null)
  const msgCountRef = useRef(0)

  // Auto-cache khi messages thay đổi
  useEffect(() => {
    if (uid && sessionId && messages.length > 0) {
      cacheMessages(`${uid}:${sessionId}`, messages)
    }
  }, [uid, sessionId, messages])

  // Reset messages khi đổi session
  useEffect(() => {
    setMessages([])
    setError(null)
  }, [sessionId])

  /** Load lịch sử chat của session */
  const loadHistory = useCallback(async () => {
    if (!uid || !sessionId) return

    // Hiện cache ngay
    const cached = getCachedMessages(`${uid}:${sessionId}`)
    if (cached.length > 0) setMessages(cached)

    try {
      const [history, memory] = await Promise.all([
        loadRecentMessages(uid, sessionId, 20),
        getMemory(uid),
      ])
      setMessages(history)
      memoryRef.current = memory
      msgCountRef.current = history.length
    } catch (err) {
      console.warn("loadHistory error:", err)
    }
  }, [uid, sessionId])

  /** Auto extract + lưu memory sau mỗi N tin nhắn */
  const triggerMemoryUpdate = useCallback(async (currentMessages: Message[]) => {
    if (!uid) return
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: currentMessages.slice(-12) }),
      })
      if (!res.ok) return
      const { summary, memoryPoints } = await res.json()
      if (summary) await updateMemorySummary(uid, summary).catch(console.warn)
      if (Array.isArray(memoryPoints)) {
        for (const p of memoryPoints) {
          if (p.content && p.topic) {
            await saveMemoryPoint(uid, { content: p.content, topic: p.topic, score: p.score ?? 5 }).catch(console.warn)
          }
        }
      }
      const updated = await getMemory(uid).catch(() => null)
      memoryRef.current = updated
    } catch (err) {
      console.warn("Memory update error:", err)
    }
  }, [uid])

  /** Gửi tin nhắn */
  const sendMessage = useCallback(
    async (content: string, onSessionCreated?: (sessionId: string) => void) => {
      if (!uid || !sessionId || !content.trim()) return
      setError(null)

      // Safety check
      const safety = checkSafety(content)
      if (safety.level === "block") {
        setError(getSafetyMessage(safety))
        return
      }

      const userMsg: Message = { role: "user", content, createdAt: Timestamp.now() }
      setMessages((prev) => [...prev, userMsg])
      const savedUserMsgId = await saveMessage(uid, sessionId, { role: "user", content }).catch(() => undefined)
      if (savedUserMsgId) {
        setMessages((prev) => prev.map((m, i) => i === prev.length - 1 ? { ...m, id: savedUserMsgId } : m))
      }

      // Cảnh báo warn
      if (safety.level === "warn") {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: getSafetyMessage(safety),
          createdAt: Timestamp.now(),
        }])
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "", createdAt: Timestamp.now() }])
      setIsLoading(true)

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            history: messages.slice(-10),
            memory: memoryRef.current,
            currentMessage: content,
            preferences: preferences ?? null,
          }),
        })

        if (!res.ok) throw new Error(await res.text() || "API error")
        if (!res.body) throw new Error("No response body")

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullResponse += decoder.decode(value)
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullResponse }
            return updated
          })
        }

        // Lưu response + cập nhật session metadata
        const savedId = await saveMessage(uid, sessionId, { role: "assistant", content: fullResponse }).catch(() => undefined)
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], ...(savedId ? { id: savedId } : {}), content: fullResponse }
          return updated
        })

        // Cập nhật session metadata
        const isFirstMessage = msgCountRef.current === 0
        await updateSession(uid, sessionId, {
          // Tin đầu tiên → lấy nội dung user làm title
          ...(isFirstMessage ? { title: content.slice(0, 50) + (content.length > 50 ? "..." : "") } : {}),
          lastMessage: fullResponse.slice(0, 80),
          messageCount: msgCountRef.current + 2,
        }).catch(console.warn)
        onSessionCreated?.(sessionId)

        // Trigger memory update mỗi N tin
        msgCountRef.current += 2
        if (msgCountRef.current % MEMORY_UPDATE_INTERVAL === 0) {
          const snapshot = [...messages, userMsg, { role: "assistant" as const, content: fullResponse, createdAt: Timestamp.now() }]
          triggerMemoryUpdate(snapshot)
        }

      } catch (err) {
        setMessages((prev) => prev.slice(0, -1))
        setError("Có lỗi xảy ra, vui lòng thử lại.")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    },
    [uid, sessionId, messages, preferences, triggerMemoryUpdate]
  )

  return { messages, isLoading, error, sendMessage, loadHistory }
}
