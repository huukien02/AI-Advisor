import { NextRequest } from "next/server"
import { Message } from "@/types"

export const dynamic = "force-dynamic"

// Gọi sau mỗi N tin nhắn để extract memory points + summary
export async function POST(req: NextRequest) {
  try {
    const { history } = await req.json() as { history: Message[] }

    const apiKey = process.env.GEMINI_API_KEY
    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
    if (!apiKey) return new Response("Missing API key", { status: 500 })

    const conversationText = history
      .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
      .join("\n")

    const prompt = `Phân tích cuộc trò chuyện sau và trích xuất thông tin quan trọng về người dùng.

Cuộc trò chuyện:
${conversationText}

Trả về JSON theo đúng format này (không có markdown, không có text thêm):
{
  "summary": "Tóm tắt 1-2 câu về người dùng và nhu cầu của họ",
  "memoryPoints": [
    {
      "content": "Thông tin quan trọng về người dùng",
      "topic": "chủ đề (vd: nghề nghiệp, sức khỏe, tài chính)",
      "score": 8
    }
  ]
}

Chỉ trích xuất thông tin THỰC SỰ quan trọng (tối đa 3 điểm). Score từ 1-10.`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      return new Response(`Gemini error: ${err}`, { status: 500 })
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""

    // Parse JSON từ response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return new Response("Invalid response", { status: 500 })

    const result = JSON.parse(jsonMatch[0])
    return Response.json(result)
  } catch (err) {
    console.error("Memory API error:", err)
    return new Response("Internal server error", { status: 500 })
  }
}
