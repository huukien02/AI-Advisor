"use client"

import { Message } from "@/types"
import { updateMessageFeedback } from "@/lib/firestore"

interface Props {
  message: Message
  uid: string
  sessionId: string
}

export default function ChatMessage({ message, uid, sessionId }: Props) {
  const isUser = message.role === "user"

  const handleFeedback = async (type: "up" | "down") => {
    if (!message.id) return
    await updateMessageFeedback(uid, sessionId, message.id, type)
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className="max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
        style={
          isUser
            ? {
                background: "var(--bubble-user-bg)",
                color: "var(--bubble-user-text)",
                borderBottomRightRadius: "4px",
              }
            : {
                background: "var(--bubble-ai-bg)",
                color: "var(--bubble-ai-text)",
                borderBottomLeftRadius: "4px",
              }
        }
      >
        {/* Avatar AI */}
        {!isUser && (
          <div className="text-xs font-semibold mb-1" style={{ color: "#3b82f6" }}>
            🤖 AI Advisor
          </div>
        )}

        {/* Nội dung */}
        <div>{message.content || <span className="animate-pulse">▍</span>}</div>

        {/* Feedback */}
        {!isUser && message.content && message.id && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleFeedback("up")}
              className="text-xs px-2 py-0.5 rounded-full border transition"
              style={{
                borderColor: message.feedback === "up" ? "#22c55e" : "var(--border)",
                color: message.feedback === "up" ? "#22c55e" : "var(--text-muted)",
                background: message.feedback === "up" ? "rgba(34,197,94,0.1)" : "transparent",
              }}
            >
              👍
            </button>
            <button
              onClick={() => handleFeedback("down")}
              className="text-xs px-2 py-0.5 rounded-full border transition"
              style={{
                borderColor: message.feedback === "down" ? "#ef4444" : "var(--border)",
                color: message.feedback === "down" ? "#ef4444" : "var(--text-muted)",
                background: message.feedback === "down" ? "rgba(239,68,68,0.1)" : "transparent",
              }}
            >
              👎
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
