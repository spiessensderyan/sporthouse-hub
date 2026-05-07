'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  clientId: string
}

function safeStorageName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileUpload({ clientId }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleUpload() {
    if (!pendingFile) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Niet ingelogd. Herlaad de pagina.')
      setLoading(false)
      return
    }

    const ext = pendingFile.name.includes('.')
      ? pendingFile.name.split('.').pop()!.toLowerCase()
      : ''
    const safeName = safeStorageName(pendingFile.name)
    const storagePath = `${clientId}/${Date.now()}-${safeName}`
    const contentType = pendingFile.type || 'application/octet-stream'

    // Upload directly from browser to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(storagePath, pendingFile, { contentType })

    if (uploadError) {
      setError(`Upload mislukt: ${uploadError.message}`)
      setLoading(false)
      return
    }

    // Save metadata to database
    const { error: dbError } = await supabase
      .from('files')
      .insert({
        client_id: clientId,
        filename: pendingFile.name,
        description: description.trim() || null,
        file_type: ext,
        file_size: pendingFile.size,
        storage_path: storagePath,
        uploaded_by: user.email,
      })

    if (dbError) {
      // Try to clean up the uploaded file
      await supabase.storage.from('files').remove([storagePath])
      setError(`Database fout: ${dbError.message}`)
      setLoading(false)
      return
    }

    setSuccess(`"${pendingFile.name}" succesvol geüpload.`)
    setPendingFile(null)
    setDescription('')
    router.refresh()
    setLoading(false)
  }

  function selectFile(file: File) {
    if (file.size > 100 * 1024 * 1024) {
      setError('Bestand mag niet groter zijn dan 100 MB.')
      return
    }
    setError(null)
    setSuccess(null)
    setPendingFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) selectFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) selectFile(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => !pendingFile && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center transition-all
          ${pendingFile ? 'border-zinc-700 bg-zinc-900/30' : 'cursor-pointer'}
          ${isDragging
            ? 'border-zinc-500 bg-zinc-800/50'
            : !pendingFile ? 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50' : ''}
        `}
      >
        <input ref={fileRef} type="file" onChange={handleChange} className="hidden" />

        {pendingFile ? (
          <div className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <Upload size={15} className="text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{pendingFile.name}</p>
              <p className="text-xs text-zinc-500">{formatSize(pendingFile.size)}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setPendingFile(null); setDescription('') }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1"
            >
              Wijzig
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Upload size={18} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Sleep een bestand of klik om te uploaden</p>
              <p className="text-xs text-zinc-500 mt-1">Alle bestandstypen — max 100 MB</p>
            </div>
          </div>
        )}
      </div>

      {/* Description + upload button */}
      {pendingFile && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Beschrijving (optioneel)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
          />
          <button
            onClick={handleUpload}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: '#3A913F' }}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Uploaden...
              </>
            ) : (
              <>
                <Upload size={14} />
                Uploaden
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 bg-red-950/50 border border-red-900/50 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="px-4 py-3 bg-emerald-950/50 border border-emerald-900/50 rounded-lg">
          <p className="text-sm text-emerald-400">{success}</p>
        </div>
      )}
    </div>
  )
}
