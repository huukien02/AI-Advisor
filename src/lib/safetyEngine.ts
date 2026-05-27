// ─── Phase 10: Safety Rule Engine ───────────────────────────

export type SafetyLevel = "safe" | "warn" | "block"

export interface SafetyResult {
  level: SafetyLevel
  reason?: string
  suggestion?: string // gợi ý câu hỏi thay thế
}

// ─── Rule definitions ────────────────────────────────────────

const BLOCK_PATTERNS: { pattern: RegExp; reason: string }[] = [
  // Bạo lực / tự hại
  { pattern: /(cách tự tử|hướng dẫn tự tử|tự sát như thế nào|cách giết người|cách tấn công)/i, reason: "Nội dung liên quan đến tự hại hoặc bạo lực" },
  { pattern: /(how to suicide|how to kill myself|how to harm|how to make bomb|how to make weapon)/i, reason: "Content related to self-harm or violence" },

  // Nội dung bất hợp pháp
  { pattern: /(mua bán ma túy|cách làm ma túy|hack tài khoản|crack phần mềm|cách lừa đảo)/i, reason: "Nội dung liên quan đến hoạt động bất hợp pháp" },
  { pattern: /(how to hack|how to crack|drug synthesis|how to scam|illegal weapon)/i, reason: "Content related to illegal activities" },

  // Nội dung người lớn / phân biệt
  { pattern: /(nội dung khiêu dâm|phân biệt chủng tộc|kỳ thị|hate speech)/i, reason: "Nội dung không phù hợp" },
]

const WARN_PATTERNS: { pattern: RegExp; reason: string; suggestion: string }[] = [
  // Y tế nhạy cảm
  {
    pattern: /(uống bao nhiêu thuốc|liều lượng thuốc|tự điều trị|tự chữa bệnh)/i,
    reason: "Câu hỏi về y tế cần chuyên gia",
    suggestion: "Bạn nên tham khảo ý kiến bác sĩ hoặc dược sĩ trực tiếp cho vấn đề này.",
  },
  // Tài chính rủi ro cao
  {
    pattern: /(đầu tư toàn bộ|vay tiền đầu tư|đầu tư forex|tiền ảo chắc chắn lời|cam kết lợi nhuận)/i,
    reason: "Câu hỏi về đầu tư rủi ro cao",
    suggestion: "Đầu tư luôn có rủi ro. Tôi có thể tư vấn nhưng không nên quyết định dựa hoàn toàn vào AI.",
  },
  // Pháp lý
  {
    pattern: /(vi phạm pháp luật|lách luật|trốn thuế|gian lận)/i,
    reason: "Câu hỏi liên quan đến pháp lý",
    suggestion: "Vấn đề pháp lý cần tham khảo luật sư có chuyên môn.",
  },
]

// ─── Rate limiting (client-side) ────────────────────────────
const MESSAGE_TIMESTAMPS: number[] = []
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 phút
const RATE_LIMIT_MAX = 20 // tối đa 20 tin/phút

function checkRateLimit(): boolean {
  const now = Date.now()
  // Xóa timestamps cũ hơn 1 phút
  while (MESSAGE_TIMESTAMPS.length > 0 && MESSAGE_TIMESTAMPS[0] < now - RATE_LIMIT_WINDOW_MS) {
    MESSAGE_TIMESTAMPS.shift()
  }
  if (MESSAGE_TIMESTAMPS.length >= RATE_LIMIT_MAX) return false
  MESSAGE_TIMESTAMPS.push(now)
  return true
}

// ─── Main check function ─────────────────────────────────────
export function checkSafety(message: string): SafetyResult {
  const trimmed = message.trim()

  // 1. Kiểm tra độ dài
  if (trimmed.length === 0) {
    return { level: "block", reason: "Tin nhắn trống" }
  }
  if (trimmed.length > 2000) {
    return { level: "block", reason: "Tin nhắn quá dài (tối đa 2000 ký tự)" }
  }

  // 2. Rate limit
  if (!checkRateLimit()) {
    return {
      level: "block",
      reason: "Bạn đang gửi quá nhiều tin nhắn",
      suggestion: "Vui lòng đợi 1 phút rồi thử lại.",
    }
  }

  // 3. Block patterns
  for (const { pattern, reason } of BLOCK_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        level: "block",
        reason,
        suggestion: "Tôi không thể hỗ trợ nội dung này. Nếu bạn đang gặp khó khăn, hãy liên hệ đường dây hỗ trợ tâm lý: 1800 599 920 (miễn phí).",
      }
    }
  }

  // 4. Warn patterns
  for (const { pattern, reason, suggestion } of WARN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { level: "warn", reason, suggestion }
    }
  }

  return { level: "safe" }
}

// ─── Safety message cho UI ───────────────────────────────────
export function getSafetyMessage(result: SafetyResult): string {
  if (result.level === "block") {
    return `⛔ ${result.reason}${result.suggestion ? `\n\n${result.suggestion}` : ""}`
  }
  if (result.level === "warn") {
    return `⚠️ Lưu ý: ${result.reason}${result.suggestion ? `\n${result.suggestion}` : ""}`
  }
  return ""
}
