import { redirect } from 'next/navigation'

export default function Page() {
  // point demo-event to the explicit demo-event event id
  redirect('/event/demo-event')
}
