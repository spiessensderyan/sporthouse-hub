'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, Square, Copy, Printer, Save, Loader2, Check, AlertCircle } from 'lucide-react'
import { useRecording } from '@/contexts/RecordingContext'

interface Props {
  clientId:   string
  clientName: string
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function SummaryBlock({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div>
      {lines.map((line, i) => {
        if (line.startsWith('## '))
          return <h3 key={i} className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-6 mb-2 first:mt-0">{line.slice(3)}</h3>
        if (line.startsWith('- ')) {
          const [head, ...rest] = line.slice(2).split(' — ')
          return (
            <div key={i} className="flex gap-2 mb-1.5">
              <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: '#3A913F' }} />
              <span className="text-sm text-zinc-300 leading-relaxed">
                {head}{rest.length > 0 && <span className="ml-1 text-xs text-zinc-500">— {rest.join(' — ')}</span>}
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

type LocalStage = 'idle' | 'summarizing' | 'done'

export default function MeetingRecorder({ clientId, clientName }: Props) {
  const recording = useRecording()
  const router    = useRouter()

  const [localStage, setLocalStage] = useState<LocalStage>('idle')
  const [title,      setTitle]      = useState('')
  const [summary,    setSummary]    = useState('')
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [copied,     setCopied]     = useState(false)

  // Als recording stopt (bijv. via floating bar) en er is een transcript → start samenvatting
  useEffect(() => {
    if (recording.stage === 'stopped' && recording.clientId === clientId && recording.finalTranscript && localStage === 'idle') {
      handleSummarize(recording.finalTranscript)
    }
  }, [recording.stage, recording.clientId, recording.finalTranscript])

  async function handleSummarize(transcript: string) {
    if (!transcript.trim()) {
      recording.clearError()
      return
    }
    setLocalStage('summarizing')
    try {
      const res  = await fetch('/api/meetings/summarize', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ transcription: transcript }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSummary(data.summary)
      setLocalStage('done')
    } catch {
      setLocalStage('idle')
      recording.reset()
    }
  }

  function handleStart() {
    recording.startRecording(clientId, clientName)
  }

  async function handleStop() {
    const transcript = recording.finalTranscript + recording.interimTranscript
    recording.stopRecording()
    await handleSummarize(transcript)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/meetings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          clientId,
          title:         title || `Vergadering ${new Date().toLocaleDateString('nl-BE')}`,
          transcription: recording.finalTranscript,
          summary,
        }),
      })
      if (!res.ok) throw new Error('Opslaan mislukt.')
      setSaved(true)
      recording.reset()
      setTimeout(() => router.push(`/clients/${clientId}/meetings`), 1200)
    } catch {
      // keep current state
    }
    setSaving(false)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handlePrint() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>${title || 'Vergadering'} — ${clientName}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 700px; margin: 40px auto; color: #111; line-height: 1.6; }
    h1   { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 32px; }
    h2   { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; margin-top: 28px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    li   { margin-bottom: 4px; font-size: 14px; }
    p    { font-size: 14px; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>${title || 'Vergadering'}</h1>
  <div class="meta">${clientName} · ${new Date().toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
  ${summary.split('\n').map(line => {
    if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`
    if (line.startsWith('- '))  return `<li>${line.slice(2)}</li>`
    if (line.trim())             return `<p>${line}</p>`
    return ''
  }).join('\n')}
</body>
</html>`)
    win.document.close()
    win.print()
  }

  function handleReset() {
    setLocalStage('idle')
    setSummary('')
    setSaved(false)
    setCopied(false)
    recording.reset()
  }

  // Bepaal de weergave-stage
  const isRecordingThis = recording.stage === 'recording' && recording.clientId === clientId

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          Titel vergadering
        </label>
        <input
          type="text"
          placeholder={`Vergadering ${new Date().toLocaleDateString('nl-BE')}`}
          value={title}
          onChange={e => setTitle(e.target.value)}
          disabled={isRecordingThis || localStage === 'summarizing'}
          className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-sh-grey placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors disabled:opacity-50"
        />
      </div>

      {/* Error */}
      {recording.error && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-950/40 border border-red-900/50 rounded-lg">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{recording.error}</p>
        </div>
      )}

      {/* IDLE */}
      {!isRecordingThis && localStage === 'idle' && (
        <div className="flex flex-col items-center gap-4 py-12 border-2 border-dashed border-zinc-800 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Mic size={22} className="text-zinc-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-sh-grey">Klaar om op te nemen</p>
            <p className="text-xs text-zinc-600 mt-1">Werkt in Chrome en Edge · Max 1,5 uur · Microfoon vereist</p>
          </div>
          <button
            onClick={handleStart}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: '#3A913F' }}
          >
            Start opname
          </button>
        </div>
      )}

      {/* RECORDING */}
      {isRecordingThis && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-6 py-10 border border-zinc-800 rounded-xl bg-zinc-900">
            <div className="relative">
              <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: '#3A913F' }} />
              <div className="relative w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3A913F22', border: '1px solid #3A913F44' }}>
                <Mic size={22} style={{ color: '#3A913F' }} />
              </div>
            </div>

            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-sh-grey">Opname bezig</p>
              <p className="text-xs text-zinc-500">Je kan vrij navigeren — de opname loopt door</p>
            </div>

            <span className="text-2xl font-mono text-zinc-400 tabular-nums">
              {formatDuration(recording.duration)}
              <span className="text-sm text-zinc-600 ml-2">/ 1:30:00</span>
            </span>

            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-900/30 border border-red-900/40 text-red-400 text-sm font-medium rounded-lg hover:bg-red-900/50 transition-colors"
            >
              <Square size={12} fill="currentColor" />
              Stop opname
            </button>
          </div>

          {/* Live transcriptie preview */}
          {(recording.finalTranscript || recording.interimTranscript) && (
            <div className="px-4 py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl max-h-40 overflow-y-auto">
              <p className="text-[11px] text-zinc-600 uppercase tracking-wider mb-2">Live transcriptie</p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {recording.finalTranscript}
                <span className="text-zinc-600">{recording.interimTranscript}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* SUMMARIZING */}
      {localStage === 'summarizing' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 size={28} className="animate-spin text-zinc-500" />
          <div className="text-center">
            <p className="text-sm font-medium text-sh-grey">Samenvatting genereren...</p>
            <p className="text-xs text-zinc-600 mt-1">Claude analyseert de transcriptie</p>
          </div>
        </div>
      )}

      {/* DONE */}
      {localStage === 'done' && (
        <div className="space-y-4">
          <div className="px-5 py-5 bg-zinc-900 border border-zinc-800 rounded-xl">
            <SummaryBlock text={summary} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60 transition-colors"
              style={{ backgroundColor: saved ? '#2d7a31' : '#3A913F' }}
            >
              {saved ? <Check size={13} /> : saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saved ? 'Opgeslagen' : saving ? 'Opslaan...' : 'Opslaan'}
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-sh-grey bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Gekopieerd' : 'Kopieer samenvatting'}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-sh-grey bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
            >
              <Printer size={13} />
              PDF downloaden
            </button>

            <button
              onClick={handleReset}
              className="ml-auto text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Nieuwe opname
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
