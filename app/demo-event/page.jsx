import { redirect } from 'next/navigation'

export default function Page() {
  // redirect to the event route used by the app router
  redirect('/event/upload')
}
