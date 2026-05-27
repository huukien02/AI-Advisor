"use client"

import { useState, useEffect } from "react"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { UserProfile } from "@/types"

type Prefs = UserProfile["preferences"]

const MODELS = [
  { value: "gemini-2.5-flash",    label: "Gemini 2.5 Flash",   desc: "Nhanh · miễn phí" },
  { value: "gemini-2.5-pro",      label: "Gemini 2.5 Pro",     desc: "Mạnh hơn" },
  { value: "gemini-2.0-flash",    label: "Gemini 2.0 Flash",   desc: "Ổn định" },
  { value: "gemini-flash-latest", label: "Flash Latest",       desc: "Mới nhất" },
]

const TOPICS = [
  { value: "general", label: "🌐 Tổng quát" },
  { value: "tech",    label: "💻 Công nghệ" },
  { value: "finance", label: "💰 Tài chính" },
  { value: "health",  label: "🏥 Sức khỏe" },
  { value: "career",  label: "🎯 Nghề nghiệp" },
]

interface Props {
  open: boolean
  onClose: () => void
  uid: string
  initialPrefs: Prefs
  onSaved?: (prefs: Prefs) => void
}

export default function SettingsModal({ open, onClose, uid, initialPrefs, onSaved }: Props) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!initialPrefs) return   // guard against undefined (old Firestore docs missing preferences)
    setPrefs({
      ...initialPrefs,
      customInstructions: initialPrefs.customInstructions ?? "",
      responseLength:     initialPrefs.responseLength ?? "medium",
      includeCode:        initialPrefs.includeCode ?? false,
      useLists:           initialPrefs.useLists ?? true,
    })
  }, [initialPrefs])

  if (!open) return null

  const update = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await setDoc(doc(db, "users", uid), { preferences: prefs }, { merge: true })
      onSaved?.(prefs)   // cập nhật profile state ngay, không cần reload
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 900)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal — rộng, cao, ít scroll */}
      <div
        className="fixed z-50 inset-4 md:inset-8 lg:inset-x-24 lg:inset-y-8
          rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: "var(--bg-surface)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: "var(--border)" }}>
          <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>⚙️ Cài đặt AI</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-lg transition"
            style={{ color: "var(--text-muted)", background: "var(--bg-hover)" }}>✕</button>
        </div>

        {/* Body — 2 cột, overflow chỉ khi thực sự cần */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">

            {/* CỘT TRÁI */}
            <div className="flex flex-col gap-5">

              {/* Model */}
              <Group title="🤖 Model AI">
                <div className="grid grid-cols-2 gap-2">
                  {MODELS.map((m) => (
                    <Chip key={m.value} label={m.label} sub={m.desc}
                      active={prefs.model === m.value}
                      onClick={() => update("model", m.value)} />
                  ))}
                </div>
              </Group>

              {/* Topic */}
              <Group title="🎯 Chủ đề tư vấn">
                <div className="grid grid-cols-3 gap-2">
                  {TOPICS.map((t) => (
                    <Chip key={t.value} label={t.label}
                      active={prefs.advisorTopic === t.value}
                      onClick={() => update("advisorTopic", t.value as Prefs["advisorTopic"])} />
                  ))}
                </div>
              </Group>

              {/* Tone + Length */}
              <div className="grid grid-cols-2 gap-4">
                <Group title="🗣️ Giọng điệu">
                  <div className="flex flex-col gap-1.5">
                    {(["friendly", "formal", "professional"] as const).map((t) => (
                      <Chip key={t}
                        label={t === "friendly" ? "😊 Thân thiện" : t === "formal" ? "🎩 Trang trọng" : "💼 Chuyên nghiệp"}
                        active={prefs.tone === t}
                        onClick={() => update("tone", t)} />
                    ))}
                  </div>
                </Group>

                <Group title="📏 Độ dài">
                  <div className="flex flex-col gap-1.5">
                    {(["short", "medium", "detailed"] as const).map((l) => (
                      <Chip key={l}
                        label={l === "short" ? "⚡ Ngắn gọn" : l === "medium" ? "📄 Vừa phải" : "📚 Chi tiết"}
                        active={prefs.responseLength === l}
                        onClick={() => update("responseLength", l)} />
                    ))}
                  </div>
                </Group>
              </div>

              {/* Toggles */}
              <Group title="⚙️ Tùy chọn">
                <Toggle label="Code example" desc="Kèm code khi kỹ thuật"
                  value={prefs.includeCode} onChange={(v) => update("includeCode", v)} />
                <Toggle label="Danh sách bullet" desc="Ưu tiên gạch đầu dòng"
                  value={prefs.useLists} onChange={(v) => update("useLists", v)} />
                <Toggle label="Tiếng Anh" desc="Mặc định tiếng Việt"
                  value={prefs.language === "en"} onChange={(v) => update("language", v ? "en" : "vi")} />
              </Group>
            </div>

            {/* CỘT PHẢI — Custom Instructions chiếm toàn bộ */}
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1"
                  style={{ color: "var(--text-muted)" }}>✍️ Hướng dẫn tùy chỉnh</p>
                <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
                  AI sẽ luôn tuân theo. Viết tự do — một dòng một quy tắc.
                </p>
              </div>

              {/* Example */}
              <div className="text-xs rounded-xl p-3 font-mono leading-relaxed whitespace-pre"
                style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>
{`Bạn là AI advisor.
Ưu tiên trả lời ngắn gọn.
Dựa trên profile user.
Không bịa.
Nếu thiếu dữ liệu thì hỏi lại.
Đưa lời khuyên từng bước.`}
              </div>

              {/* Textarea chiếm phần còn lại */}
              <textarea
                value={prefs.customInstructions}
                onChange={(e) => update("customInstructions", e.target.value)}
                placeholder="Nhập hướng dẫn của bạn..."
                maxLength={1000}
                className="flex-1 w-full rounded-xl px-4 py-3 text-sm resize-none
                  focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                style={{
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  border: "1.5px solid var(--input-border)",
                  minHeight: "180px",
                }}
              />
              <p className="text-xs text-right" style={{ color: "var(--text-muted)" }}>
                {(prefs.customInstructions ?? "").length}/1000
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-2"
          style={{ borderColor: "var(--border)" }}>
          <button onClick={onClose}
            className="w-32 py-2.5 rounded-xl text-sm font-medium transition"
            style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>
            Hủy
          </button>
          <button onClick={handleSave} disabled={saving}
            className="w-32 py-2.5 rounded-xl text-sm font-semibold text-white transition"
            style={{ background: saved ? "#22c55e" : "#2563eb", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Đang lưu..." : saved ? "✓ Đã lưu!" : "Lưu cài đặt"}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-2"
        style={{ color: "var(--text-muted)" }}>{title}</p>
      {children}
    </div>
  )
}

function Chip({ label, sub, active, onClick }: { label: string; sub?: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="text-left px-3 py-2 rounded-xl border-2 transition text-sm w-full"
      style={{
        borderColor: active ? "#2563eb" : "var(--border)",
        background: active ? "rgba(37,99,235,0.08)" : "transparent",
        color: active ? "#2563eb" : "var(--text-primary)",
        fontWeight: active ? 600 : 400,
      }}>
      {label}
      {sub && <span className="block text-xs mt-0.5" style={{ color: active ? "#60a5fa" : "var(--text-muted)" }}>{sub}</span>}
    </button>
  )
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0"
      style={{ borderColor: "var(--border)" }}>
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
      </div>
      <button onClick={() => onChange(!value)}
        className="w-11 h-6 rounded-full transition-colors relative shrink-0 ml-4 overflow-hidden"
        style={{ background: value ? "#2563eb" : "var(--border)" }}>
        <span className="absolute top-0.5 left-0 w-5 h-5 rounded-full bg-white transition-transform shadow-sm"
          style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }} />
      </button>
    </div>
  )
}
