import { NextRequest } from "next/server"
import { buildPrompt } from "@/lib/promptEngine"
import { optimizeHistory, optimizeSystemPrompt, getTokenStats } from "@/lib/tokenOptimizer"
import { Message, Memory, UserProfile } from "@/types"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { message, history, memory, currentMessage, preferences } = await req.json() as {
      message: string
      history: Message[]
      memory: Memory | null
      currentMessage?: string
      preferences?: UserProfile["preferences"] | null
    }

    const rawPrompt = buildPrompt({ memory, history, currentMessage: currentMessage ?? message, preferences })
    const systemPrompt = optimizeSystemPrompt(rawPrompt)

    // Step 21: Tối ưu history trước khi gửi
    const optimizedHistory = optimizeHistory(history)

    // Log token stats (dev only)
    if (process.env.NODE_ENV === "development") {
      const stats = getTokenStats(systemPrompt, optimizedHistory, message)
      console.log(`📊 Token stats — system:${stats.system} history:${stats.history} user:${stats.user} total:${stats.total}`)
    }

    const apiKey = process.env.GEMINI_API_KEY
    // Dùng model do user chọn trong Settings; fallback về env var hoặc default
    const model = preferences?.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
    if (!apiKey) return new Response("Missing GEMINI_API_KEY", { status: 500 })

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [
            ...optimizedHistory.map((m: Message) => ({
              role: m.role === "user" ? "user" : "model",
              parts: [{ text: m.content }],
            })),
            { role: "user", parts: [{ text: message }] },
          ],
          generationConfig: {
            temperature: 0.7,
            // Khớp với responseLength của user: short→512, medium→1024, detailed→2048
            maxOutputTokens: ({ short: 512, medium: 1024, detailed: 2048 } as Record<string, number>)[preferences?.responseLength ?? "medium"] ?? 1024,
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      console.error("Gemini error:", err)
      return new Response(`Gemini error: ${err}`, { status: 500 })
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = geminiRes.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const raw = line.slice(6).trim()
              if (!raw || raw === "[DONE]") continue
              try {
                const data = JSON.parse(raw)
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
                if (text) controller.enqueue(new TextEncoder().encode(text))
              } catch { /* skip */ }
            }
          }
        }
        controller.close()
      },
    })

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  } catch (err) {
    console.error("API route error:", err)
    return new Response("Internal server error", { status: 500 })
  }
}
