import {
  collection, addDoc, getDocs, doc, setDoc, getDoc,
  query, orderBy, limit, serverTimestamp, updateDoc, deleteDoc,
} from "firebase/firestore"
import { db } from "./firebase"
import { Message, Memory, MemoryPoint, ChatSession } from "@/types"

// ─── Sessions ────────────────────────────────────────────────

/** Tạo session mới — trả về sessionId */
export async function createSession(uid: string, firstMessage: string): Promise<string> {
  const ref = collection(db, "chats", uid, "sessions")
  const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "")
  const docRef = await addDoc(ref, {
    title,
    lastMessage: firstMessage.slice(0, 80),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    messageCount: 0,
  })
  return docRef.id
}

/** Load danh sách sessions, sắp xếp theo mới nhất */
export async function loadSessions(uid: string): Promise<ChatSession[]> {
  const ref = collection(db, "chats", uid, "sessions")
  const q = query(ref, orderBy("updatedAt", "desc"), limit(30))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatSession))
}

/** Cập nhật title + lastMessage của session */
export async function updateSession(uid: string, sessionId: string, data: Partial<Pick<ChatSession, "title" | "lastMessage" | "messageCount">>) {
  const ref = doc(db, "chats", uid, "sessions", sessionId)
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
}

/** Xóa 1 session và tất cả messages */
export async function deleteSession(uid: string, sessionId: string) {
  // Xóa messages trước
  const msgsRef = collection(db, "chats", uid, "sessions", sessionId, "messages")
  const snap = await getDocs(msgsRef)
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
  // Xóa session
  await deleteDoc(doc(db, "chats", uid, "sessions", sessionId))
}

// ─── Messages ────────────────────────────────────────────────

/** Lưu 1 tin nhắn vào session */
export async function saveMessage(uid: string, sessionId: string, message: Omit<Message, "id" | "createdAt">) {
  const ref = collection(db, "chats", uid, "sessions", sessionId, "messages")
  const docRef = await addDoc(ref, { ...message, createdAt: serverTimestamp() })
  return docRef.id
}

/** Load N tin nhắn gần nhất của session */
export async function loadRecentMessages(uid: string, sessionId: string, count = 20): Promise<Message[]> {
  const ref = collection(db, "chats", uid, "sessions", sessionId, "messages")
  const q = query(ref, orderBy("createdAt", "desc"), limit(count))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)).reverse()
}

/** Cập nhật feedback 👍/👎 */
export async function updateMessageFeedback(uid: string, sessionId: string, msgId: string, feedback: "up" | "down") {
  const ref = doc(db, "chats", uid, "sessions", sessionId, "messages", msgId)
  await updateDoc(ref, { feedback })
}

// ─── Memory ──────────────────────────────────────────────────

export async function getMemory(uid: string): Promise<Memory | null> {
  const ref = doc(db, "memory", uid)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as Memory) : null
}

export async function initMemory(uid: string) {
  const ref = doc(db, "memory", uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, { uid, shortTerm: [], longTerm: [], summary: "", updatedAt: serverTimestamp() })
  }
}

export async function updateMemorySummary(uid: string, summary: string) {
  const ref = doc(db, "memory", uid)
  await setDoc(ref, { summary, updatedAt: serverTimestamp() }, { merge: true })
}

export async function saveMemoryPoint(uid: string, point: Omit<MemoryPoint, "id" | "createdAt" | "lastUsed">) {
  const ref = collection(db, "memory", uid, "points")
  const docRef = await addDoc(ref, { ...point, createdAt: serverTimestamp(), lastUsed: serverTimestamp() })
  return docRef.id
}

export async function loadMemoryPoints(uid: string, count = 10): Promise<MemoryPoint[]> {
  const ref = collection(db, "memory", uid, "points")
  const q = query(ref, orderBy("score", "desc"), limit(count))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MemoryPoint))
}
