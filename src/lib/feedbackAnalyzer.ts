import { Message } from "@/types"

export interface UserStyle {
  prefersShort: boolean      // thích trả lời ngắn
  likesCode: boolean         // thích có code example
  likesList: boolean         // thích dạng bullet/checklist
  prefersDetail: boolean     // thích giải thích chi tiết
  totalFeedback: number
}

/**
 * Phân tích feedback 👍/👎 từ messages
 * → trả về style preference của user
 */
export function analyzeFeedback(messages: Message[]): UserStyle {
  const liked   = messages.filter((m) => m.feedback === "up")
  const disliked = messages.filter((m) => m.feedback === "down")

  if (liked.length === 0) {
    return { prefersShort: false, likesCode: false, likesList: false, prefersDetail: false, totalFeedback: 0 }
  }

  // Đếm đặc điểm của các tin được 👍
  const likedShort  = liked.filter((m) => m.content.length < 300).length
  const likedLong   = liked.filter((m) => m.content.length >= 300).length
  const likedCode   = liked.filter((m) => m.content.includes("```") || m.content.includes("    ")).length
  const likedList   = liked.filter((m) => m.content.includes("- ") || m.content.includes("• ") || /^\d+\./m.test(m.content)).length

  // Đếm đặc điểm của tin bị 👎
  const dislikedShort = disliked.filter((m) => m.content.length < 300).length
  const dislikedLong  = disliked.filter((m) => m.content.length >= 300).length

  const total = liked.length

  return {
    prefersShort:   likedShort / total > 0.6 && dislikedLong > dislikedShort,
    likesCode:      likedCode  / total > 0.4,
    likesList:      likedList  / total > 0.5,
    prefersDetail:  likedLong  / total > 0.6 && dislikedShort > dislikedLong,
    totalFeedback:  liked.length + disliked.length,
  }
}

/**
 * Chuyển UserStyle → đoạn hướng dẫn bổ sung cho system prompt
 */
export function styleToPromptHint(style: UserStyle): string {
  if (style.totalFeedback < 3) return "" // chưa đủ data

  const hints: string[] = []

  if (style.prefersShort)   hints.push("Trả lời ngắn gọn, tối đa 3-5 điểm chính.")
  if (style.prefersDetail)  hints.push("Người dùng thích giải thích chi tiết, đầy đủ.")
  if (style.likesCode)      hints.push("Thêm code example khi có thể.")
  if (style.likesList)      hints.push("Ưu tiên dùng danh sách bullet hoặc số thứ tự.")

  if (hints.length === 0) return ""
  return `## Phong cách trả lời (dựa theo phản hồi của user):\n${hints.map((h) => `- ${h}`).join("\n")}`
}
