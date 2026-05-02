"use client"

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../utils/supabaseClient'
import Slideshow from '../../components/Slideshow'
import { User, Lock, Download, Trash2, Eye, CheckSquare, LogOut } from 'lucide-react'

export default function AdminPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState(null)
  const [photos, setPhotos] = useState([])
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [slideIndex, setSlideIndex] = useState(-1)
  const realtimeRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        setSession(data.session)
        fetchPhotos(data.session.access_token)
        startRealtime(data.session.access_token)
      }
    })
  }, [])

  // Infinite scroll
  useEffect(() => {
    const sentinel = document.getElementById('scroll-sentinel')
    if (!sentinel) return

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMore && !loading && session) {
          fetchPhotos(session.access_token, page + 1, true)
        }
      })
    }, { rootMargin: '200px' })

    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [hasMore, loading, page, session])

  async function signIn() {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) return alert(error.message)

    setSession(data.session)
    fetchPhotos(data.session.access_token)
    startRealtime(data.session.access_token)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
    setPhotos([])
    stopRealtime()
  }

  async function fetchPhotos(token, nextPage = 0, append = false) {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/photos?eventId=${encodeURIComponent(filter)}&page=${nextPage}&limit=24`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const j = await res.json()
      const list = j.photos || []

      setPhotos((prev) => (append ? prev.concat(list) : list))
      setHasMore(list.length === 24)
      setPage(nextPage)

    } catch (err) {
      console.error(err)
      alert('Failed to load photos')
    } finally {
      setLoading(false)
    }
  }

  async function deletePhoto(photoPath) {
    if (!confirm('Delete this photo?')) return

    const token = session?.access_token
    if (!token) return alert('Not authenticated')

    const res = await fetch('/api/admin/photos', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ photoPath })
    })

    const j = await res.json()
    if (!res.ok) return alert(j.error || 'Delete failed')

    setPhotos((s) => s.filter((p) => p.image_url !== photoPath))
    setSelected((s) => s.filter((id) => id !== photoPath))
  }

  function toggleSelect(photo) {
    setSelected((cur) => {
      const next = new Set(cur)
      if (next.has(photo.image_url)) next.delete(photo.image_url)
      else next.add(photo.image_url)
      return Array.from(next)
    })
  }

  function selectAll() {
    setSelected(photos.map((p) => p.image_url))
  }

  async function downloadSelected() {
    if (selected.length === 0) return alert('No photos selected')

    for (let path of selected) {
      const p = photos.find((x) => x.image_url === path)
      if (!p?.signed_url) continue

      await downloadBlob(p.signed_url, path.split('/').pop())
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  async function downloadBlob(url, filename) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename || 'file'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.warn('download failed, opening in new tab', err)
      window.open(url, '_blank')
    }
  }

  function startRealtime(token) {
    stopRealtime()

    const channel = supabase
      .channel('photos-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos' }, () => {
        fetchPhotos(token)
      })
      .subscribe()

    realtimeRef.current = channel
  }

  function stopRealtime() {
    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current)
      realtimeRef.current = null
    }
  }

  return (
    <main className="min-h-screen p-6 bg-soft-bg">
      <div className="max-w-6xl mx-auto">

        {!session ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-md bg-white p-6 rounded-xl shadow">
            <h3 className="text-2xl mb-4">Admin Sign In</h3>

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full p-3 border rounded mb-3"
            />

            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              className="w-full p-3 border rounded mb-3"
            />

            <button
              onClick={signIn}
              className="w-full py-3 bg-purple-600 text-white rounded"
            >
              Sign In
            </button>
          </motion.div>

        ) : (
          <div>
            <div className="flex justify-between mb-4">
              <input
                placeholder="Filter eventId"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="p-2 border rounded"
              />

              <div className="flex gap-2">
                <button onClick={selectAll}><CheckSquare size={18} /></button>
                <button onClick={downloadSelected}><Download size={18} /></button>
                <button onClick={signOut}><LogOut size={18} /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photos.map((p, idx) => (
                <motion.div key={p.id} whileHover={{ scale: 1.02 }} className="bg-white rounded shadow">
                  <img src={p.signed_url} className="w-full h-40 object-cover" />

                  <div className="p-2 flex justify-between">
                    <input
                      type="checkbox"
                      checked={selected.includes(p.image_url)}
                      onChange={() => toggleSelect(p)}
                    />

                    <div className="flex gap-2">
                      <button onClick={() => setSlideIndex(idx)} className="bg-white/90 p-2 rounded shadow"><Eye size={16} /></button>
                      <button onClick={() => downloadBlob(p.signed_url, p.image_url.split('/').pop())} className="bg-white/90 p-2 rounded shadow"><Download size={16} /></button>
                      <button onClick={() => deletePhoto(p.image_url)} className="bg-red-50 p-2 rounded shadow text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div id="scroll-sentinel" className="h-10" />
          </div>
        )}

        {slideIndex >= 0 && (
          <Slideshow
            photos={photos}
            startIndex={slideIndex}
            onClose={() => setSlideIndex(-1)}
          />
        )}

      </div>
    </main>
  )
}