'use client'

import { useState } from 'react'
import { Document } from '@/types/database'
import { FileText, Trash2, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  documents: Document[]
  clientId?: string
}

export default function DocumentList({ documents }: Props) {
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const filtered = documents.filter(doc =>
    doc.title.toLowerCase().includes(search.toLowerCase()) ||
    doc.content.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(docId: string) {
    setDeletingId(docId)
    await fetch(`/api/documents?id=${docId}`, { method: 'DELETE' })
    router.refresh()
    setDeletingId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">
          Documenten <span className="text-zinc-500 font-normal">({documents.length})</span>
        </h3>
      </div>

      {/* Search */}
      {documents.length > 0 && (
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Zoek op naam of inhoud..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
          />
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-zinc-600">
          {documents.length === 0
            ? <p className="text-sm">Nog geen documenten geüpload.</p>
            : <p className="text-sm">Geen documenten gevonden.</p>
          }
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg group hover:border-zinc-700 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <FileText size={14} className="text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {new Date(doc.created_at).toLocaleDateString('nl-BE', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                  {' · '}
                  {doc.content.length.toLocaleString()} tekens
                </p>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={deletingId === doc.id}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-all"
                title="Verwijder document"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
