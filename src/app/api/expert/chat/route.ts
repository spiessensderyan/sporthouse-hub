import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const TEXT_TYPES = ['txt', 'md', 'csv', 'json', 'xml', 'html', 'rtf']

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Niet ingelogd.', { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key') {
    return new Response('NO_API_KEY', { status: 402 })
  }

  const { clientId, clientName, messages } = await request.json()
  if (!clientId || !messages?.length) {
    return new Response('Ongeldige aanvraag.', { status: 400 })
  }

  // Fetch all files for this client
  const { data: files } = await supabase
    .from('files')
    .select('id, filename, description, file_type, storage_path')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })

  // Build context: read text files from storage, use name+description for others
  let docsBlock = ''
  if (files && files.length > 0) {
    const parts = await Promise.all(files.map(async (f) => {
      const header = `### ${f.filename}${f.description ? ` — ${f.description}` : ''}`
      if (TEXT_TYPES.includes(f.file_type.toLowerCase())) {
        try {
          const { data: blob } = await supabase.storage.from('files').download(f.storage_path)
          if (blob) {
            const text = await blob.text()
            // Cap at 20k chars per file to stay within context limits
            const trimmed = text.length > 20000 ? text.slice(0, 20000) + '\n...(bestand ingekort)' : text
            return `${header}\n${trimmed}`
          }
        } catch {
          // Fall through to filename-only
        }
      }
      return `${header}\n(Bestandstype: ${f.file_type.toUpperCase()}${f.description ? ` — ${f.description}` : ''})`
    }))
    docsBlock = parts.join('\n\n---\n\n')
  } else {
    docsBlock = '(Nog geen bestanden geüpload voor deze klant. Beantwoord vragen zo goed mogelijk op basis van algemene sportmarketing kennis.)'
  }

  const systemPrompt = `Je bent de Expert AI voor ${clientName}, een klant van SporthouseGroup — een Belgisch sport marketing en media bedrijf.

Je hebt toegang tot de volgende bestanden en documenten over ${clientName}:

${docsBlock}

INSTRUCTIES:
- Beantwoord altijd in het Nederlands
- Spreek als een expert die ${clientName} door en door kent
- Help met concepten, briefings, content ideeën, captions, campagnestrategieën en andere marketing- en communicatietaken
- Wees specifiek, creatief en actionable — geen vage antwoorden
- Als iets niet in de bestanden staat, zeg dat eerlijk en geef je beste inschatting op basis van de beschikbare context
- Gebruik de toon en stijl die past bij ${clientName}

OPMAAK:
- Gebruik rijke markdown opmaak: koppen (## en ###), vetgedrukte tekst voor kernpunten, opsommingstekens voor lijsten, genummerde lijsten voor stappen
- Schrijf in volledige, goed gevormde zinnen met voldoende witruimte tussen alinea's
- Gebruik koppen om langere antwoorden te structureren
- Korte antwoorden mogen gewoon als doorlopende tekst — gebruik opmaak alleen waar het echt helpt
- Schrijf zoals Claude: helder, direct, goed gestructureerd en zonder onnodige omhaal`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const contextMessages = messages.slice(-30) as Anthropic.MessageParam[]

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: contextMessages,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
