"use client"

import { useEffect, useState } from "react"
import {
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  signOut,
  GoogleAuthProvider,
  User,
} from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { UserProfile } from "@/types"
import { clearCache } from "@/lib/localCache"

const googleProvider = new GoogleAuthProvider()

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        await syncUserProfile(firebaseUser)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Tạo hoặc lấy user profile từ Firestore
  const syncUserProfile = async (firebaseUser: User) => {
    try {
      const ref = doc(db, "users", firebaseUser.uid)
      const snap = await getDoc(ref)

      if (!snap.exists()) {
        // Lần đầu login — tạo mới
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || "Ẩn danh",
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          isAnonymous: firebaseUser.isAnonymous,
          createdAt: serverTimestamp() as ReturnType<typeof serverTimestamp>,
          preferences: {
            language: "vi",
            advisorTopic: "general",
            tone: "friendly",
            responseLength: "medium",
            includeCode: false,
            useLists: true,
            model: "gemini-2.5-flash",
            customInstructions: "",
          },
        }
        await setDoc(ref, newProfile)
        setProfile(newProfile as UserProfile)
      } else {
        // Merge with defaults so old documents missing newer fields (e.g. customInstructions)
        // don't produce undefined values at runtime.
        const data = snap.data()
        const merged: UserProfile = {
          ...(data as UserProfile),
          preferences: {
            language: "vi",
            advisorTopic: "general",
            tone: "friendly",
            responseLength: "medium",
            includeCode: false,
            useLists: true,
            model: "gemini-2.5-flash",
            customInstructions: "",
            ...(data.preferences ?? {}),
          },
        }
        setProfile(merged)
      }
    } catch (error) {
      // Firestore chưa setup — vẫn cho dùng app với info từ Firebase Auth
      console.warn("Firestore chưa sẵn sàng, dùng Auth data:", error)
      setProfile({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || "Ẩn danh",
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        isAnonymous: firebaseUser.isAnonymous,
        createdAt: null as unknown as ReturnType<typeof serverTimestamp>,
        preferences: { language: "vi", advisorTopic: "general", tone: "friendly", responseLength: "medium", includeCode: false, useLists: true, model: "gemini-2.5-flash", customInstructions: "" },
      })
    }
  }

  /** Cập nhật preferences trong local state ngay sau khi user lưu settings */
  const updatePrefs = (prefs: UserProfile["preferences"]) => {
    setProfile((prev) => prev ? { ...prev, preferences: prefs } : prev)
  }

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error("Google login error:", error)
    }
  }

  const loginAnonymous = async () => {
    try {
      await signInAnonymously(auth)
    } catch (error) {
      console.error("Anonymous login error:", error)
    }
  }

  const logout = async () => {
    if (auth.currentUser) clearCache(auth.currentUser.uid)
    await signOut(auth)
    setProfile(null)
  }

  return { user, profile, loading, loginWithGoogle, loginAnonymous, logout, updatePrefs }
}
