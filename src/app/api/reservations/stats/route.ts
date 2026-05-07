import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end   = searchParams.get('end')

  let query = supabase
    .from('equipment_reservations')
    .select('id, equipment_id, reserved_by, date, equipment:equipment_id(name, category)')
    .order('date', { ascending: true })

  if (start) query = query.gte('date', start)
  if (end)   query = query.lte('date', end)

  const { data: rows, error } = await query
  if (error) return new Response(error.message, { status: 500 })

  const all = rows ?? []

  // ── Summary ─────────────────────────────────────────────────────────────────
  const totalReservations = all.length
  const uniqueUsers = new Set(all.map(r => r.reserved_by)).size

  // ── Equipment stats ──────────────────────────────────────────────────────────
  const equipMap = new Map<string, { name: string; category: string; count: number }>()
  for (const r of all) {
    const eq = r.equipment as unknown as { name: string; category: string } | null
    if (!eq) continue
    if (!equipMap.has(r.equipment_id)) {
      equipMap.set(r.equipment_id, { name: eq.name, category: eq.category, count: 0 })
    }
    equipMap.get(r.equipment_id)!.count++
  }
  const equipmentStats = Array.from(equipMap.values()).sort((a, b) => b.count - a.count)

  // ── User stats ───────────────────────────────────────────────────────────────
  const userMap = new Map<string, { total: number; byEquipment: Map<string, { name: string; count: number }> }>()
  for (const r of all) {
    const eq = r.equipment as unknown as { name: string; category: string } | null
    if (!eq) continue
    if (!userMap.has(r.reserved_by)) {
      userMap.set(r.reserved_by, { total: 0, byEquipment: new Map() })
    }
    const u = userMap.get(r.reserved_by)!
    u.total++
    if (!u.byEquipment.has(r.equipment_id)) {
      u.byEquipment.set(r.equipment_id, { name: eq.name, count: 0 })
    }
    u.byEquipment.get(r.equipment_id)!.count++
  }
  const userStats = Array.from(userMap.entries())
    .map(([name, v]) => ({
      user: name,
      total: v.total,
      byEquipment: Array.from(v.byEquipment.values()).sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.total - a.total)

  // ── Day-of-week stats ────────────────────────────────────────────────────────
  const DOW = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
  const dowCounts = new Array(7).fill(0)
  for (const r of all) {
    const d = new Date(r.date + 'T12:00:00')
    dowCounts[(d.getDay() + 6) % 7]++
  }
  const dayOfWeekStats = DOW.map((label, i) => ({ label, count: dowCounts[i] }))

  // ── Monthly trend ────────────────────────────────────────────────────────────
  const monthMap = new Map<string, number>()
  for (const r of all) {
    const m = r.date.slice(0, 7)
    monthMap.set(m, (monthMap.get(m) ?? 0) + 1)
  }
  const monthlyStats = Array.from(monthMap.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return Response.json({
    totalReservations,
    uniqueUsers,
    equipmentStats,
    userStats,
    dayOfWeekStats,
    monthlyStats,
  })
}
