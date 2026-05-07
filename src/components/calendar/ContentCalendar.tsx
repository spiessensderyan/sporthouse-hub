'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Loader2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContentPost {
  id: string
  client_id: string
  title: string
  copy: string | null
  platform: string | null
  status: string
  scheduled_date: string
  created_by: string | null
  created_at: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram',   color: '#E1306C' },
  { id: 'twitter',   label: 'Twitter / X', color: '#1D9BF0' },
  { id: 'linkedin',  label: 'LinkedIn',    color: '#0A66C2' },
  { id: 'tiktok',    label: 'TikTok',      color: '#69C9D0' },
  { id: 'facebook',  label: 'Facebook',    color: '#1877F2' },
  { id: 'youtube',   label: 'YouTube',     color: '#FF4444' },
]

const STATUSES = [
  { id: 'concept',     label: 'Concept',     color: '#71717a' },
  { id: 'klaar',       label: 'Klaar',       color: '#3b82f6' },
  { id: 'goedgekeurd', label: 'Goedgekeurd', color: '#22c55e' },
  { id: 'gepost',      label: 'Gepost',      color: '#a855f7' },
]

const DUTCH_MONTHS = [
  'Januari','Februari','Maart','April','Mei','Juni',
  'Juli','Augustus','September','Oktober','November','December',
]
const WEEK_DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay  = new Date(year, month, 0)
  // Monday-first: Mon=0 ... Sun=6
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = []

  for (let i = startOffset; i > 0; i--) {
    days.push({ date: new Date(year, month - 1, 1 - i), isCurrentMonth: false })
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month - 1, d), isCurrentMonth: true })
  }
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: false })
  }
  return days
}

// ─── Post Modal ───────────────────────────────────────────────────────────────

interface PostModalProps {
  post:        Partial<ContentPost> | null
  defaultDate: string | null
  clientId:    string
  onClose:  () => void
  onSave:   (post: ContentPost) => void
  onDelete: (id: string) => void
}

function PostModal({ post, defaultDate, clientId, onClose, onSave, onDelete }: PostModalProps) {
  const isEditing = !!post?.id
  const [title,    setTitle]    = useState(post?.title    ?? '')
  const [copy,     setCopy]     = useState(post?.copy     ?? '')
  const [platform, setPlatform] = useState<string | null>(post?.platform ?? null)
  const [status,   setStatus]   = useState(post?.status   ?? 'concept')
  const [date,     setDate]     = useState(post?.scheduled_date ?? defaultDate ?? '')
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave() {
    if (!title.trim() || !date) return
    setSaving(true)
    try {
      if (isEditing) {
        const res = await fetch(`/api/calendar/${post!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), copy, platform, status, scheduled_date: date }),
        })
        onSave(await res.json())
      } else {
        const res = await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, title: title.trim(), copy, platform, status, scheduledDate: date }),
        })
        onSave(await res.json())
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!post?.id) return
    setDeleting(true)
    try {
      await fetch(`/api/calendar/${post.id}`, { method: 'DELETE' })
      onDelete(post.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/50 rounded-2xl p-6 shadow-2xl animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-white">
            {isEditing ? 'Post bewerken' : 'Nieuwe post'}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="text-[11px] text-zinc-500 mb-1.5 block font-medium uppercase tracking-wide">Titel *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="bv. Man of the Match — Speeldag 34"
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-[11px] text-zinc-500 mb-1.5 block font-medium uppercase tracking-wide">Datum *</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Platform */}
          <div>
            <label className="text-[11px] text-zinc-500 mb-2 block font-medium uppercase tracking-wide">Platform</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(platform === p.id ? null : p.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: platform === p.id ? `${p.color}20` : 'rgba(39,39,42,0.8)',
                    border:          platform === p.id ? `1px solid ${p.color}50` : '1px solid rgba(63,63,70,0.5)',
                    color:           platform === p.id ? p.color : '#71717a',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-[11px] text-zinc-500 mb-2 block font-medium uppercase tracking-wide">Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStatus(s.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: status === s.id ? `${s.color}20` : 'rgba(39,39,42,0.8)',
                    border:          status === s.id ? `1px solid ${s.color}50` : '1px solid rgba(63,63,70,0.5)',
                    color:           status === s.id ? s.color : '#71717a',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Copy */}
          <div>
            <label className="text-[11px] text-zinc-500 mb-1.5 block font-medium uppercase tracking-wide">Copy / notitie</label>
            <textarea
              value={copy}
              onChange={e => setCopy(e.target.value)}
              placeholder="Optioneel: de copy of extra context voor deze post…"
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-zinc-800">
          {isEditing ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Verwijderen
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Annuleren
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || !date || saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#3A913F] hover:bg-[#2d7a32] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium text-white transition-colors"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              {isEditing ? 'Opslaan' : 'Toevoegen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContentCalendar({ clientId }: { clientId: string }) {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ post: Partial<ContentPost> | null; date: string | null } | null>(null)

  const days  = getMonthDays(year, month)
  const today = formatDate(now)

  // ── Load posts ────────────────────────────────────────────────────────────
  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/calendar?clientId=${clientId}&year=${year}&month=${month}`)
      const data = await res.json()
      setPosts(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [clientId, year, month])

  useEffect(() => { loadPosts() }, [loadPosts])

  // ── Month nav ─────────────────────────────────────────────────────────────
  function prev() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // ── Posts per date ────────────────────────────────────────────────────────
  function getPostsForDate(date: Date): ContentPost[] {
    const key = formatDate(date)
    return posts.filter(p => p.scheduled_date === key)
  }

  // ── Mutations ─────────────────────────────────────────────────────────────
  function handleSave(saved: ContentPost) {
    setPosts(prev => {
      const exists = prev.find(p => p.id === saved.id)
      if (exists) return prev.map(p => p.id === saved.id ? saved : p)
      return [...prev, saved].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    })
    setModal(null)
  }

  function handleDelete(id: string) {
    setPosts(prev => prev.filter(p => p.id !== id))
    setModal(null)
  }

  // ── Status summary ────────────────────────────────────────────────────────
  const statusSummary = STATUSES
    .map(s => ({ ...s, count: posts.filter(p => p.status === s.id).length }))
    .filter(s => s.count > 0)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Navigation bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={prev}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-semibold text-white min-w-[160px] text-center">
            {DUTCH_MONTHS[month - 1]} {year}
          </span>
          <button
            onClick={next}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
          >
            <ChevronRight size={15} />
          </button>
          {loading && <Loader2 size={13} className="animate-spin text-zinc-600" />}
        </div>

        {/* Status overview */}
        {statusSummary.length > 0 && (
          <div className="flex items-center gap-4">
            {statusSummary.map(s => (
              <div key={s.id} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-zinc-500">{s.label} <span className="text-zinc-600">({s.count})</span></span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calendar grid */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-zinc-900/80 border-b border-zinc-800">
          {WEEK_DAYS.map((day, i) => (
            <div
              key={day}
              className={`px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider ${
                i >= 5 ? 'text-zinc-600' : 'text-zinc-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {days.map(({ date, isCurrentMonth }, idx) => {
            const dayPosts  = getPostsForDate(date)
            const dateStr   = formatDate(date)
            const isToday   = dateStr === today
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            const isLastRow = idx >= 35

            return (
              <div
                key={idx}
                onClick={() => isCurrentMonth && setModal({ post: null, date: dateStr })}
                className={`min-h-[108px] border-b border-r border-zinc-800/50 p-2 relative group transition-colors ${
                  isLastRow ? 'border-b-0' : ''
                } ${
                  isCurrentMonth
                    ? isWeekend
                      ? 'bg-zinc-900/20 hover:bg-zinc-900/50 cursor-pointer'
                      : 'bg-transparent hover:bg-zinc-900/30 cursor-pointer'
                    : 'bg-zinc-950/60 cursor-default'
                }`}
              >
                {/* Date number */}
                <div
                  className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1.5 transition-colors ${
                    isToday
                      ? 'bg-[#3A913F] text-white'
                      : isCurrentMonth
                        ? isWeekend ? 'text-zinc-600' : 'text-zinc-400'
                        : 'text-zinc-700'
                  }`}
                >
                  {date.getDate()}
                </div>

                {/* Post pills */}
                <div className="flex flex-col gap-0.5">
                  {dayPosts.slice(0, 3).map(post => {
                    const plt    = PLATFORMS.find(p => p.id === post.platform)
                    const sts    = STATUSES.find(s => s.id === post.status)
                    const color  = plt?.color ?? sts?.color ?? '#71717a'
                    return (
                      <button
                        key={post.id}
                        onClick={e => { e.stopPropagation(); setModal({ post, date: post.scheduled_date }) }}
                        className="w-full text-left px-1.5 py-[3px] rounded text-[10px] font-medium truncate leading-tight transition-opacity hover:opacity-75"
                        style={{
                          backgroundColor: `${color}18`,
                          border:          `1px solid ${color}35`,
                          color,
                        }}
                      >
                        {post.title}
                      </button>
                    )
                  })}
                  {dayPosts.length > 3 && (
                    <span className="text-[10px] text-zinc-600 px-1 mt-0.5">
                      +{dayPosts.length - 3} meer
                    </span>
                  )}
                </div>

                {/* Add button on hover */}
                {isCurrentMonth && (
                  <button
                    onClick={e => { e.stopPropagation(); setModal({ post: null, date: dateStr }) }}
                    className="absolute bottom-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Plus size={10} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Platform legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {PLATFORMS.map(p => (
          <div key={p.id} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-[10px] text-zinc-600">{p.label}</span>
          </div>
        ))}
        <span className="text-[10px] text-zinc-700 ml-auto">Klik op een dag om een post toe te voegen</span>
      </div>

      {/* Modal */}
      {modal !== null && (
        <PostModal
          post={modal.post}
          defaultDate={modal.date}
          clientId={clientId}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
