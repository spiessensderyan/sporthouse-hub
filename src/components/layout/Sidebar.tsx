'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Client } from '@/types/database'
import { LayoutDashboard, KanbanSquare, CalendarDays, Users, LogOut, Camera, UserCheck, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getLogo } from '@/lib/logos'


interface SidebarProps {
  clients: Client[]
}

function NavGroup({ title, clients, pathname }: {
  title: string
  clients: Client[]
  pathname: string
}) {
  if (clients.length === 0) return null
  return (
    <div className="mb-5">
      <p className="px-3 mb-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
        {title}
      </p>
      {clients.map((client) => {
        const logo = getLogo(client.name, client.logo_url)
        const isActive = pathname.startsWith(`/clients/${client.id}`)
        return (
          <Link
            key={client.id}
            href={`/clients/${client.id}`}
            className={cn(
              'group flex items-center gap-2.5 py-1.5 rounded-lg text-sm transition-all duration-150 mb-0.5 relative',
              isActive
                ? 'text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
            style={isActive ? { paddingLeft: 10, paddingRight: 12 } : { paddingLeft: 12, paddingRight: 12 }}
          >
            {/* Active indicator bar */}
            {isActive && (
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                style={{ backgroundColor: '#3A913F' }}
              />
            )}

            {/* Hover + active bg */}
            <span className={cn(
              'absolute inset-0 rounded-lg transition-all duration-150',
              isActive
                ? 'bg-zinc-800/70'
                : 'bg-transparent group-hover:bg-zinc-800/40'
            )} />

            {/* Content */}
            <span className="relative flex items-center gap-2.5 min-w-0">
              {logo ? (
                <Image
                  src={logo}
                  alt={client.name}
                  width={16}
                  height={16}
                  className="rounded object-cover flex-shrink-0"
                  style={{ width: 16, height: 16 }}
                />
              ) : (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 ml-0.5 transition-all duration-150"
                  style={{ backgroundColor: isActive ? (client.color || '#3A913F') : '#52525b' }}
                />
              )}
              <span className="truncate">{client.name}</span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}

export default function Sidebar({ clients }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const INTERN_ORDER = ['Sporthouse', 'Friends of Sports', 'Shirtlist']
  const intern = clients
    .filter(c => c.category === 'intern')
    .sort((a, b) => {
      const ai = INTERN_ORDER.indexOf(a.name)
      const bi = INTERN_ORDER.indexOf(b.name)
      if (ai === -1 && bi === -1) return a.name.localeCompare(b.name)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  const klanten  = clients.filter(c => c.category === 'klant')
  const atleten  = clients.filter(c => c.category === 'atleet')
  const podcasts = clients.filter(c => c.category === 'podcast')

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-screen sticky top-0"
      style={{
        background: 'linear-gradient(180deg, #181818 0%, #141414 100%)',
        borderRight: '1px solid rgba(255,255,255,0.09)',
      }}
    >
      {/* Brand */}
      <div className="relative px-5 py-5 flex justify-center"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.09)' }}
      >
        {/* Subtle green glow behind logo */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <div
            className="w-28 h-10 rounded-full blur-3xl opacity-25"
            style={{ backgroundColor: '#3A913F' }}
          />
        </div>
        <Link href="/dashboard" className="relative">
          <Image
            src="/logo.png"
            alt="Sporthouse"
            width={120}
            height={32}
            className="object-contain opacity-90 hover:opacity-100 transition-opacity duration-200"
            style={{ filter: 'invert(1)' }}
            priority
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {/* Main nav items */}
        <div className="mb-5 space-y-0.5">
          {[
            { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { href: '/projects',  icon: KanbanSquare,   label: 'Projecten' },
            { href: '/planning',  icon: CalendarDays,   label: 'Planning' },
            { href: '/equipment',   icon: Camera,     label: 'Materiaal' },
            { href: '/team',        icon: Users,      label: 'Team' },
            { href: '/freelancers', icon: UserCheck,     label: 'Freelancers' },
            { href: '/chat',        icon: MessageSquare, label: 'Chat' },
          ].map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-2.5 py-1.5 rounded-lg text-sm transition-all duration-150 relative"
                style={isActive
                  ? { paddingLeft: 10, paddingRight: 12, color: '#e4e4e2', fontWeight: 500 }
                  : { paddingLeft: 12, paddingRight: 12, color: '#a1a1aa' }
                }
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                    style={{ backgroundColor: '#3A913F' }}
                  />
                )}
                <span className={cn(
                  'absolute inset-0 rounded-lg transition-all duration-150',
                  isActive ? 'bg-zinc-800/70' : 'bg-transparent group-hover:bg-zinc-800/40'
                )} />
                <span className="relative flex items-center gap-2.5">
                  <Icon size={15} />
                  <span>{label}</span>
                </span>
              </Link>
            )
          })}
        </div>

        {/* Divider */}
        <div className="mx-3 mb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.09)' }} />

        <NavGroup title="Intern"         clients={intern}   pathname={pathname} />
        <NavGroup title="Klanten"        clients={klanten}  pathname={pathname} />
        <NavGroup title="Atleten"        clients={atleten}  pathname={pathname} />
        <NavGroup title="FOS — Podcasts" clients={podcasts} pathname={pathname} />
      </nav>

      {/* Logout */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.09)' }}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-all duration-150"
        >
          <LogOut size={14} />
          <span>Uitloggen</span>
        </button>
      </div>
    </aside>
  )
}
