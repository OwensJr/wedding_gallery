import { supabaseAdmin } from '../../../utils/supabaseAdmin'

export const runtime = 'nodejs'

async function isValidEvent(eventId) {
  if (!eventId) return false
  try {
    // Prefer DB-driven event list if available
    const { data, error } = await supabaseAdmin.from('events').select('id').eq('id', eventId).limit(1)
    if (!error && Array.isArray(data) && data.length > 0) return true
  } catch (e) {
    // ignore DB errors and fallback to env var
    console.warn('events table check failed, falling back to env var', e.message)
  }

  // Fallback to environment variable: comma-separated list
  const env = process.env.ALLOWED_EVENTS || process.env.NEXT_PUBLIC_ALLOWED_EVENTS
  if (env) {
    const allowed = env.split(',').map((s) => s.trim()).filter(Boolean)
    return allowed.includes(eventId)
  }

  return false
}

export async function POST(req) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    const eventId = form.get('eventId') || ''

    if (!isValidEvent(eventId)) {
      return new Response(JSON.stringify({ error: 'Invalid event' }), { status: 403 })
    }

    if (!file || !file.size) {
      return new Response(JSON.stringify({ error: 'No file' }), { status: 400 })
    }

    const maxImageSize = 5 * 1024 * 1024 // 5MB
    const maxVideoSize = 50 * 1024 * 1024 // 50MB

    const allowedImageTypes = ['image/jpeg', 'image/png']
    const allowedVideoTypes = ['video/mp4']

    if (allowedImageTypes.includes(file.type)) {
      if (file.size > maxImageSize) return new Response(JSON.stringify({ error: 'Image too large' }), { status: 400 })
    } else if (allowedVideoTypes.includes(file.type)) {
      if (file.size > maxVideoSize) return new Response(JSON.stringify({ error: 'Video too large' }), { status: 400 })
    } else {
      return new Response(JSON.stringify({ error: 'Invalid file type' }), { status: 400 })
    }

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const path = `${eventId}/${filename}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: upErr } = await supabaseAdmin.storage.from('wedding-photos').upload(path, new Uint8Array(arrayBuffer), { contentType: file.type })
    if (upErr) throw upErr

    // Insert DB record with content type
    const { error: dbErr } = await supabaseAdmin.from('photos').insert([{ event_id: eventId, image_url: path, content_type: file.type }])
    if (dbErr) throw dbErr

    return new Response(JSON.stringify({ ok: true, path }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500 })
  }
}
