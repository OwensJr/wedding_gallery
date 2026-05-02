import { supabaseAdmin } from '../../../../utils/supabaseAdmin'

export const runtime = 'nodejs'

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const eventId = url.searchParams.get('eventId') || ''
    if (!eventId) return new Response(JSON.stringify({ valid: false }), { status: 200 })

    try {
      const { data, error } = await supabaseAdmin.from('events').select('id').eq('id', eventId).limit(1)
      if (!error && Array.isArray(data) && data.length > 0) return new Response(JSON.stringify({ valid: true }), { status: 200 })
    } catch (e) {
      console.warn('events table check failed, falling back to env var')
    }

    const env = process.env.ALLOWED_EVENTS || process.env.NEXT_PUBLIC_ALLOWED_EVENTS
    if (env) {
      const allowed = env.split(',').map((s) => s.trim()).filter(Boolean)
      return new Response(JSON.stringify({ valid: allowed.includes(eventId) }), { status: 200 })
    }

    // Development convenience: allow demo-event and 'upload' locally
    if (process.env.NODE_ENV !== 'production' && (eventId === 'demo-event' || eventId === 'upload')) {
      return new Response(JSON.stringify({ valid: true }), { status: 200 })
    }

    return new Response(JSON.stringify({ valid: false }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ valid: false }), { status: 500 })
  }
}
