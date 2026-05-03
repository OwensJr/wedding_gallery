import { redirect } from 'next/navigation'

export default function Page() {
  // redirect to the demo event route instead of the literal "upload" event id
  // This avoids /event/upload being interpreted as an eventId named "upload"
  redirect('/event/demo-event')
}
