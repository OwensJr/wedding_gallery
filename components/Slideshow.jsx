"use client"
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function Slideshow({ photos = [], startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex || 0)
  const [autoplay, setAutoplay] = useState(true)
  const [intervalMs, setIntervalMs] = useState(3000)

  useEffect(() => setIndex(startIndex), [startIndex])

  useEffect(() => {
    const key = (e) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, photos.length - 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [photos.length, onClose])

  // autoplay
  useEffect(() => {
    if (!autoplay) return
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length)
    }, intervalMs)
    return () => clearInterval(t)
  }, [autoplay, intervalMs, photos.length])

  if (!photos || photos.length === 0) return null

  const p = photos[index]

  const enterFullscreen = async () => {
    const el = document.documentElement
    if (el.requestFullscreen) await el.requestFullscreen()
  }

  function downloadCurrent() {
    const downloadBlob = async (url, filename) => {
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
        window.open(url, '_blank')
      }
    }

    downloadBlob(p.signed_url, p.image_url ? p.image_url.split('/').pop() : 'photo.jpg')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="absolute top-6 right-6 flex gap-2">
        <button className="text-white px-3 py-1 bg-white/10 rounded" onClick={() => setAutoplay((s) => !s)}>{autoplay ? 'Pause' : 'Play'}</button>
        <button className="text-white px-3 py-1 bg-white/10 rounded" onClick={enterFullscreen}>Fullscreen</button>
        <button className="text-white px-3 py-1 bg-white/10 rounded" onClick={downloadCurrent}>Download</button>
        <button className="text-white px-3 py-1 bg-white/10 rounded" onClick={onClose}>Close</button>
      </div>
      <button className="absolute left-6 text-white text-lg" onClick={() => setIndex((i) => Math.max(i - 1, 0))}>‹</button>
      <div className="max-w-3xl max-h-[80vh] w-full p-4">
        <img loading="lazy" src={p.signed_url} className="w-full h-auto rounded shadow-lg" alt="slide" />
        <div className="mt-2 text-center text-white">{p.event_id} • {new Date(p.created_at).toLocaleString()}</div>
      </div>
      <button className="absolute right-6 text-white text-lg" onClick={() => setIndex((i) => Math.min(i + 1, photos.length - 1))}>›</button>
    </motion.div>
  )
}
