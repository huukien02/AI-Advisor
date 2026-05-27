"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/useAuth"
import { UserProfile } from "@/types"

type Prefs = UserProfile["preferences"]

const MODELS = [
  { value: "gemini-2.5-flash",   label: "Gemini 2.5 Flash",  desc: "Nhanh, miễn phí" },
  { value: "gemini-2.5-pro",     label: "Gemini 2.5 Pro",    desc: "Mạnh hơn, tốn quota" },
  { value: "gemini-2.0-flash",   label: "Gemini 2.0 Flash",  desc: "Ổn định" },
  { value: "gemini-flash-latest",label: "Gemini Flash Latest",desc: "Mới nhất" },
]

const TOPICS = [
  { value: "general",  label: "🌐 Tổng quát" },
  { value: "tech",     label: "💻 Công nghệ" },
  { value: "finance",  label: "💰 Tài chính" },
  { value: "health",   label: "🏥 Sức khỏe" },
  { value: "career",   label: "🎯 Nghề nghiệp" },
]

export default function SettingsPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [prefs, setPrefs] = useState<Prefs>(() => profile?.preferences ?? {
    language: "vi",
    advisorTopic: "general",
    tone: "friendly",
    responseLength: "medium",
    includeCode: false,
    useLists: true,
    model: "gemini-2.5-flash",
    customInstructions: "",
  })

  const update = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await setDoc(doc(db, "users", user.uid), { preferences: prefs }, { merge: true })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push("/")}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition"
            style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}
          >
            ←
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Cài đặt AI</h1>
        </div>

        <div className="flex flex-col gap-6">

          {/* Model */}
          <Section title="🤖 Model AI">
            <div className="grid grid-cols-2 gap-2">
              {MODELS.map((m) => (
                <OptionCard
                  key={m.value}
                  label={m.label}
                  desc={m.desc}
                  active={prefs.model === m.value}
                  onClick={() => update("model", m.value)}
                />
              ))}
            </div>
          </Section>

          {/* Topic */}
          <Section title="🎯 Chủ đề tư vấn">
            <div className="grid grid-cols-3 gap-2">
              {TOPICS.map((t) => (
                <OptionCard
                  key={t.value}
                  label={t.label}
                  active={prefs.advisorTopic === t.value}
                  onClick={() => update("advisorTopic", t.value as Prefs["advisorTopic"])}
                />
              ))}
            </div>
          </Section>

          {/* Tone */}
          <Section title="🗣️ Giọng điệu">
            <div className="grid grid-cols-3 gap-2">
              {(["friendly", "formal", "professional"] as const).map((t) => (
                <OptionCard
                  key={t}
                  label={t === "friendly" ? "😊 Thân thiện" : t === "formal" ? "🎩 Trang trọng" : "💼 Chuyên nghiệp"}
                  active={prefs.tone === t}
                  onClick={() => update("tone", t)}
                />
              ))}
            </div>
          </Section>

          {/* Response length */}
          <Section title="📏 Độ dài trả lời">
            <div className="grid grid-cols-3 gap-2">
              {(["short", "medium", "detailed"] as const).map((l) => (
                <OptionCard
                  key={l}
                  label={l === "short" ? "⚡ Ngắn gọn" : l === "medium" ? "📄 Vừa phải" : "📚 Chi tiết"}
                  active={prefs.responseLength === l}
                  onClick={() => update("responseLength", l)}
                />
              ))}
            </div>
          </Section>

          {/* Toggles */}
          <Section title="⚙️ Tùy chọn khác">
            <Toggle
              label="Thêm code example"
              desc="AI sẽ kèm code khi trả lời về kỹ thuật"
              value={prefs.includeCode}
              onChange={(v) => update("includeCode", v)}
            />
            <Toggle
              label="Dùng danh sách bullet"
              desc="Ưu tiên trình bày dạng gạch đầu dòng"
              value={prefs.useLists}
              onChange={(v) => update("useLists", v)}
            />
            <Toggle
              label="Trả lời bằng tiếng Anh"
              desc="Mặc định tiếng Việt"
              value={prefs.language === "en"}
              onChange={(v) => update("language", v ? "en" : "vi")}
            />
          </Section>

          {/* Custom Instructions */}
          <Section title="✍️ Hướng dẫn tùy chỉnh">
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
              Viết trực tiếp — AI sẽ luôn tuân theo. Ví dụ:
            </p>
            <div className="text-xs rounded-lg p-2 mb-3 font-mono leading-relaxed"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>
              {`Bạn là AI advisor.\nƯu tiên trả lời ngắn gọn.\nDựa trên profile user.\nKhông bịa.\nNếu thiếu dữ liệu thì hỏi lại.\nĐưa lời khuyên từng bước.`}
            </div>
            <textarea
              value={prefs.customInstructions}
              onChange={(e) => update("customInstructions", e.target.value)}
              placeholder="Nhập hướng dẫn cho AI..."
              rows={6}
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              style={{
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                border: "1.5px solid var(--input-border)",
              }}
            />
            <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
              {prefs.customInstructions.length}/1000 ký tự
            </p>
          </Section>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl font-semibold text-white transition"
            style={{ background: saved ? "#22c55e" : "#2563eb", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Đang lưu..." : saved ? "✓ Đã lưu!" : "Lưu cài đặt"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--bg-surface)" }}>
      <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{title}</p>
      {children}
    </div>
  )
}

function OptionCard({ label, desc, active, onClick }: { label: string; desc?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left px-3 py-2.5 rounded-xl border-2 transition text-sm"
      style={{
        borderColor: active ? "#2563eb" : "var(--border)",
        background: active ? "rgba(37,99,235,0.08)" : "var(--bg-primary)",
        color: active ? "#2563eb" : "var(--text-primary)",
        fontWeight: active ? 600 : 400,
      }}
    >
      <div>{label}</div>
      {desc && <div className="text-xs mt-0.5" style={{ color: active ? "#60a5fa" : "var(--text-muted)" }}>{desc}</div>}
    </button>
  )
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="w-11 h-6 rounded-full transition-colors relative shrink-0"
        style={{ background: value ? "#2563eb" : "var(--border)" }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm"
          style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }}
        />
      </button>
    </div>
  )
}
