import { supabaseAdmin } from '../../../../utils/supabaseAdmin'

export const runtime = 'nodejs'

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const eventId = url.searchParams.get('eventId') || ''

    const debugToken = url.searchParams.get('debugToken') || req.headers.get('x-debug-token')
    const debugEnabled = Boolean(debugToken && process.env.VALIDATE_DEBUG_TOKEN && debugToken === process.env.VALIDATE_DEBUG_TOKEN)

    if (!eventId) {
      return Response.json({ valid: false })
    }

    let dbFound = false
    let dbError = null

    try {
      const { data, error } = await supabaseAdmin.from('events').select('id').eq('id', eventId).limit(1)
      if (error) dbError = error
      if (Array.isArray(data) && data.length > 0) dbFound = true
    } catch (e) {
      dbError = e
    }

    if (dbFound) {
      const payload = { valid: true }
      if (debugEnabled) payload.debug = { source: 'db', eventId, dbFound: true }
      return Response.json(payload)
    }

    const envRaw = process.env.ALLOWED_EVENTS || process.env.NEXT_PUBLIC_ALLOWED_EVENTS || ''
    const allowed = envRaw.split(',').map(s => s.trim()).filter(Boolean)
    const envMatch = allowed.includes(eventId)

    if (envMatch) {
      const payload = { valid: true }
      if (debugEnabled) payload.debug = { source: 'env', eventId, allowed }
      return Response.json(payload)
    }

    // dev fallback
    if (process.env.NODE_ENV !== 'production' && (eventId === 'demo-event' || eventId === 'upload')) {
      const payload = { valid: true }
      if (debugEnabled) payload.debug = { source: 'dev-fallback', eventId }
      return Response.json(payload)
    }

    const payload = { valid: false }
    if (debugEnabled) payload.debug = { source: 'none', eventId, allowed, dbError: dbError ? String(dbError) : null, nodeEnv: process.env.NODE_ENV }
    return Response.json(payload)

  } catch (err) {
    console.error('Fatal error:', err)
    return Response.json({ valid: false }, { status: 500 })
  }
}