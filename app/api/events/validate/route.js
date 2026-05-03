import { supabaseAdmin } from '../../../../utils/supabaseAdmin'

export const runtime = 'nodejs'

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const eventId = url.searchParams.get('eventId')

    if (!eventId) {
      return Response.json({ valid: false })
    }

    // 1. Try Supabase first
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('id', eventId)
      .maybeSingle()

    if (error) {
      console.error('Supabase error:', error)
    }

    if (data) {
      return Response.json({ valid: true })
    }

    // 2. Fallback to env
    const allowedRaw = process.env.ALLOWED_EVENTS || ''
    const allowed = allowedRaw
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)

    return Response.json({
      valid: allowed.includes(eventId),
      debug: {
        eventId,
        allowed
      }
    })

  } catch (err) {
    console.error('Fatal error:', err)
    return Response.json({ valid: false }, { status: 500 })
  }
}