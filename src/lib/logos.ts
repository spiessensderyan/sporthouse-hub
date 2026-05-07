const LOGO_MAP: Record<string, string> = {
  'Pro League':                '/logos/proleague.jpg',
  'RBFA':                      '/logos/rbfa.jpg',
  'Unibet Experts':            '/logos/unibet-experts.jpg',
  'Sporza':                    '/logos/sporza.jpg',
  'KRC Genk':                  '/logos/krc-genk.jpg',
  'Club Brugge':               '/logos/club-brugge.png',
  'RSC Anderlecht':            '/logos/rsc-anderlecht.jpg',
  'Flanders Classics':         '/logos/flanders-classics.jpg',
  'Lotto Super League':        '/logos/lotto-super-league.jpg',
  'AG':                        '/logos/ag.png',
  'i-fitness':                 '/logos/i-fitness.jpg',
  'PLAY':                      '/logos/play.jpg',
  'Play Sports':               '/logos/play-sports.jpg',
  'Sport Vlaanderen':          '/logos/sport-vlaanderen.jpg',
  'Move To Cure':              '/logos/move-to-cure.jpeg',
  'Jan Vertonghen Foundation': '/logos/jan-vertonghen-foundation.jpg',
  'Verstappen.com':            '/logos/verstappen-com.jpg',
  'Sporthouse':                '/logos/sporthouse.jpg',
  'Friends of Sports':         '/logos/friends-of-sports.jpeg',
  'Shirtlist':                 '/logos/shirtlist.jpg',
  'Kevin De Bruyne':           '/logos/kevin-de-bruyne.webp',
  'Kos Karetsas':              '/logos/karetsas.webp',
  'Max Verstappen':            '/logos/verstappen.jpg',
  'Maxim De Cuyper':           '/logos/de-cuyper.webp',
  'Arthur Vermeeren':          '/logos/vermeeren.webp',
  'Dries Mertens':             '/logos/mertens.webp',
  'Charles De Ketelaere':      '/logos/de-ketelaere.webp',
  'MIDMID':                    '/logos/midmid.jpg',
  '90 MINUTES':                '/logos/90minutes.webp',
  "OEP Z'N BAKKES":            '/logos/oepznbakkes.jpg',
  'VALS PLAT':                 '/logos/valsplat.jpeg',
  'KICK&RUSH':                 '/logos/kickandrush.jpg',
  'BUITEN DE LIJNEN':          '/logos/buitendelijnen.jpg',
  'CROQUETA':                  '/logos/croqueta.jpg',
  "X&O's":                     '/logos/xandos.jpg',
  'BALLIEMAN':                 '/logos/ballieman.jpg',
  'Kartel':                    '/logos/kartel.jpg',
}

// Normalize: lowercase + alleen letters en cijfers
function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const NORMALIZED: Record<string, string> = Object.fromEntries(
  Object.entries(LOGO_MAP).map(([k, v]) => [normalize(k), v])
)

export function getLogo(name: string, logoUrl?: string | null): string | null {
  if (logoUrl) return logoUrl
  return LOGO_MAP[name] ?? NORMALIZED[normalize(name)] ?? null
}
