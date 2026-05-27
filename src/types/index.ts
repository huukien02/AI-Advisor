import { Timestamp, FieldValue } from "firebase/firestore"

// ─── users/{uid} ───────────────────────────────────────────
export interface UserProfile {
  uid: string
  name: string
  email: string | null
  photoURL: string | null
  isAnonymous: boolean
  createdAt: Timestamp | FieldValue  // FieldValue khi dùng serverTimestamp()
  preferences: {
    language: "vi" | "en"
    advisorTopic: "general" | "tech" | "finance" | "health" | "career"
    tone: "friendly" | "formal" | "professional"
    responseLength: "short" | "medium" | "detailed"
    includeCode: boolean
    useLists: boolean
    model: string
    customInstructions: string   // system prompt do user tự viết
  }
}

// ─── chats/{uid}/sessions/{sessionId} ─────────────────────
export interface ChatSession {
  id: string                    // Firestore auto-gen ID
  title: string                 // Lấy từ tin nhắn đầu tiên
  lastMessage: string           // Preview tin nhắn cuối
  createdAt: Timestamp | FieldValue
  updatedAt: Timestamp | FieldValue
  messageCount: number
}

// ─── chats/{uid}/sessions/{sessionId}/messages/{msgId} ─────
export interface Message {
  id?: string             // Firestore auto-gen ID
  role: "user" | "assistant"
  content: string
  createdAt: Timestamp
  feedback?: "up" | "down" | null
  intent?: string         // detect từ Phase 6
}

// ─── memory/{uid} ──────────────────────────────────────────
export interface Memory {
  uid: string
  // Bộ nhớ ngắn hạn: 20 tin nhắn gần nhất (cache)
  shortTerm: Message[]
  // Bộ nhớ dài hạn: các điểm quan trọng được lưu
  longTerm: MemoryPoint[]
  // Tóm tắt tổng thể về user
  summary: string
  updatedAt: Timestamp
}

export interface MemoryPoint {
  id: string              // Firestore auto-gen
  content: string         // Nội dung quan trọng
  topic: string           // Chủ đề liên quan
  score: number           // Độ quan trọng 1-10
  createdAt: Timestamp
  lastUsed: Timestamp
}

// ─── Chat state (client-side only) ─────────────────────────
export interface ChatState {
  messages: Message[]
  isLoading: boolean
  error: string | null
}
