'use client'

import { useState, useEffect, useRef } from 'react'
import { ShieldAlert, ShieldCheck, ShieldQuestion, Upload, Trash2, Loader2, RefreshCw, FileText, ChevronDown } from 'lucide-react'

interface Doc {
  id: string
  filename: string
  page_count: number | null
  uploaded_by: string | null
  created_at: string
}

interface CheckResult {
  allowed: boolean
  reason: string
  checkedAt: string
}

export default function EmbargoChecker({ clientId }: { clientId: string }) {
  const [doc, setDoc] = useState<Doc | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function loadDoc() {
    const res = await fetch(`/api/liveshift/embargo?clientId=${clientId}`)
    const data = await res.json()
    setDoc(Array.isArray(data) && data.length > 0 ? data[0] : null)
    setLoadingDoc(false)
  }

  async function checkEmbargo() {
    if (!doc) return
    setChecking(true)
    try {
      const res = await fetch('/api/liveshift/embargo/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const data = await res.json()
      setResult({
        allowed: data.allowed ?? false,
        reason: data.reason ?? 'Onbekend',
        checkedAt: new Date().toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }),
      })
    } catch {
      setResult({ allowed: false, reason: 'Verbindingsfout bij embargo-check.', checkedAt: '' })
    } finally {
      setChecking(false)
    }
  }

  async function handleUpload(file: File) {
    setUploading(true)
    setUploadError(null)
    const form = new FormData()
    form.append('file', file)
    form.append('clientId', clientId)

    const res = await fetch('/api/liveshift/embargo/upload', { method: 'POST', body: form })
    const data = await res.json()

    if (!res.ok) {
      setUploadError(data.error)
    } else {
      setResult(null)
      await loadDoc()
    }
    setUploading(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/liveshift/embargo?id=${id}`, { method: 'DELETE' })
    setDoc(null)
    setResult(null)
    setDeletingId(null)
  }

  useEffect(() => {
    loadDoc()
  }, [clientId])

  useEffect(() => {
    if (!loadingDoc && doc) {
      checkEmbargo()
    }
  }, [loadingDoc, doc?.id])

  // ── Status badge ─────────────────────────────────────────────────────────────
  const statusConfig = loadingDoc || checking
    ? { icon: Loader2, label: 'Controleren…', color: 'text-zinc-400', bg: 'bg-zinc-800/60', border: 'border-zinc-700', spin: true }
    : !doc
    ? { icon: ShieldQuestion, label: 'Geen embargo-document', color: 'text-zinc-500', bg: 'bg-zinc-900', border: 'border-zinc-800', spin: false }
    : result === null
    ? { icon: ShieldQuestion, label: 'Niet gecontroleerd', color: 'text-zinc-400', bg: 'bg-zinc-900', border: 'border-zinc-800', spin: false }
    : result.allowed
    ? { icon: ShieldCheck, label: 'Geen embargo', color: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-900/50', spin: false }
    : { icon: ShieldAlert, label: 'EMBARGO ACTIEF', color: 'text-red-400', bg: 'bg-red-950/40', border: 'border-red-900/50', spin: false }

  const Icon = statusConfig.icon

  return (
    <div className={`rounded-xl border ${statusConfig.border} ${statusConfig.bg} transition-colors`}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <Icon
          size={15}
          className={`flex-shrink-0 ${statusConfig.color} ${statusConfig.spin ? 'animate-spin' : ''}`}
        />
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-semibold ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
          {result && !checking && (
            <span className="ml-2 text-xs text-zinc-600">
              {result.reason}
              {result.checkedAt && ` · ${result.checkedAt}`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {doc && !checking && (
            <button
              onClick={e => { e.stopPropagation(); checkEmbargo() }}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="Embargo opnieuw controleren"
            >
              <RefreshCw size={12} />
            </button>
          )}
          <ChevronDown
            size={13}
            className={`text-zinc-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800/60 pt-3 space-y-3">

          {/* Current document */}
          {doc ? (
            <div className="flex items-center gap-3 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg">
              <FileText size={14} className="text-zinc-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sh-grey truncate">{doc.filename}</p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  {doc.page_count ? `${doc.page_count} pagina's · ` : ''}
                  {new Date(doc.created_at).toLocaleDateString('nl-BE')}
                </p>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={deletingId === doc.id}
                className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
              >
                {deletingId === doc.id
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Trash2 size={13} />
                }
              </button>
            </div>
          ) : (
            <p className="text-xs text-zinc-600">Geen embargo-document geüpload.</p>
          )}

          {/* Upload button */}
          <label className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed cursor-pointer transition-colors text-xs ${
            uploading
              ? 'border-zinc-700 opacity-60 cursor-not-allowed text-zinc-600'
              : 'border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
          }`}>
            {uploading
              ? <Loader2 size={13} className="animate-spin text-zinc-500" />
              : <Upload size={13} />
            }
            {uploading ? 'Verwerken…' : doc ? 'Embargo-document vervangen' : 'Embargo-document uploaden (PDF)'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              disabled={uploading}
              onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
          </label>

          {uploadError && (
            <p className="text-xs text-red-400 px-1">{uploadError}</p>
          )}
        </div>
      )}
    </div>
  )
}
