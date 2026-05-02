import './globals.css'
import { Roboto } from 'next/font/google'
import PWARegister from '../components/PWARegister'

const roboto = Roboto({ subsets: ['latin'], weight: ['400','700'] })

export const metadata = {
  title: 'Wedding Photos',
  description: 'Mobile-first wedding photo sharing app'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${roboto.className} soft-bg`}>
        {children}
        <PWARegister />
      </body>
    </html>
  )
}
