import { Message, MemoryPoint } from "@/types"
import { cosineSimilarity } from "./embeddings"

// ─── Step 12: Detect Intent ──────────────────────────────────
export type Intent =
  | "greeting"       // chào hỏi
  | "question"       // hỏi thông tin
  | "advice_request" // xin tư vấn
  | "complaint"      // phàn nàn / vấn đề
  | "feedback"       // phản hồi về AI
  | "personal_share" // chia sẻ thông tin cá nhân
  | "general"        // chung chung

const INTENT_PATTERNS: Record<Intent, RegExp[]> = {
  greeting: [
    /^(xin chào|hello|hi|chào|hey|alo|good morning|good evening)/i,
    /^(bạn khỏe|bạn có khỏe|hôm nay thế nào)/i,
  ],
  question: [
    /(là gì|là sao|thế nào|như thế nào|tại sao|vì sao|bao nhiêu|khi nào|ở đâu|ai là)/i,
    /(what|how|why|when|where|who|which|explain|tell me)/i,
    /\?$/,
  ],
  advice_request: [
    /(tư vấn|khuyên|nên|không nên|có nên|làm sao để|cách|giúp tôi|hãy giúp)/i,
    /(advice|suggest|recommend|should i|help me|what should)/i,
  ],
  complaint: [
    /(khó|khó khăn|vấn đề|lỗi|sai|không được|thất bại|tệ|tệ quá|bực|chán)/i,
    /(problem|issue|error|wrong|bad|terrible|frustrated|annoyed)/i,
  ],
  feedback: [
    /(câu trả lời|phản hồi của bạn|bạn nói|bạn trả lời|không đúng|không chính xác)/i,
    /(your answer|you said|incorrect|wrong answer|not right)/i,
  ],
  personal_share: [
    /(tôi là|tôi đang|tôi có|tôi làm|tôi sống|tôi thích|tôi ghét|tôi muốn|tôi cần)/i,
    /(i am|i'm|i have|i work|i like|i hate|i want|i need|my name|i live)/i,
  ],
  general: [],
}

export function detectIntent(message: string): Intent {
  const lower = message.toLowerCase().trim()

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS) as [Intent, RegExp[]][]) {
    if (intent === "general") continue
    if (patterns.some((p) => p.test(lower))) {
      return intent
    }
  }
  return "general"
}

// ─── Step 13: Context Selector ──────────────────────────────
/**
 * Chọn memory points liên quan đến tin nhắn hiện tại
 * Dựa trên keyword overlap giữa message và memory content
 */
export function selectContext(
  message: string,
  memoryPoints: MemoryPoint[],
  topK = 5
): MemoryPoint[] {
  if (memoryPoints.length === 0) return []

  const msgWords = tokenize(message)

  const scored = memoryPoints.map((point) => {
    const pointWords = tokenize(point.content + " " + point.topic)
    const overlap = msgWords.filter((w) => pointWords.includes(w)).length
    return { point, overlap }
  })

  return scored
    .filter((s) => s.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, topK)
    .map((s) => s.point)
}

// ─── Step 14: Memory Ranking ────────────────────────────────
/**
 * Score = relevance (keyword match) + recency + importance (score field)
 * Trả về memory points đã được sắp xếp theo tổng điểm
 */
export function rankMemory(
  points: MemoryPoint[],
  query: string,
  history: Message[]
): MemoryPoint[] {
  if (points.length === 0) return []

  const queryWords = tokenize(query)
  const historyText = history.map((m) => m.content).join(" ").toLowerCase()
  const now = Date.now()

  const ranked = points.map((point) => {
    // 1. Relevance: keyword overlap với query
    const pointWords = tokenize(point.content)
    const relevance = queryWords.filter((w) => pointWords.includes(w)).length * 3

    // 2. Recency: ưu tiên memory mới hơn (giảm dần theo thời gian)
    const ageMs = now - (point.createdAt as unknown as { seconds: number }).seconds * 1000
    const ageDays = ageMs / (1000 * 60 * 60 * 24)
    const recency = Math.max(0, 10 - ageDays * 0.5) // giảm 0.5 điểm mỗi ngày

    // 3. Importance: score từ Firestore
    const importance = point.score ?? 5

    // 4. Context boost: nếu topic xuất hiện trong lịch sử gần đây
    const contextBoost = historyText.includes(point.topic.toLowerCase()) ? 2 : 0

    const total = relevance + recency + importance + contextBoost
    return { point, total }
  })

  return ranked
    .sort((a, b) => b.total - a.total)
    .map((r) => r.point)
}

// ─── Step 15: Semantic Rank (RAG) ───────────────────────────
/**
 * Xếp hạng memory points dùng vector similarity thay vì keyword matching.
 * Score = cosine_similarity (chính) + recency + importance + context_boost
 *
 * Fallback về score=0 nếu point chưa có embedding (backward-compatible).
 */
export function semanticRankMemory(
  queryEmbedding: number[],
  points: MemoryPoint[],
  history: Message[]
): MemoryPoint[] {
  if (points.length === 0) return []

  const now = Date.now()
  const historyText = history.map((m) => m.content).join(" ").toLowerCase()

  const ranked = points.map((point) => {
    // 1. Semantic similarity: cosine(query, point) → scale lên 0-10
    const similarity = point.embedding
      ? cosineSimilarity(queryEmbedding, point.embedding) * 10
      : 0  // point cũ chưa có embedding → dùng fallback ở promptEngine

    // 2. Recency: ưu tiên memory mới hơn
    const ageMs = now - (point.createdAt as unknown as { seconds: number }).seconds * 1000
    const ageDays = ageMs / (1000 * 60 * 60 * 24)
    const recency = Math.max(0, 5 - ageDays * 0.2)

    // 3. Importance: score từ Firestore
    const importance = point.score ?? 5

    // 4. Context boost: topic xuất hiện gần đây trong hội thoại
    const contextBoost = historyText.includes(point.topic.toLowerCase()) ? 2 : 0

    return { point, total: similarity + recency + importance + contextBoost }
  })

  return ranked.sort((a, b) => b.total - a.total).map((r) => r.point)
}

// ─── Helper ─────────────────────────────────────────────────
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\sàáảãạăắặẳẵẫâấậẩẫèéẻẽẹêếệểễìíỉĩịòóỏõọôốộổỗơớợởỡùúủũụưứựửữđ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2) // bỏ từ quá ngắn
}
