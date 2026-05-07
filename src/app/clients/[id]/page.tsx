import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { FolderOpen, Mic, PenLine, BrainCircuit, ArrowRight, Gift, Scissors, CalendarDays } from 'lucide-react'


interface Tool {
  id: string
  href: string
  icon: React.ElementType
  label: string
  description: string
  color: string
  available: boolean
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientToolsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) notFound()

  const tools: Tool[] = [
    {
      id: 'meetings',
      href: `/clients/${id}/meetings`,
      icon: Mic,
      label: 'Vergaderingen',
      description: 'Neem vergaderingen op, bekijk live transcriptie en genereer een AI-samenvatting.',
      color: '#3A913F',
      available: true,
    },
    {
      id: 'expert',
      href: `/clients/${id}/expert`,
      icon: BrainCircuit,
      label: 'Expert AI',
      description: 'Chat met een AI die alles weet over deze organisatie — processen, mensen, aanpak en strategie.',
      color: '#7c3aed',
      available: true,
    },
    {
      id: 'copy',
      href: `/clients/${id}/copy`,
      icon: PenLine,
      label: 'Copy Generator',
      description: 'Genereer social media copy op basis van een brief en verfijn via AI-chat.',
      color: '#3A913F',
      available: true,
    },
    {
      id: 'calendar',
      href: `/clients/${id}/calendar`,
      icon: CalendarDays,
      label: 'Content Kalender',
      description: 'Plan social media posts per dag en platform — van concept tot gepost.',
      color: '#0ea5e9',
      available: true,
    },
    {
      id: 'files',
      href: `/clients/${id}/files`,
      icon: FolderOpen,
      label: 'Bestanden',
      description: 'Upload, zoek en download bestanden van elk bestandstype.',
      color: '#3A913F',
      available: true,
    },
    ...(client.category === 'podcast' ? [{
      id: 'snippets',
      href: `/clients/${id}/snippets`,
      icon: Scissors,
      label: 'Mogelijke Snippits',
      description: 'Plak een transcript en AI selecteert de sterkste fragmenten voor Instagram Reels, TikTok en YouTube Shorts.',
      color: '#a21caf',
      available: true,
    }] : []),
    ...(client.name === 'Unibet Experts' ? [{
      id: 'giveaway',
      href: `/clients/${id}/giveaway`,
      icon: Gift,
      label: 'Giveaway Tool',
      description: 'Upload de scraped reacties als CSV, filter op correct antwoord en kies automatisch een winnaar.',
      color: '#057a55',
      available: true,
    }] : []),
  ]

  const available = tools.filter(t => t.available)
  const coming = tools.filter(t => !t.available)

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-base font-semibold text-white mb-1">Tools</h2>
          <p className="text-sm text-zinc-300">Kies een tool om te openen voor {client.name}.</p>
        </div>

        {/* Available tools */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {available.map((tool) => {
            const Icon = tool.icon
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className="group flex flex-col gap-4 p-5 rounded-xl tool-card"
                style={{
                  '--tool-color': tool.color,
                  background: 'rgba(26,26,26,0.97)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                } as React.CSSProperties}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${tool.color}20`, border: `1px solid ${tool.color}30` }}
                  >
                    <Icon size={18} style={{ color: tool.color }} />
                  </div>
                  <ArrowRight
                    size={14}
                    className="text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all mt-1"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{tool.label}</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{tool.description}</p>
                </div>
              </Link>
            )
          })}

          {/* Coming soon placeholder */}
          <div className="flex flex-col gap-4 p-5 bg-zinc-900/40 border border-zinc-800/50 rounded-xl opacity-50">
            <div className="w-10 h-10 rounded-xl bg-zinc-800/50 border border-zinc-700/30" />
            <div>
              <p className="text-sm font-semibold text-zinc-500">Binnenkort</p>
              <p className="text-xs text-zinc-600 mt-1 leading-relaxed">Nieuwe tools worden hier toegevoegd.</p>
            </div>
          </div>
        </div>

        {coming.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coming.map((tool) => {
              const Icon = tool.icon
              return (
                <div
                  key={tool.id}
                  className="flex flex-col gap-4 p-5 bg-zinc-900/40 border border-zinc-800/50 rounded-xl opacity-50 cursor-not-allowed"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center">
                      <Icon size={18} className="text-zinc-600" />
                    </div>
                    <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">Binnenkort</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-500">{tool.label}</p>
                    <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{tool.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
