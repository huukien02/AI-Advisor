import { NextRequest } from "next/server"
import { Message } from "@/types"
import { embedBatch } from "@/lib/embeddings"

export const dynamic = "force-dynamic"

// Gọi sau mỗi N tin nhắn để extract memory points + summary + embeddings (RAG)
export async function POST(req: NextRequest) {
  try {
    const { history } = await req.json() as { history: Message[] }

    const apiKey = process.env.GEMINI_API_KEY
    // Fix cứng model: gemini-2.0-flash bị quota free-tier = 0, nên luôn dùng 2.5-flash
    const model = "gemini-2.5-flash"
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

    // ─── RAG: Tạo embeddings cho từng memory point ────────────────
    // Dùng batch API để tiết kiệm — 1 request cho tất cả points
    if (Array.isArray(result.memoryPoints) && result.memoryPoints.length > 0) {
      try {
        const textsToEmbed = result.memoryPoints.map(
          (p: { topic: string; content: string }) => `${p.topic}: ${p.content}`
        )
        const embeddings = await embedBatch(textsToEmbed, apiKey)
        result.memoryPoints = result.memoryPoints.map(
          (p: { content: string; topic: string; score: number }, i: number) => ({
            ...p,
            embedding: embeddings[i],
          })
        )
        console.log(`✅ RAG: Generated ${embeddings.length} embeddings for memory points`)
      } catch (embErr) {
        // Non-fatal: nếu embedding thất bại, vẫn lưu memory point (fallback keyword search)
        console.warn("⚠️ Embedding generation failed, saving without embedding:", embErr)
      }
    }
    // ─────────────────────────────────────────────────────────────

    return Response.json(result)
  } catch (err) {
    console.error("Memory API error:", err)
    return new Response("Internal server error", { status: 500 })
  }
}
