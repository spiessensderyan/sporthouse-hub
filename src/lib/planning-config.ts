export interface Department {
  name: string
  employees: string[]
}

export const DEPARTMENTS: Department[] = [
  { name: 'Studenten PS',     employees: ['Emile', 'Rane', 'Elias', 'Wolf'] },
  { name: 'Stags PS',         employees: ['Mike', 'Thibault'] },
  { name: 'Team PS',          employees: ['Leroy', 'Jelle', 'Tim', 'Michiel', 'Bert', 'Benno', 'Jef'] },
  { name: 'Projectkant SHG',  employees: ['Kenny', 'Nick', 'Luther', 'Arne', 'Thijs M', 'Bram', 'Robin Bieber', 'Alexander', 'Yaro', 'Jorn', 'Emilie', 'Torken'] },
  { name: 'STAGS Projectkant',employees: ['Deryan', 'Robin', 'Thibault', 'Fatima', 'Clara'] },
  { name: 'Sport Vl',         employees: ['Arnor'] },
  { name: 'FOS',              employees: ['Thijs', 'Rune', 'Jarne', 'Rane'] },
  { name: 'FOS STAGS',        employees: ['Nathan', 'Ibe', 'Noa', 'Mathieu'] },
  { name: 'Flanders Classics', employees: ['Zias', 'Charlotte', 'Nino'] },
  { name: 'De Spor',          employees: ['Daan', 'Max'] },
]

export const DUTCH_DAYS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
export const DUTCH_MONTHS = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']

export function getDaysInMonth(year: number, month: number) {
  const count = new Date(year, month, 0).getDate()
  const today = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = i + 1
    const date = new Date(year, month - 1, d)
    const dow = date.getDay()
    return {
      day: d,
      dayName: DUTCH_DAYS[dow],
      isWeekend: dow === 0 || dow === 6,
      isToday: d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear(),
    }
  })
}

export function cellKey(day: number, dept: string, emp: string) {
  return `${day}|${dept}|${emp}`
}
