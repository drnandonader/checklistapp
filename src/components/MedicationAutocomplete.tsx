'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Pill } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  onDosageSuggested?: (dosage: string) => void
}

export function MedicationAutocomplete({ value, onChange, onDosageSuggested }: Props) {
  const [open, setOpen] = useState(false)
  const [fromDb, setFromDb] = useState<string[]>([])
  const [fromList, setFromList] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setFromDb([])
      setFromList([])
      setOpen(false)
      return
    }
    try {
      const res = await fetch(
        `/api/controlled-medications/suggestions?q=${encodeURIComponent(q.trim())}`
      )
      if (!res.ok) return
      const data = await res.json()
      const db: string[] = data.fromDb || []
      const list: string[] = data.fromList || []
      setFromDb(db)
      setFromList(list)
      if (db.length + list.length > 0) setOpen(true)
    } catch {
      // autocomplete failure is silent — user can still type manually
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchSuggestions(value), 250)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, fetchSuggestions])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function select(suggestion: string) {
    // Extract dosage if suggestion ends with a pattern like "2mg", "0,5mg", "5ml"
    const match = suggestion.match(/^(.+?)\s+(\d[\d,.]*(mg|mcg|ml|g|UI|u))$/i)
    if (match) {
      onChange(match[1])
      onDosageSuggested?.(match[2])
    } else {
      onChange(suggestion)
    }
    setOpen(false)
  }

  const hasSuggestions = fromDb.length > 0 || fromList.length > 0

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
        onFocus={() => { if (hasSuggestions) setOpen(true) }}
        placeholder="Ex: Clonazepam"
        autoComplete="off"
        className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700"
      />
      {open && hasSuggestions && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {fromDb.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-4 pt-3 pb-1 uppercase tracking-wide">
                Já usados nesta UBS
              </p>
              {fromDb.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); select(s) }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/30 active:bg-blue-100 dark:active:bg-blue-900/50 text-left"
                >
                  <Pill className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  {s}
                </button>
              ))}
            </>
          )}
          {fromList.length > 0 && (
            <>
              {fromDb.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-700" />
              )}
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-4 pt-3 pb-1 uppercase tracking-wide">
                Sugestões
              </p>
              {fromList.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); select(s) }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 text-left"
                >
                  <Pill className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  {s}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
