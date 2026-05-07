export interface Club {
  id: string
  name: string
  logo: string
}

export const PRO_LEAGUE_CLUBS: Club[] = [
  { id: 'anderlecht',    name: 'RSC Anderlecht',      logo: '/logos/anderlecht.png' },
  { id: 'antwerp',       name: 'Royal Antwerp FC',    logo: '/logos/antwerp.png' },
  { id: 'cercle-brugge', name: 'Cercle Brugge',       logo: '/logos/cercle-brugge.png' },
  { id: 'charleroi',     name: 'Sporting Charleroi',  logo: '/logos/charleroi.png' },
  { id: 'club-brugge',   name: 'Club Brugge',         logo: '/logos/club-brugge.png' },
  { id: 'dender',        name: 'Dender',              logo: '/logos/dender.png' },
  { id: 'genk',          name: 'KRC Genk',            logo: '/logos/genk.png' },
  { id: 'gent',          name: 'KAA Gent',            logo: '/logos/gent.png' },
  { id: 'la-louviere',   name: 'La Louvière',         logo: '/logos/la-louviere.png' },
  { id: 'mechelen',      name: 'KV Mechelen',         logo: '/logos/mechelen.png' },
  { id: 'oh-leuven',     name: 'OH Leuven',           logo: '/logos/oh-leuven.png' },
  { id: 'standard',      name: 'Standard de Liège',   logo: '/logos/standard.png' },
  { id: 'stvv',          name: 'Sint-Truiden VV',     logo: '/logos/stvv.png' },
  { id: 'union',         name: 'Union Saint-Gilloise',logo: '/logos/union.png' },
  { id: 'westerlo',      name: 'KVC Westerlo',        logo: '/logos/westerlo.png' },
  { id: 'zulte-waregem', name: 'Zulte Waregem',       logo: '/logos/zulte-waregem.png' },
]
