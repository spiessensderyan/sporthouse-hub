// One-time backfill: copies the access-control fields (permissions, freelancer,
// allowed, expires_at) from user_metadata (client-writable) into app_metadata
// (server-only), which is what the app now reads exclusively.
//
// Dry-run by default — prints what would change without writing anything.
// Pass --write to actually apply the changes.
//
// Usage:
//   node scripts/backfill-app-metadata.mjs          (dry run)
//   node scripts/backfill-app-metadata.mjs --write   (apply)

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync(new URL('../.env.local', import.meta.url).pathname, 'utf8')
const env = Object.fromEntries(envContent.split('\n').filter(l => l.includes('=')).map(l => {
  const idx = l.indexOf('='); return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^"|"$/g, '')]
}))

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt in .env.local')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const WRITE = process.argv.includes('--write')
const FIELDS = ['permissions', 'freelancer', 'allowed', 'expires_at']

async function main() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error

  console.log(`${WRITE ? 'WRITE' : 'DRY RUN'} — ${users.length} users found\n`)

  let toUpdate = 0
  let updated = 0
  let failed = 0

  for (const u of users) {
    const um = u.user_metadata ?? {}
    const am = u.app_metadata ?? {}

    // Only carry over fields that exist in user_metadata and aren't already
    // present (with the same value) in app_metadata.
    const patch = {}
    for (const f of FIELDS) {
      if (um[f] === undefined) continue
      if (JSON.stringify(am[f]) === JSON.stringify(um[f])) continue
      patch[f] = um[f]
    }

    if (Object.keys(patch).length === 0) continue
    toUpdate++

    console.log(`${u.email ?? u.id}`)
    console.log(`  current app_metadata: ${JSON.stringify(am)}`)
    console.log(`  patch:                ${JSON.stringify(patch)}`)

    if (WRITE) {
      const { error: updErr } = await supabase.auth.admin.updateUserById(u.id, {
        app_metadata: { ...am, ...patch },
      })
      if (updErr) {
        console.log(`  FAILED: ${updErr.message}`)
        failed++
      } else {
        console.log(`  ✓ updated`)
        updated++
      }
    }
    console.log('')
  }

  console.log(`---`)
  console.log(`${toUpdate} user(s) need updating.`)
  if (WRITE) console.log(`${updated} updated, ${failed} failed.`)
  else console.log(`Dry run only — re-run with --write to apply.`)
}

main().catch(err => { console.error(err); process.exit(1) })
