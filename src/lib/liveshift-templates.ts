export type SlotType = 'photo' | 'text' | 'logo'

export interface PhotoSlot {
  type: 'photo'
  key: string
  label: string
}

export interface TextSlot {
  type: 'text'
  key: string
  label: string
  placeholder?: string
  x: number
  y: number
  fontSize: number
  fontWeight?: string
  fontFamily?: string
  color?: string
  align?: CanvasTextAlign
  maxWidth?: number
}

export interface LogoSlot {
  type: 'logo'
  key: string
  label: string
  cx: number
  cy: number
  radius: number
}

export type Slot = PhotoSlot | TextSlot | LogoSlot

export interface TemplateConfig {
  id: string
  label: string
  emoji: string
  description: string
  file: string | null
  width: number
  height: number
  slots: Slot[]
}

export const TEMPLATES: TemplateConfig[] = [
  {
    id: 'man-of-match',
    label: 'Man of the Match',
    emoji: '⭐',
    description: 'Beste speler van de wedstrijd',
    file: '/templates/ManOfTheMatch_Template.png',
    width: 1080,
    height: 1350,
    slots: [
      {
        type: 'photo',
        key: 'photo',
        label: 'Spelerfoto',
      },
      {
        type: 'text',
        key: 'playerName',
        label: 'Spelersnaam',
        placeholder: 'Théo Bongonda',
        x: 0.5,
        y: 0.737,
        fontSize: 0.046,
        fontWeight: 'bold',
        color: '#ffffff',
        align: 'center',
        maxWidth: 0.82,
      },
      {
        type: 'logo',
        key: 'homeLogo',
        label: 'Logo thuisploeg',
        cx: 0.386,
        cy: 0.863,
        radius: 0.058,
      },
      {
        type: 'logo',
        key: 'awayLogo',
        label: 'Logo uitploeg',
        cx: 0.568,
        cy: 0.863,
        radius: 0.058,
      },
    ],
  },
  {
    id: 'transfer',
    label: 'Transfer',
    emoji: '✈️',
    description: 'Speler transfer aankondiging',
    file: null,
    width: 1080, height: 1350, slots: [],
  },
  {
    id: 'team-of-week',
    label: 'Team of the Week',
    emoji: '🏅',
    description: 'Ploeg van de week',
    file: null,
    width: 1080, height: 1350, slots: [],
  },
  {
    id: 'matchday-result',
    label: 'Matchday / Result',
    emoji: '🏆',
    description: 'Speeldag of eindstand',
    file: null,
    width: 1080, height: 1350, slots: [],
  },
  {
    id: 'ranking',
    label: 'Ranking',
    emoji: '📊',
    description: 'Klassement overzicht',
    file: null,
    width: 1080, height: 1350, slots: [],
  },
  {
    id: 'list',
    label: 'List',
    emoji: '📋',
    description: 'Lijstoverzicht',
    file: null,
    width: 1080, height: 1350, slots: [],
  },
  {
    id: 'head-to-head',
    label: 'Head to Head',
    emoji: '⚔️',
    description: 'Directe confrontatie',
    file: null,
    width: 1080, height: 1350, slots: [],
  },
  {
    id: 'single-stats',
    label: 'Single Stats',
    emoji: '📈',
    description: 'Individuele statistiek',
    file: null,
    width: 1080, height: 1350, slots: [],
  },
  {
    id: 'quote',
    label: 'Quote',
    emoji: '💬',
    description: 'Citaat van speler of coach',
    file: null,
    width: 1080, height: 1350, slots: [],
  },
  {
    id: 'multiple-fixtures',
    label: 'Multiple Fixtures',
    emoji: '📅',
    description: 'Meerdere wedstrijden',
    file: null,
    width: 1080, height: 1350, slots: [],
  },
]
