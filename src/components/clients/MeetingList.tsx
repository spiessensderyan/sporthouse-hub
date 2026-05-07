'use client'

import { useState } from 'react'
import { Meeting } from '@/types/database'
import { ChevronDown, ChevronUp, Trash2, Loader2, Copy, Check, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  meetings: Meeting[]
  currentUserEmail: string | null
}

function SummaryBlock({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return <h4 key={i} className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-5 mb-2 first:mt-0">{line.slice(3)}</h4>
        }
        if (line.startsWith('- ')) {
          const parts = line.slice(2).split(' — ')
          return (
            <div key={i} className="flex gap-2 mb-1.5">
              <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: '#3A913F' }} />
              <span className="text-sm text-zinc-300 leading-relaxed">
                {parts[0]}{parts[1] && <span className="ml-1 text-xs text-zinc-500">— {parts[1]}</span>}
              </span>
            </div>
          )
        }
        if (line.trim()) return <p key={i} className="text-sm text-zinc-300 leading-relaxed mb-2">{line}</p>
        return null
      })}
    </div>
  )
}

function MeetingCard({ meeting, currentUserEmail }: { meeting: Meeting; currentUserEmail: string | null }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'summary' | 'transcript'>('summary')
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const isOwner = currentUserEmail && meeting.created_by === currentUserEmail

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/meetings?id=${meeting.id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(meeting.summary || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const date = new Date(meeting.created_at).toLocaleDateString('nl-BE', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

    const summaryHtml = (meeting.summary || '')
      .split('\n')
      .map(line => {
        if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`
        if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`
        if (line.trim()) return `<p>${line}</p>`
        return ''
      })
      .join('\n')

    const transcriptHtml = meeting.transcription
      ? `<div class="section"><h2>Transcriptie</h2><p class="transcript">${meeting.transcription.replace(/\n/g, '<br>')}</p></div>`
      : ''

    const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>${meeting.title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 720px; margin: 48px auto; color: #111; line-height: 1.7; padding: 0 24px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 40px; padding-bottom: 16px; border-bottom: 1px solid #e5e5e5; }
    h2 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-top: 32px; margin-bottom: 10px; }
    li { font-size: 14px; margin-bottom: 6px; margin-left: 16px; }
    p { font-size: 14px; margin-bottom: 6px; }
    .transcript { color: #444; white-space: pre-wrap; font-size: 13px; line-height: 1.8; }
    .section { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5; }
    @media print { body { margin: 24px; } }
  </style>
</head>
<body>
  <h1>${meeting.title}</h1>
  <div class="meta">${date}${meeting.created_by ? ` · ${meeting.created_by}` : ''}</div>
  ${summaryHtml}
  ${transcriptHtml}
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${meeting.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl overflow-hidden card-hover"
      style={{
        background: 'rgba(20,20,20,0.9)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(58,145,63,0.12), 0 1px 3px rgba(0,0,0,0.5)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(58,145,63,0.2)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'
      }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#3A913F' }} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-sh-grey truncate">{meeting.title}</p>
            <p className="text-xs text-zinc-600 mt-0.5">
              {new Date(meeting.created_at).toLocaleDateString('nl-BE', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
              {meeting.created_by && ` · ${meeting.created_by}`}
            </p>
          </div>
        </div>
        {open
          ? <ChevronUp size={14} className="text-zinc-600 flex-shrink-0 ml-3" />
          : <ChevronDown size={14} className="text-zinc-600 flex-shrink-0 ml-3" />
        }
      </button>

      {/* Expanded */}
      {open && (
        <div className="border-t border-zinc-800">
          {/* Tabs */}
          <div className="flex px-5 pt-4 gap-4 border-b border-zinc-800/60">
            {(['summary', 'transcript'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? 'border-sh-green text-sh-grey'
                    : 'border-transparent text-zinc-600 hover:text-zinc-400'
                }`}
                style={tab === t ? { borderColor: '#3A913F' } : {}}
              >
                {t === 'summary' ? 'Samenvatting' : 'Transcriptie'}
              </button>
            ))}
          </div>

          <div className="px-5 py-4">
            {tab === 'summary' ? (
              meeting.summary
                ? <SummaryBlock text={meeting.summary} />
                : <p className="text-sm text-zinc-600 italic">Geen samenvatting beschikbaar.</p>
            ) : (
              <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {meeting.transcription}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 px-5 pb-4">
            {meeting.summary && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? 'Gekopieerd' : 'Kopieer'}
              </button>
            )}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <Download size={11} />
              Download verslag
            </button>
            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-red-400 transition-colors ml-auto"
              >
                {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                Verwijder
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MeetingList({ meetings, currentUserEmail }: Props) {
  if (meetings.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-zinc-500">Nog geen vergaderingen opgeslagen.</p>
        <p className="text-xs text-zinc-700 mt-1">Start een nieuwe opname via de knop hierboven.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {meetings.map(m => (
        <MeetingCard key={m.id} meeting={m} currentUserEmail={currentUserEmail} />
      ))}
    </div>
  )
}
