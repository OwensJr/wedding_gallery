import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 soft-bg">
      <div className="max-w-2xl w-full bg-white card p-10 text-center">
        <h1 className="text-4xl font-bold text-gray-800 great-vibes-heading">Welcome to Veldis and Nula's Wedding</h1>
        <p className="mt-4 text-gray-600">Please upload photos and share memories with the couple.</p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/upload" className="px-6 py-3 bg-primary text-white rounded-lg shadow hover:scale-[1.02] transition">Veldis and Nula's Gallery</Link>
          <Link href="/admin" className="px-6 py-3 bg-white border rounded-lg shadow">Admin</Link>
        </div>
      </div>
    </main>
  )
}
