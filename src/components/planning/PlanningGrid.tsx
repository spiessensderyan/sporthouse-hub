'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { DEPARTMENTS, DUTCH_MONTHS, getDaysInMonth, cellKey } from '@/lib/planning-config'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CellData {
  value:     string
  bold:      boolean
  textColor: string | null
  bgColor:   string | null
}

type PlanningData = Record<string, CellData>

interface Sel {
  startDay: number
  endDay:   number
  startCol: number
  endCol:   number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_W  = 100
const DATE_W = 48
const CELL_W = 88

const BG_HEAD  = '#161616'
const BG_BODY  = '#0d0d0d'
const BG_WKND  = '#181818'
const BG_TODAY = '#111d11'
const SEL_BG   = 'rgba(59,130,246,0.12)'
const SEL_BDR  = 'rgba(59,130,246,0.5)'

// ─── Palettes ─────────────────────────────────────────────────────────────────

const TEXT_COLORS = [
  { label: 'Standaard', value: null,      display: '#a1a1aa' },
  { label: 'Wit',       value: '#ffffff',  display: '#ffffff' },
  { label: 'Rood',      value: '#ef4444',  display: '#ef4444' },
  { label: 'Oranje',    value: '#f97316',  display: '#f97316' },
  { label: 'Geel',      value: '#eab308',  display: '#eab308' },
  { label: 'Groen',     value: '#22c55e',  display: '#22c55e' },
  { label: 'Blauw',     value: '#3b82f6',  display: '#3b82f6' },
  { label: 'Paars',     value: '#a855f7',  display: '#a855f7' },
  { label: 'Roze',      value: '#ec4899',  display: '#ec4899' },
]

const BG_COLORS = [
  { label: 'Geen',    value: null,      display: 'transparent' },
  { label: 'Rood',    value: '#450a0a',  display: '#7f1d1d' },
  { label: 'Oranje',  value: '#431407',  display: '#9a3412' },
  { label: 'Geel',    value: '#422006',  display: '#92400e' },
  { label: 'Groen',   value: '#052e16',  display: '#14532d' },
  { label: 'Blauw',   value: '#0c1a3a',  display: '#1e3a5f' },
  { label: 'Paars',   value: '#2e1065',  display: '#4c1d95' },
  { label: 'Roze',    value: '#4a0020',  display: '#831843' },
  { label: 'Grijs',   value: '#1c1c1c',  display: '#3f3f46' },
]

function emptyCell(): CellData {
  return { value: '', bold: false, textColor: null, bgColor: null }
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function FormattingToolbar({
  cell, hasActive, selCount, onFormat,
}: {
  cell: CellData | null
  hasActive: boolean
  selCount: number
  onFormat: (key: keyof CellData, value: unknown) => void
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl flex-shrink-0 flex-wrap">
      <button
        onMouseDown={e => { e.preventDefault(); onFormat('bold', !cell?.bold) }}
        disabled={!hasActive}
        title="Vet (Ctrl+B)"
        className={`w-7 h-7 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${
          cell?.bold ? 'bg-zinc-600 text-white' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-30'
        }`}
      >B</button>

      <div className="w-px h-4 bg-zinc-800 flex-shrink-0" />

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-zinc-400 select-none">Tekst</span>
        {TEXT_COLORS.map(c => (
          <button key={c.label}
            onMouseDown={e => { e.preventDefault(); onFormat('textColor', c.value) }}
            disabled={!hasActive} title={c.label}
            className="transition-transform hover:scale-110 disabled:opacity-30 rounded-full focus:outline-none"
            style={{
              width: 16, height: 16, flexShrink: 0,
              backgroundColor: c.display,
              border: cell?.textColor === c.value ? '2px solid #fff' : c.value === null ? '2px solid #52525b' : '2px solid transparent',
            }}
          />
        ))}
      </div>

      <div className="w-px h-4 bg-zinc-800 flex-shrink-0" />

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-zinc-400 select-none">Achtergrond</span>
        {BG_COLORS.map(c => (
          <button key={c.label}
            onMouseDown={e => { e.preventDefault(); onFormat('bgColor', c.value) }}
            disabled={!hasActive} title={c.label}
            className="transition-transform hover:scale-110 disabled:opacity-30 rounded-full focus:outline-none"
            style={{
              width: 16, height: 16, flexShrink: 0,
              backgroundColor: c.display,
              border: cell?.bgColor === c.value ? '2px solid #fff' : c.value === null ? '2px solid #52525b' : '2px solid transparent',
            }}
          />
        ))}
      </div>

      <div className="w-px h-4 bg-zinc-800 flex-shrink-0" />

      <span className="text-[10px] text-zinc-400 select-none">
        {selCount > 1
          ? `${selCount} cellen geselecteerd · Ctrl+C kopiëren · Ctrl+V plakken`
          : !hasActive
          ? 'Klik een cel om te bewerken · Klik rijlabel voor rij · Klik kolomlabel voor kolom'
          : 'Ctrl+C kopiëren · Shift+klik / sleep voor bereik'}
      </span>
    </div>
  )
}

// ─── Main grid ────────────────────────────────────────────────────────────────

export default function PlanningGrid() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData]   = useState<PlanningData>({})
  const [loading, setLoading] = useState(true)

  // Selection state
  const [sel, setSel]           = useState<Sel | null>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const days = getDaysInMonth(year, month)

  // All columns in order
  const allColumns = useMemo(() =>
    DEPARTMENTS.flatMap(dept => dept.employees.map(emp => ({ dept: dept.name, emp }))),
  [])

  // ── Derived: selected cells set ─────────────────────────────────────────────
  const selectedKeys = useMemo(() => {
    if (!sel) return new Set<string>()
    const minDay = Math.min(sel.startDay, sel.endDay)
    const maxDay = Math.max(sel.startDay, sel.endDay)
    const minCol = Math.min(sel.startCol, sel.endCol)
    const maxCol = Math.max(sel.startCol, sel.endCol)
    const keys = new Set<string>()
    for (let d = minDay; d <= maxDay; d++) {
      for (let c = minCol; c <= maxCol; c++) {
        keys.add(cellKey(d, allColumns[c].dept, allColumns[c].emp))
      }
    }
    return keys
  }, [sel, allColumns])

  // ── Load month ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data: rows } = await supabase
        .from('planning_entries')
        .select('day, department, employee, value, bold, text_color, bg_color')
        .eq('year', year)
        .eq('month', month)
      if (cancelled) return
      const map: PlanningData = {}
      for (const r of rows ?? []) {
        map[cellKey(r.day, r.department, r.employee)] = {
          value: r.value, bold: r.bold ?? false,
          textColor: r.text_color ?? null, bgColor: r.bg_color ?? null,
        }
      }
      setData(map)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [year, month])

  // ── Debounced save ──────────────────────────────────────────────────────────
  const scheduleSave = useCallback((key: string, day: number, dept: string, emp: string, cell: CellData) => {
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key])
    saveTimers.current[key] = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const isEmpty = !cell.value.trim() && !cell.bold && !cell.textColor && !cell.bgColor
      if (isEmpty) {
        await supabase.from('planning_entries').delete()
          .eq('year', year).eq('month', month).eq('day', day)
          .eq('department', dept).eq('employee', emp)
      } else {
        await supabase.from('planning_entries').upsert({
          year, month, day, department: dept, employee: emp,
          value: cell.value, bold: cell.bold,
          text_color: cell.textColor, bg_color: cell.bgColor,
          updated_by: user?.email,
        }, { onConflict: 'year,month,day,department,employee' })
      }
      delete saveTimers.current[key]
    }, 600)
  }, [year, month])

  // ── Apply data updates ──────────────────────────────────────────────────────
  const applyUpdates = useCallback((updates: Record<string, CellData>) => {
    setData(prev => {
      const next = { ...prev, ...updates }
      for (const [key, cell] of Object.entries(updates)) {
        const [dayStr, dept, emp] = key.split('|')
        scheduleSave(key, Number(dayStr), dept, emp, cell)
      }
      return next
    })
  }, [scheduleSave])

  // ── Text change ─────────────────────────────────────────────────────────────
  const handleTextChange = useCallback((day: number, dept: string, emp: string, value: string) => {
    const key = cellKey(day, dept, emp)
    applyUpdates({ [key]: { ...(data[key] ?? emptyCell()), value } })
  }, [data, applyUpdates])

  // ── Format (applies to all selected cells) ──────────────────────────────────
  const handleFormat = useCallback((fmtKey: keyof CellData, value: unknown) => {
    const keys = selectedKeys.size > 0 ? Array.from(selectedKeys) : activeKey ? [activeKey] : []
    if (keys.length === 0) return
    const updates: Record<string, CellData> = {}
    for (const k of keys) {
      updates[k] = { ...(data[k] ?? emptyCell()), [fmtKey]: value }
    }
    applyUpdates(updates)
  }, [selectedKeys, activeKey, data, applyUpdates])

  // ── Copy ────────────────────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (!sel) return
    const minDay = Math.min(sel.startDay, sel.endDay)
    const maxDay = Math.max(sel.startDay, sel.endDay)
    const minCol = Math.min(sel.startCol, sel.endCol)
    const maxCol = Math.max(sel.startCol, sel.endCol)

    const rows: string[] = []
    for (let d = minDay; d <= maxDay; d++) {
      const row: string[] = []
      for (let c = minCol; c <= maxCol; c++) {
        row.push(data[cellKey(d, allColumns[c].dept, allColumns[c].emp)]?.value ?? '')
      }
      rows.push(row.join('\t'))
    }
    navigator.clipboard.writeText(rows.join('\n'))
  }, [sel, data, allColumns])

  // ── Paste ───────────────────────────────────────────────────────────────────
  const handlePaste = useCallback(async () => {
    const startDay = sel
      ? Math.min(sel.startDay, sel.endDay)
      : activeKey ? Number(activeKey.split('|')[0]) : null
    const startCol = sel
      ? Math.min(sel.startCol, sel.endCol)
      : activeKey
        ? allColumns.findIndex(c => activeKey === cellKey(Number(activeKey.split('|')[0]), c.dept, c.emp))
        : null

    if (startDay === null || startCol === null || startCol < 0) return

    let text = ''
    try { text = await navigator.clipboard.readText() } catch { return }
    const rows = text.split('\n').map(r => r.split('\t'))

    const updates: Record<string, CellData> = {}
    rows.forEach((row, ri) => {
      const dayIndex = days.findIndex(d => d.day === startDay)
      const targetDay = days[dayIndex + ri]?.day
      if (!targetDay) return
      row.forEach((val, ci) => {
        const targetColIdx = startCol + ci
        if (targetColIdx >= allColumns.length) return
        const { dept, emp } = allColumns[targetColIdx]
        const key = cellKey(targetDay, dept, emp)
        updates[key] = { ...(data[key] ?? emptyCell()), value: val }
      })
    })
    applyUpdates(updates)
  }, [sel, activeKey, data, days, allColumns, applyUpdates])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const ctrl = isMac ? e.metaKey : e.ctrlKey

      if (ctrl && e.key === 'c') {
        // Only intercept if multiple cells selected (otherwise let browser handle)
        if (sel && (sel.startDay !== sel.endDay || sel.startCol !== sel.endCol)) {
          e.preventDefault()
          handleCopy()
        }
      }
      if (ctrl && e.key === 'v') {
        if (sel || activeKey) {
          e.preventDefault()
          handlePaste()
        }
      }
      if (ctrl && e.key === 'b') {
        if (sel || activeKey) {
          e.preventDefault()
          const first = activeKey ?? (sel ? cellKey(sel.startDay, allColumns[Math.min(sel.startCol, sel.endCol)].dept, allColumns[Math.min(sel.startCol, sel.endCol)].emp) : null)
          handleFormat('bold', !(data[first ?? '']?.bold))
        }
      }
      if (e.key === 'Escape') {
        setSel(null)
        setActiveKey(null)
        setEditingKey(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sel, activeKey, handleCopy, handlePaste, handleFormat, data, allColumns])

  // ── Mouse up (stop drag) ────────────────────────────────────────────────────
  useEffect(() => {
    function onMouseUp() { setIsDragging(false) }
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [])

  // ── Cell mouse handlers ─────────────────────────────────────────────────────
  function onCellMouseDown(day: number, colIdx: number, e: React.MouseEvent) {
    if (e.shiftKey && sel) {
      setSel(prev => prev ? { ...prev, endDay: day, endCol: colIdx } : { startDay: day, endDay: day, startCol: colIdx, endCol: colIdx })
    } else {
      setSel({ startDay: day, endDay: day, startCol: colIdx, endCol: colIdx })
      setActiveKey(cellKey(day, allColumns[colIdx].dept, allColumns[colIdx].emp))
    }
    setIsDragging(true)
  }

  function onCellMouseEnter(day: number, colIdx: number) {
    if (!isDragging) return
    setSel(prev => prev ? { ...prev, endDay: day, endCol: colIdx } : null)
  }

  function onCellDoubleClick(day: number, colIdx: number) {
    const key = cellKey(day, allColumns[colIdx].dept, allColumns[colIdx].emp)
    setEditingKey(key)
    setActiveKey(key)
  }

  // ── Row header click → select whole row ─────────────────────────────────────
  function onRowHeaderClick(day: number) {
    setSel({ startDay: day, endDay: day, startCol: 0, endCol: allColumns.length - 1 })
    setActiveKey(null)
    setEditingKey(null)
  }

  // ── Column header click → select whole column ────────────────────────────────
  function onColHeaderClick(colIdx: number) {
    setSel({ startDay: days[0].day, endDay: days[days.length - 1].day, startCol: colIdx, endCol: colIdx })
    setActiveKey(null)
    setEditingKey(null)
  }

  // ── Month nav ───────────────────────────────────────────────────────────────
  function prev() { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function next() { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const activeCell = activeKey ? (data[activeKey] ?? emptyCell()) : null
  const selCount = selectedKeys.size

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3 h-full" ref={containerRef}>

      {/* Navigation */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button onClick={prev} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-sh-grey hover:border-zinc-700 transition-colors">
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm font-semibold text-sh-grey min-w-[160px] text-center">
          {DUTCH_MONTHS[month - 1]} {year}
        </span>
        <button onClick={next} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-sh-grey hover:border-zinc-700 transition-colors">
          <ChevronRight size={15} />
        </button>
        {loading && <Loader2 size={13} className="animate-spin text-zinc-600 ml-1" />}
      </div>

      {/* Formatting toolbar */}
      <FormattingToolbar
        cell={activeCell}
        hasActive={!!activeKey || selCount > 0}
        selCount={selCount}
        onFormat={handleFormat}
      />

      {/* Scrollable grid */}
      <div
        className="overflow-auto flex-1 border border-zinc-800 rounded-xl select-none"
        style={{ minWidth: 0 }}
        onMouseLeave={() => { if (isDragging) setIsDragging(false) }}
      >
        <table
          className="border-collapse text-xs"
          style={{ minWidth: DAY_W + DATE_W + allColumns.length * CELL_W }}
        >
          <thead>
            {/* Row 1 — Department headers */}
            <tr>
              <th style={{ position: 'sticky', left: 0, zIndex: 40, width: DAY_W, minWidth: DAY_W, backgroundColor: BG_HEAD }}
                className="border-b border-r border-zinc-800 px-3 py-2 text-left font-semibold text-zinc-500">
                Dag
              </th>
              <th style={{ position: 'sticky', left: DAY_W, zIndex: 40, width: DATE_W, minWidth: DATE_W, backgroundColor: BG_HEAD }}
                className="border-b border-r-2 border-zinc-700 px-2 py-2 text-center font-semibold text-zinc-500">
                #
              </th>
              {DEPARTMENTS.map(dept => (
                <th key={dept.name} colSpan={dept.employees.length}
                  style={{ backgroundColor: BG_HEAD, borderLeft: '2px solid #3f3f46' }}
                  className="border-b border-zinc-800 px-2 py-2 text-center font-semibold text-sh-grey whitespace-nowrap">
                  {dept.name}
                </th>
              ))}
            </tr>

            {/* Row 2 — Employee names (clickable for column select) */}
            <tr>
              <th style={{ position: 'sticky', left: 0, zIndex: 40, width: DAY_W, minWidth: DAY_W, backgroundColor: BG_HEAD }}
                className="border-b-2 border-r border-zinc-700" />
              <th style={{ position: 'sticky', left: DAY_W, zIndex: 40, width: DATE_W, minWidth: DATE_W, backgroundColor: BG_HEAD }}
                className="border-b-2 border-r-2 border-zinc-700" />
              {allColumns.map(({ dept, emp }, ci) => {
                const isFirstInDept = DEPARTMENTS.find(d => d.name === dept)?.employees[0] === emp
                const isColSelected = sel &&
                  ci >= Math.min(sel.startCol, sel.endCol) &&
                  ci <= Math.max(sel.startCol, sel.endCol)
                return (
                  <th key={`h-${dept}-${emp}-${ci}`}
                    onClick={() => onColHeaderClick(ci)}
                    style={{
                      width: CELL_W, minWidth: CELL_W, maxWidth: CELL_W,
                      backgroundColor: isColSelected ? 'rgba(59,130,246,0.15)' : BG_HEAD,
                      borderLeft: isFirstInDept ? '2px solid #3f3f46' : '1px solid #27272a',
                      cursor: 'pointer',
                    }}
                    className="border-b-2 border-zinc-700 px-1 py-1.5 text-center font-medium text-zinc-400 hover:bg-zinc-800 transition-colors select-none">
                    <span className="block truncate px-1">{emp}</span>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {days.map(({ day, dayName, isWeekend, isToday }) => {
              const rowBg = isToday ? BG_TODAY : isWeekend ? BG_WKND : BG_BODY
              const isRowSelected = sel &&
                day >= Math.min(sel.startDay, sel.endDay) &&
                day <= Math.max(sel.startDay, sel.endDay)

              return (
                <tr key={day}>
                  {/* Day name — click to select row */}
                  <td
                    onClick={() => onRowHeaderClick(day)}
                    style={{
                      position: 'sticky', left: 0, zIndex: 20,
                      width: DAY_W, minWidth: DAY_W,
                      backgroundColor: isRowSelected ? 'rgba(59,130,246,0.15)' : rowBg,
                      cursor: 'pointer',
                    }}
                    className={`border-b border-r border-zinc-800 px-3 py-0 font-medium whitespace-nowrap hover:bg-zinc-800 transition-colors select-none ${
                      isToday ? 'text-sh-grey' : isWeekend ? 'text-zinc-500' : 'text-zinc-300'
                    }`}>
                    {dayName}
                  </td>

                  {/* Date — click to select row */}
                  <td
                    onClick={() => onRowHeaderClick(day)}
                    style={{
                      position: 'sticky', left: DAY_W, zIndex: 20,
                      width: DATE_W, minWidth: DATE_W,
                      backgroundColor: isRowSelected ? 'rgba(59,130,246,0.15)' : rowBg,
                      cursor: 'pointer',
                    }}
                    className={`border-b border-r-2 border-zinc-700 px-2 py-0 text-center font-semibold select-none ${
                      isToday ? 'text-sh-grey' : isWeekend ? 'text-zinc-600' : 'text-zinc-400'
                    }`}>
                    {day}
                  </td>

                  {/* Employee cells */}
                  {allColumns.map(({ dept, emp }, ci) => {
                    const key = cellKey(day, dept, emp)
                    const cell = data[key] ?? emptyCell()
                    const isActive = activeKey === key
                    const isSelected = selectedKeys.has(key)
                    const isEditing = editingKey === key
                    const isFirstInDept = DEPARTMENTS.find(d => d.name === dept)?.employees[0] === emp

                    const cellBg = cell.bgColor
                      ?? (isSelected ? SEL_BG : isWeekend ? BG_WKND : isToday ? BG_TODAY : 'transparent')

                    return (
                      <td
                        key={`${day}-${dept}-${emp}-${ci}`}
                        onMouseDown={e => onCellMouseDown(day, ci, e)}
                        onMouseEnter={() => onCellMouseEnter(day, ci)}
                        onDoubleClick={() => onCellDoubleClick(day, ci)}
                        style={{
                          width: CELL_W, minWidth: CELL_W, maxWidth: CELL_W,
                          padding: 0,
                          backgroundColor: cellBg,
                          borderLeft: isFirstInDept ? '2px solid #3f3f46' : '1px solid #1a1a1a',
                          outline: isActive ? '2px solid #3A913F' : isSelected ? `1px solid ${SEL_BDR}` : undefined,
                          outlineOffset: isActive ? '-2px' : '-1px',
                          cursor: 'cell',
                          userSelect: 'none',
                        }}
                        className="border-b border-zinc-800/60"
                      >
                        <input
                          type="text"
                          value={cell.value}
                          onChange={e => handleTextChange(day, dept, emp, e.target.value)}
                          onFocus={() => {
                            setActiveKey(key)
                            setEditingKey(key)
                            if (!sel || (!selectedKeys.has(key))) {
                              setSel({ startDay: day, endDay: day, startCol: ci, endCol: ci })
                            }
                          }}
                          onBlur={() => {
                            setEditingKey(null)
                            setActiveKey(prev => prev === key ? null : prev)
                          }}
                          readOnly={!isEditing && !isActive}
                          style={{
                            fontWeight: cell.bold ? 'bold' : 'normal',
                            color: cell.textColor ?? '#c4c4c1',
                            minHeight: 32,
                            fontSize: 11,
                            backgroundColor: 'transparent',
                            width: '100%',
                            padding: '0 6px',
                            outline: 'none',
                            cursor: isEditing ? 'text' : 'cell',
                            userSelect: isEditing ? 'auto' : 'none',
                          }}
                          tabIndex={-1}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: BG_TODAY, border: '1px solid #3A913F40' }} />
          <span className="text-[10px] text-zinc-600">Vandaag</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: BG_WKND, border: '1px solid #27272a' }} />
          <span className="text-[10px] text-zinc-600">Weekend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SEL_BG, border: `1px solid ${SEL_BDR}` }} />
          <span className="text-[10px] text-zinc-600">Selectie</span>
        </div>
        <span className="text-[10px] text-zinc-500 ml-auto">Automatisch opgeslagen · Ctrl+C kopiëren · Ctrl+V plakken · Ctrl+B vet</span>
      </div>
    </div>
  )
}
