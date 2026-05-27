import { Message } from "@/types"

const CACHE_VERSION = "v1"
const MAX_CACHED_MESSAGES = 30

function getKey(uid: string) {
  return `ai-advisor:${CACHE_VERSION}:messages:${uid}`
}

/** Lưu messages vào localStorage */
export function cacheMessages(uid: string, messages: Message[]): void {
  try {
    const toCache = messages.slice(-MAX_CACHED_MESSAGES)
    // Chỉ lưu fields cần thiết, bỏ Timestamp object (không serialize được)
    const serialized = toCache.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      feedback: m.feedback,
      createdAt: m.createdAt?.seconds
        ? { seconds: (m.createdAt as unknown as { seconds: number }).seconds }
        : null,
    }))
    localStorage.setItem(getKey(uid), JSON.stringify(serialized))
  } catch {
    // localStorage có thể bị block (private mode)
  }
}

/** Đọc messages từ localStorage — load tức thì trước khi Firestore trả về */
export function getCachedMessages(uid: string): Message[] {
  try {
    const raw = localStorage.getItem(getKey(uid))
    if (!raw) return []
    return JSON.parse(raw) as Message[]
  } catch {
    return []
  }
}

/** Xóa cache khi logout */
export function clearCache(uid: string): void {
  try {
    localStorage.removeItem(getKey(uid))
  } catch { /* ignore */ }
}

/** Xóa toàn bộ cache (dùng khi cần reset) */
export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("ai-advisor:"))
    keys.forEach((k) => localStorage.removeItem(k))
  } catch { /* ignore */ }
}
