"use client"

import { useState, KeyboardEvent } from "react"

interface Props {
  onSend: (message: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [input, setInput] = useState("")

  const handleSend = () => {
    if (!input.trim() || disabled) return
    onSend(input.trim())
    setInput("")
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="flex items-end gap-2 p-3 border-t"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nhập tin nhắn... (Enter gửi, Shift+Enter xuống dòng)"
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm
          focus:outline-none focus:ring-2 max-h-32 overflow-y-auto transition"
        style={{
          background: "var(--input-bg)",
          color: "var(--text-primary)",
          border: "1.5px solid var(--input-border)",
          minHeight: "44px",
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        className="h-11 w-11 rounded-xl flex items-center justify-center transition-colors"
        style={{
          background: disabled || !input.trim() ? "var(--bg-hover)" : "#2563eb",
          color: disabled || !input.trim() ? "var(--text-muted)" : "#ffffff",
          cursor: disabled || !input.trim() ? "not-allowed" : "pointer",
        }}
      >
        {disabled ? (
          <span className="animate-spin text-sm">⏳</span>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )}
      </button>
    </div>
  )
}
