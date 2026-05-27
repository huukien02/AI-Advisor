/**
 * Gemini Embedding API utilities — SERVER-SIDE ONLY
 * Model: text-embedding-004 (768 chiều)
 *
 * KHÔNG import file này từ client components.
 * Chỉ dùng trong: /api/chat, /api/memory
 */

const EMBEDDING_MODEL = "text-embedding-004"

/** Embed một đoạn text → vector 768 chiều */
export async function embedText(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
      }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Embedding API error: ${err}`)
  }
  const data = await res.json()
  return data.embedding.values as number[]
}

/**
 * Batch embed nhiều text cùng lúc — tiết kiệm API calls so với gọi từng cái
 * Ví dụ: 3 memory points → 1 request thay vì 3
 */
export async function embedBatch(texts: string[], apiKey: string): Promise<number[][]> {
  if (texts.length === 0) return []

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
        })),
      }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Batch embedding error: ${err}`)
  }
  const data = await res.json()
  return data.embeddings.map((e: { values: number[] }) => e.values)
}

/**
 * Tính cosine similarity giữa 2 vector
 * Kết quả: 0 = hoàn toàn không liên quan, 1 = giống hệt nhau
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}
