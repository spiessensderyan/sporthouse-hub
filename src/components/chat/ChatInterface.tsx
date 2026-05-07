'use client'

import { useState, useRef, useEffect } from 'react'
import { Message } from '@/types/database'
import { Send, Loader2, Bot, User, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  clientId: string
  clientName: string
  documentCount: number
}

export default function ChatInterface({ clientId, clientName, documentCount }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const question = input.trim()
    if (!question || loading) return

    setInput('')
    setError(null)

    const userMessage: Message = { role: 'user', content: question }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setLoading(true)

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, messages: newMessages }),
    })

    if (!response.ok) {
      const err = await response.json()
      setError(err.error || 'Er is een fout opgetreden.')
      setMessages(prev => prev.slice(0, -1))
      setLoading(false)
      return
    }

    // Stream the response
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      setLoading(false)
      return
    }

    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMessage])

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.text,
                  }
                }
                return updated
              })
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    }

    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
              <Bot size={22} className="text-zinc-400" />
            </div>
            <h3 className="text-base font-medium text-white mb-2">
              AI Chat — {clientName}
            </h3>
            <p className="text-sm text-zinc-500 max-w-sm">
              {documentCount > 0
                ? `Stel vragen over de ${documentCount} document${documentCount !== 1 ? 'en' : ''} in de kennisbank.`
                : 'Upload eerst documenten in de kennisbank om vragen te kunnen stellen.'
              }
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}
              >
                {/* Avatar */}
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                  msg.role === 'assistant' ? 'bg-zinc-800' : 'bg-white'
                )}>
                  {msg.role === 'assistant'
                    ? <Bot size={14} className="text-zinc-400" />
                    : <User size={14} className="text-zinc-950" />
                  }
                </div>

                {/* Content */}
                <div className={cn(
                  'max-w-[80%] px-4 py-3 rounded-xl text-sm leading-relaxed',
                  msg.role === 'assistant'
                    ? 'bg-zinc-900 border border-zinc-800 text-zinc-100'
                    : 'bg-white text-zinc-950'
                )}>
                  {msg.content || (loading && i === messages.length - 1 && (
                    <Loader2 size={14} className="animate-spin text-zinc-500" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="max-w-3xl mx-auto mt-4">
            <div className="flex items-center gap-2 px-4 py-3 bg-red-950/50 border border-red-900/50 rounded-lg">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-zinc-800 bg-zinc-900/50 px-8 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={documentCount > 0 ? 'Stel een vraag...' : 'Upload eerst documenten...'}
                disabled={documentCount === 0 || loading}
                rows={1}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '44px', maxHeight: '160px' }}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement
                  t.style.height = 'auto'
                  t.style.height = `${Math.min(t.scrollHeight, 160)}px`
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || loading || documentCount === 0}
              className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? <Loader2 size={16} className="text-zinc-950 animate-spin" />
                : <Send size={16} className="text-zinc-950" />
              }
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-600 text-center">
            Enter om te verzenden · Shift+Enter voor nieuwe regel
          </p>
        </form>
      </div>
    </div>
  )
}
