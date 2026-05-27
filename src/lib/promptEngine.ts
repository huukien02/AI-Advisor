import { Memory, Message, UserProfile } from "@/types"
import { detectIntent, rankMemory, selectContext } from "./intelligence"

interface BuildPromptOptions {
  memory: Memory | null
  history: Message[]
  currentMessage?: string
  preferences?: UserProfile["preferences"] | null
}

export function buildPrompt({
  memory,
  history,
  currentMessage = "",
  preferences,
}: BuildPromptOptions): string {
  const sections: string[] = []

  // 1. Role & persona + ngôn ngữ
  const isEnglish = preferences?.language === "en"
  const langRule = isEnglish
    ? "IMPORTANT: You MUST reply in English only, regardless of the language the user writes in."
    : "Luôn trả lời bằng tiếng Việt."
  sections.push(`Bạn là AI Advisor — trợ lý tư vấn thông minh, thân thiện và đáng tin cậy.\n${langRule}`)

  // 2. Tone theo config user
  if (preferences?.tone) {
    const toneGuide: Record<string, string> = {
      friendly:     "Giọng điệu thân thiện, gần gũi như người bạn.",
      formal:       "Giọng điệu trang trọng, lịch sự.",
      professional: "Giọng điệu chuyên nghiệp, súc tích như chuyên gia.",
    }
    if (toneGuide[preferences.tone]) {
      sections.push(`## Giọng điệu:\n${toneGuide[preferences.tone]}`)
    }
  }

  // 3. Phong cách trả lời — do user tự config
  if (preferences) {
    const styleHints: string[] = []

    const lengthGuide: Record<string, string> = {
      short:    "Trả lời ngắn gọn, tối đa 3 ý chính.",
      medium:   "Trả lời vừa phải, rõ ràng, đủ thông tin.",
      detailed: "Trả lời chi tiết, đầy đủ, giải thích kỹ.",
    }
    if (preferences.responseLength) styleHints.push(lengthGuide[preferences.responseLength])
    if (preferences.includeCode)    styleHints.push("Thêm code example khi phù hợp.")
    if (preferences.useLists)       styleHints.push("Ưu tiên dùng danh sách bullet hoặc số thứ tự.")

    if (styleHints.length > 0) {
      sections.push(`## Phong cách trả lời:\n${styleHints.map((h) => `- ${h}`).join("\n")}`)
    }
  }

  // 4. Advisor topic — lĩnh vực tư vấn user chọn
  if (preferences?.advisorTopic && preferences.advisorTopic !== "general") {
    const topicGuide: Record<string, string> = {
      tech:    "Tập trung vào công nghệ, lập trình, phần mềm, phần cứng và xu hướng kỹ thuật số.",
      finance: "Tập trung vào tài chính cá nhân, đầu tư, tiết kiệm, ngân sách và kinh tế.",
      health:  "Tập trung vào sức khỏe, dinh dưỡng, thể dục, tâm lý và lối sống lành mạnh.",
      career:  "Tập trung vào nghề nghiệp, kỹ năng, phỏng vấn, phát triển bản thân và thị trường lao động.",
    }
    if (topicGuide[preferences.advisorTopic]) {
      sections.push(`## Lĩnh vực chuyên môn:\n${topicGuide[preferences.advisorTopic]}`)
    }
  }

  // 6. Detect intent → điều chỉnh hướng dẫn
  if (currentMessage) {
    const intent = detectIntent(currentMessage)
    const intentGuide: Record<string, string> = {
      greeting:       "Đây là lời chào — phản hồi thân thiện, ngắn.",
      question:       "Người dùng đang hỏi — trả lời rõ ràng, chính xác.",
      advice_request: "Người dùng xin tư vấn — đưa ra gợi ý cụ thể, thực tế.",
      complaint:      "Người dùng đang gặp vấn đề — đồng cảm và giúp giải quyết.",
      feedback:       "Người dùng đang phản hồi — tiếp thu và điều chỉnh.",
      personal_share: "Người dùng đang chia sẻ thông tin cá nhân — ghi nhớ và phản hồi quan tâm.",
      general:        "",
    }
    if (intentGuide[intent]) {
      sections.push(`## Hướng dẫn phản hồi:\n${intentGuide[intent]}`)
    }
  }

  // 7. Custom instructions — do user tự viết, ưu tiên cao
  if (preferences?.customInstructions?.trim()) {
    sections.push(`## Hướng dẫn từ người dùng (ưu tiên cao):\n${preferences.customInstructions.trim()}`)
  }

  // 8. Memory context
  if (memory) {
    if (memory.summary) {
      sections.push(`## Tóm tắt về người dùng:\n${memory.summary}`)
    }
    if (memory.longTerm?.length > 0) {
      const ranked = rankMemory(memory.longTerm, currentMessage, history)
      const selected = selectContext(currentMessage, ranked, 5)
      const relevant = selected.length > 0 ? selected : ranked.slice(0, 3)
      if (relevant.length > 0) {
        sections.push(`## Thông tin đã biết:\n${relevant.map((p) => `- [${p.topic}] ${p.content}`).join("\n")}`)
      }
    }
  }

  // 9. Rules
  sections.push(`## Quy tắc:
- Không cung cấp thông tin sai lệch hoặc gây hại
- Nếu không chắc, nói rõ không chắc
- Tư vấn dựa trên thông tin đã biết về người dùng khi phù hợp`)

  return sections.join("\n\n")
}
