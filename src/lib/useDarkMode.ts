'use client'

import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('checklist_darkmode')
    if (saved === 'true') {
      setDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  function toggle() {
    setDark((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('checklist_darkmode', 'true')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('checklist_darkmode', 'false')
      }
      return next
    })
  }

  return { dark, toggle, mounted }
}
