import { Message } from "@/types"

// Ước tính 1 token ≈ 4 ký tự (tiếng Anh) hoặc 2 ký tự (tiếng Việt)
const CHARS_PER_TOKEN = 3
const MAX_HISTORY_TOKENS = 3000   // tối đa token cho history
const MAX_SINGLE_MSG_TOKENS = 800  // tối đa token 1 tin nhắn
const MAX_SYSTEM_TOKENS = 500      // tối đa token system prompt

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Step 21a: Cắt bớt tin nhắn quá dài
 */
export function truncateMessage(content: string, maxTokens = MAX_SINGLE_MSG_TOKENS): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN
  if (content.length <= maxChars) return content
  return content.slice(0, maxChars) + "... [đã rút gọn]"
}

/**
 * Step 21b: Tối ưu history trước khi gửi API
 * - Giữ N tin gần nhất trong giới hạn token
 * - Ưu tiên giữ tin nhắn gần nhất
 * - Cắt bớt tin nhắn quá dài ở đầu history
 */
export function optimizeHistory(messages: Message[], maxTokens = MAX_HISTORY_TOKENS): Message[] {
  if (messages.length === 0) return []

  // Luôn giữ 4 tin gần nhất nguyên vẹn
  const KEEP_RECENT = 4
  const recent = messages.slice(-KEEP_RECENT)
  const older = messages.slice(0, -KEEP_RECENT)

  // Tính token đã dùng cho recent
  let usedTokens = recent.reduce((sum, m) => sum + estimateTokens(m.content), 0)
  const remaining = maxTokens - usedTokens

  if (remaining <= 0 || older.length === 0) return recent

  // Chọn tin cũ hơn từ mới đến cũ, trong giới hạn token còn lại
  const selected: Message[] = []
  let budget = remaining

  for (let i = older.length - 1; i >= 0; i--) {
    const msg = older[i]
    const tokens = estimateTokens(msg.content)

    if (tokens > MAX_SINGLE_MSG_TOKENS) {
      // Cắt bớt tin quá dài thay vì bỏ hẳn
      const truncated = { ...msg, content: truncateMessage(msg.content) }
      const truncTokens = estimateTokens(truncated.content)
      if (truncTokens <= budget) {
        selected.unshift(truncated)
        budget -= truncTokens
      }
    } else if (tokens <= budget) {
      selected.unshift(msg)
      budget -= tokens
    }
  }

  return [...selected, ...recent]
}

/**
 * Step 21c: Tối ưu system prompt — cắt bớt nếu quá dài
 */
export function optimizeSystemPrompt(prompt: string): string {
  const maxChars = MAX_SYSTEM_TOKENS * CHARS_PER_TOKEN
  if (prompt.length <= maxChars) return prompt

  // Giữ nguyên phần đầu (role + intent guide), cắt phần memory nếu cần
  const lines = prompt.split("\n")
  let result = ""
  for (const line of lines) {
    if (estimateTokens(result + line) > MAX_SYSTEM_TOKENS) break
    result += line + "\n"
  }
  return result.trim()
}

/**
 * Thống kê token usage để debug
 */
export function getTokenStats(systemPrompt: string, history: Message[], userMessage: string) {
  return {
    system: estimateTokens(systemPrompt),
    history: history.reduce((s, m) => s + estimateTokens(m.content), 0),
    user: estimateTokens(userMessage),
    total: estimateTokens(systemPrompt) +
      history.reduce((s, m) => s + estimateTokens(m.content), 0) +
      estimateTokens(userMessage),
  }
}
