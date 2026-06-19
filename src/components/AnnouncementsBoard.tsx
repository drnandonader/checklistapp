'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AnnouncementUrgency,
  ANNOUNCEMENT_URGENCY_LABELS,
  ANNOUNCEMENT_URGENCY_COLORS,
  ANNOUNCEMENT_URGENCY_DOT,
  PROFESSIONAL_LABELS,
  ProfessionalCategory,
} from '@/types'
import { Loader2, Megaphone, Plus, Trash2, X, Eye, Send } from 'lucide-react'

interface AnnouncementItem {
  id: string
  author_id: string
  title: string
  body: string
  urgency: AnnouncementUrgency
  created_at: string
  author_name: string
  author_professional: string
  readCount: number
  totalTeamCount: number
  readByMe: boolean
}

interface AnnouncementsBoardProps {
  currentProfileId: string
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin} min`
  if (diffH < 24) return `há ${diffH}h`
  if (diffD === 1) return 'ontem'
  if (diffD < 7) return `há ${diffD} dias`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function AnnouncementsBoard({ currentProfileId }: AnnouncementsBoardProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [urgency, setUrgency] = useState<AnnouncementUrgency>('normal')
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/announcements')
      if (res.ok) {
        const data = await res.json()
        setAnnouncements(data.announcements || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function markAsRead(id: string) {
    await fetch('/api/announcements/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement_id: id }),
    })
    setAnnouncements((prev) =>
      prev.map((a) => a.id === id ? { ...a, readByMe: true, readCount: a.readCount + 1 } : a)
    )
  }

  async function handlePublish() {
    if (!title.trim()) return
    setPublishing(true)
    setError(null)
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), urgency }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erro ao publicar')
      } else {
        setTitle('')
        setBody('')
        setUrgency('normal')
        setShowForm(false)
        await load()
      }
    } catch {
      setError('Falha de conexão')
    }
    setPublishing(false)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este recado?')) return
    await fetch(`/api/announcements?id=${id}`, { method: 'DELETE' })
    setAnnouncements((prev) => prev.filter((a) => a.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      </div>
    )
  }

  const urgencyOptions: AnnouncementUrgency[] = ['normal', 'importante', 'urgente']

  return (
    <div className="space-y-4">
      {/* Header + Novo recado */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <Megaphone className="w-4 h-4" />
          Mural de Recados
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancelar' : 'Novo recado'}
        </button>
      </div>

      {/* Formulário inline */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do recado"
            className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Detalhes do recado (opcional)"
            className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 resize-none"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Urgência:</span>
            {urgencyOptions.map((u) => (
              <button
                key={u}
                onClick={() => setUrgency(u)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                  urgency === u
                    ? ANNOUNCEMENT_URGENCY_COLORS[u]
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                }`}
              >
                {ANNOUNCEMENT_URGENCY_LABELS[u]}
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <button
            onClick={handlePublish}
            disabled={publishing || !title.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publicar
          </button>
        </div>
      )}

      {/* Lista de recados */}
      {announcements.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
          <Megaphone className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum recado publicado ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const isUnread = !a.readByMe
            return (
              <div
                key={a.id}
                onClick={() => { if (isUnread) markAsRead(a.id) }}
                className={`bg-white dark:bg-gray-900 rounded-xl p-4 transition-colors ${
                  isUnread
                    ? 'border-2 border-blue-400 dark:border-blue-600 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
                    : 'border border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${ANNOUNCEMENT_URGENCY_DOT[a.urgency]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white">{a.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${ANNOUNCEMENT_URGENCY_COLORS[a.urgency]}`}>
                        {ANNOUNCEMENT_URGENCY_LABELS[a.urgency]}
                      </span>
                      {isUnread && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                          Novo
                        </span>
                      )}
                    </div>
                    {a.body && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 whitespace-pre-wrap">{a.body}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {a.author_name}
                        {a.author_professional && ` · ${PROFESSIONAL_LABELS[a.author_professional as ProfessionalCategory] || a.author_professional}`}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatRelativeDate(a.created_at)}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {a.readCount} de {a.totalTeamCount} viram
                      </span>
                    </div>
                  </div>
                  {a.author_id === currentProfileId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(a.id) }}
                      className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                      title="Excluir recado"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
