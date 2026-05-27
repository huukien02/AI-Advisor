"use client"

import { useEffect, useState } from "react"

type Theme = "light" | "dark"

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light")

  // Khởi tạo từ localStorage hoặc system preference
  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    const initial = saved ?? system
    setTheme(initial)
    applyTheme(initial)
  }, [])

  const applyTheme = (t: Theme) => {
    if (t === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  const toggleTheme = () => {
    const next: Theme = theme === "light" ? "dark" : "light"
    setTheme(next)
    applyTheme(next)
    localStorage.setItem("theme", next)
  }

  return { theme, toggleTheme }
}
