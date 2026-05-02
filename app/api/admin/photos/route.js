import { supabaseAdmin } from '../../../../utils/supabaseAdmin'

export const runtime = 'nodejs'

async function verifyToken(token) {
  if (!token) return null
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error) return null
  return data.user
}

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const eventId = url.searchParams.get('eventId')
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)
    const page = parseInt(url.searchParams.get('page') || '0', 10)
    const offset = page * limit
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const user = await verifyToken(token)
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    // Use pagination and return total count
    let q = supabaseAdmin.from('photos').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1)
    if (eventId) q = q.eq('event_id', eventId)
    const { data, error, count } = await q
    if (error) throw error

    // create signed urls (short-lived)
    const items = await Promise.all(data.map(async (it) => {
      const { data: urlData, error: urlErr } = await supabaseAdmin.storage.from('wedding-photos').createSignedUrl(it.image_url, 60 * 60)
      return { ...it, signed_url: urlErr ? null : urlData.signedUrl }
    }))

    return new Response(JSON.stringify({ photos: items, total: count ?? null, page, limit }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const { photoPath } = await req.json()
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const user = await verifyToken(token)
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    // delete from storage
    const { error: delErr } = await supabaseAdmin.storage.from('wedding-photos').remove([photoPath])
    if (delErr) throw delErr

    // delete DB record
    const { error: dbErr } = await supabaseAdmin.from('photos').delete().eq('image_url', photoPath)
    if (dbErr) throw dbErr

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
