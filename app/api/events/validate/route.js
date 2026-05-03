import { supabaseAdmin } from '../../../../utils/supabaseAdmin'

export const runtime = 'nodejs'

function isDebug(req, url) {
  const token =
    url.searchParams.get('debugToken') ||
    req.headers.get('x-debug-token')

  const expected = process.env.VALIDATE_DEBUG_TOKEN

  return token && expected && token === expected
}

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const eventId = url.searchParams.get('eventId')?.trim()

    const debugEnabled = isDebug(req, url)

    if (!eventId) {
      return Response.json({
        valid: false,
        ...(debugEnabled && { debug: { reason: 'missing_eventId' } })
      })
    }

    // -------------------------
    // 1. DATABASE CHECK
    // -------------------------
    let dbFound = false
    let dbError = null

    try {
      const { data, error } = await supabaseAdmin
        .from('events')
        .select('id')
        .eq('id', eventId)
        .maybeSingle()

      if (error) dbError = error
      if (data) dbFound = true
    } catch (e) {
      dbError = e
    }

    if (dbFound) {
      return Response.json({
        valid: true,
        ...(debugEnabled && {
          debug: {
            source: 'supabase',
            eventId
          }
        })
      })
    }

    // -------------------------
    // 2. ENV CHECK
    // -------------------------
    const envRaw = process.env.ALLOWED_EVENTS || ''
    const allowed = envRaw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    const envMatch = allowed.includes(eventId)

    if (envMatch) {
      return Response.json({
        valid: true,
        ...(debugEnabled && {
          debug: {
            source: 'env',
            eventId,
            allowed
          }
        })
      })
    }

    // -------------------------
    // 3. DEV FALLBACK
    // -------------------------
    const isDev =
      process.env.NODE_ENV !== 'production'

    if (isDev && (eventId === 'demo-event' || eventId === 'upload')) {
      return Response.json({
        valid: true,
        ...(debugEnabled && {
          debug: {
            source: 'dev-fallback'
          }
        })
      })
    }

    // -------------------------
    // 4. FINAL REJECT
    // -------------------------
    return Response.json({
      valid: false,
      ...(debugEnabled && {
        debug: {
          source: 'none',
          eventId,
          allowed,
          dbError: dbError ? String(dbError) : null,
          nodeEnv: process.env.NODE_ENV
        }
      })
    })

  } catch (err) {
    console.error(err)
    return Response.json({
      valid: false,
      error: err.message
    }, { status: 500 })
  }
}