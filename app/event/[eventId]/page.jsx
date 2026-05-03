import { supabaseAdmin } from '../../../utils/supabaseAdmin'
import EventClient from '../../../components/EventClient'

export const runtime = 'nodejs'

export default async function Page({ params }) {
  const { eventId } = params

  try {
    if (eventId) {
      try {
        const { data, error } = await supabaseAdmin.from('events').select('id').eq('id', eventId).limit(1)
        if (!error && Array.isArray(data) && data.length > 0) {
          return <EventClient eventId={eventId} />
        }
      } catch (e) {
        // db check failed, fall through to env fallback
      }
    }

    const env = process.env.ALLOWED_EVENTS || process.env.NEXT_PUBLIC_ALLOWED_EVENTS
    if (env) {
      const allowed = env.split(',').map((s) => s.trim()).filter(Boolean)
      if (allowed.includes(eventId)) return <EventClient eventId={eventId} />
    }

    if (process.env.NODE_ENV !== 'production' && (eventId === 'demo-event' || eventId === 'upload')) {
      return <EventClient eventId={eventId} />
    }

    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white card p-6 text-center">
          <h2 className="text-2xl font-semibold">Invalid event</h2>
          <p className="mt-2 text-gray-600">This event is not available. Please check the link or contact the couple.</p>
        </div>
      </main>
    )
  } catch (err) {
    console.error('Server validation error', err)
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white card p-6 text-center">
          <h2 className="text-2xl font-semibold">Invalid event</h2>
          <p className="mt-2 text-gray-600">This event is not available. Please check the link or contact the couple.</p>
        </div>
      </main>
    )
  }
}
