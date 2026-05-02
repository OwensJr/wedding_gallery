"use client";

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UploadCloud, Camera, Check, X } from 'lucide-react'
import ThankYouModal from '../../../components/ThankYouModal'

function compressImage(file, quality = 0.8, maxWidth = 1600) {
  return new Promise((resolve) => {
    const img = document.createElement('img')
    const reader = new FileReader()
    reader.onload = () => {
      img.src = reader.result
    }
    img.onload = () => {
      const ratio = img.width > maxWidth ? maxWidth / img.width : 1
      const canvas = document.createElement('canvas')
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })), 'image/jpeg', quality)
    }
    reader.readAsDataURL(file)
  })
}

function uploadWithProgress(file, eventId, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || '{}')
        if (xhr.status >= 200 && xhr.status < 300) resolve(json)
        else reject(new Error(json.error || 'Upload failed'))
      } catch (e) {
        reject(new Error('Invalid server response'))
      }
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    const form = new FormData()
    form.append('file', file)
    form.append('eventId', eventId)
    xhr.send(form)
  })
}

export default function EventPage({ params }) {
  // const { eventId } = params
  const { eventId } = params
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [showThanks, setShowThanks] = useState(false)
  const [isValid, setIsValid] = useState(null)
  const [uploadedCount, setUploadedCount] = useState(0)
  const fileRef = useRef()
  const dropRef = useRef()
  const [cameraOpen, setCameraOpen] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraMode, setCameraMode] = useState('photo')
  const [facingMode, setFacingMode] = useState('environment')
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const [capturedBlob, setCapturedBlob] = useState(null)

  useEffect(() => {
    const el = dropRef.current
    if (!el) return
    const handleDrop = (e) => {
      e.preventDefault()
      const list = Array.from(e.dataTransfer.files || [])
      addFiles(list)
    }
    const handleDrag = (e) => e.preventDefault()
    el.addEventListener('drop', handleDrop)
    el.addEventListener('dragover', handleDrag)
    el.addEventListener('dragenter', handleDrag)
    return () => {
      el.removeEventListener('drop', handleDrop)
      el.removeEventListener('dragover', handleDrag)
      el.removeEventListener('dragenter', handleDrag)
    }
  }, [])

  // Validate event on mount
  useEffect(() => {
    let mounted = true
    async function check() {
      try {
        const res = await fetch(`/api/events/validate?eventId=${encodeURIComponent(eventId)}`)
        const json = await res.json()
        if (mounted) setIsValid(Boolean(json.valid))
      } catch (e) {
        if (mounted) setIsValid(false)
      }
    }
    check()
    return () => { mounted = false }
  }, [eventId])

  function addFiles(list) {
    const mapped = list.map((f) => ({
      file: f,
      id: `${f.name}-${f.size}-${Date.now()}`,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : (f.type.startsWith('video/') ? URL.createObjectURL(f) : null),
      progress: 0,
      status: 'pending'
    }))
    setFiles((s) => [...s, ...mapped])
  }

  async function handleFileInput(e) {
    const list = Array.from(e.target.files || [])
    addFiles(list)
  }

  // open an in-page camera modal using getUserMedia
  async function openCamera(opts = {}) {
    try {
      const mode = opts.mode || cameraMode
      const facing = opts.facing || facingMode
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: mode === 'video' })
      streamRef.current = stream
      // store stream and open modal; the video element may mount after this
      setCameraOpen(true)
      // small delay to allow modal/video to mount, then attach stream and try play
      setTimeout(async () => {
        if (videoRef.current) {
          try {
            videoRef.current.muted = true
            videoRef.current.playsInline = true
            videoRef.current.srcObject = stream
            await videoRef.current.play()
          } catch (err) {
            console.warn('Video autoplay failed after mount', err)
          }
        }
      }, 50)
    } catch (err) {
      // fallback to file input if camera access denied or not available
      console.warn('Camera open failed, falling back to file input', err)
      fileRef.current?.click()
    }
  }

  function toggleFacing() {
    // flip camera; restart stream if open
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      // reopen with new facing
      setTimeout(() => openCamera({ facing: next }), 120)
    }
  }

  function switchMode(mode) {
    setCameraMode(mode)
    if (streamRef.current) {
      // restart stream to include/exclude audio if switching to/from video
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setTimeout(() => openCamera({ mode, facing: facingMode }), 120)
    }
  }

  // Ensure if modal mounts after we set streamRef, attach the stream
  useEffect(() => {
    if (!cameraOpen) return
    const s = streamRef.current
    if (s && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.muted = true
      videoRef.current.playsInline = true
      videoRef.current.srcObject = s
      videoRef.current.play().catch(() => {})
    }
  }, [cameraOpen])

  function closeCamera() {
    setCameraOpen(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }

  async function takePhoto() {
    try {
      const video = videoRef.current
      if (!video) return
      // ensure video has loaded enough data for a clean frame
      if (video.readyState < 2 || !video.videoWidth) {
        // wait for a short time for frame data, but don't hang forever
        await Promise.race([
          new Promise((res) => {
            const onLoaded = () => {
              video.removeEventListener('loadeddata', onLoaded)
              res()
            }
            video.addEventListener('loadeddata', onLoaded)
          }),
          new Promise((res) => setTimeout(res, 1200))
        ])
      }

      const vw = video.videoWidth || video.clientWidth || 1280
      const vh = video.videoHeight || video.clientHeight || 720
      const canvas = document.createElement('canvas')
      canvas.width = vw
      canvas.height = vh
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9))
      // show preview step instead of auto-adding
      setCapturedBlob(blob)
      // pause video preview while reviewing
      try { video.pause() } catch (e) {}
    } catch (err) {
      console.error('capture failed', err)
    }
  }

  function acceptCapture() {
    if (!capturedBlob) return
    const ext = cameraMode === 'video' ? '.webm' : '.jpg'
    const type = cameraMode === 'video' ? 'video/webm' : 'image/jpeg'
    const file = new File([capturedBlob], `${cameraMode}-${Date.now()}${ext}`, { type })
    addFiles([file])
    setCapturedBlob(null)
    closeCamera()
  }

  function retakeCapture() {
    // discard blob and resume camera
    setCapturedBlob(null)
    if (videoRef.current && streamRef.current) videoRef.current.play().catch(() => {})
  }

  function startRecording() {
    const stream = streamRef.current
    if (!stream) return
    recordedChunksRef.current = []
    try {
      const opts = { mimeType: 'video/webm; codecs=vp9' }
      const mr = new MediaRecorder(stream, opts)
      mediaRecorderRef.current = mr
      mr.ondataavailable = (e) => { if (e.data && e.data.size) recordedChunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        setCapturedBlob(blob)
        setIsRecording(false)
        try { if (videoRef.current) videoRef.current.pause() } catch(e){}
      }
      mr.start()
      setIsRecording(true)
    } catch (err) {
      console.error('MediaRecorder start failed', err)
    }
  }

  function stopRecording() {
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== 'inactive') mr.stop()
    mediaRecorderRef.current = null
  }

  // Upload with limited concurrency and counter
  async function startUpload(concurrency = 3) {
    if (!files.length) return
    setUploading(true)
    setUploadedCount(0)
    let index = 0
    const total = files.length

    const worker = async () => {
      while (true) {
        const i = index++
        if (i >= total) break
        const item = files[i]
        setFiles((s) => s.map((x) => (x.id === item.id ? { ...x, status: 'uploading' } : x)))
        const fileToSend = item.file.type.startsWith('image/') ? await compressImage(item.file, 0.8) : item.file
        try {
          await uploadWithProgress(fileToSend, eventId, (p) => {
            setFiles((s) => s.map((x) => (x.id === item.id ? { ...x, progress: p } : x)))
          })
          setFiles((s) => s.map((x) => (x.id === item.id ? { ...x, status: 'done', progress: 100 } : x)))
          setUploadedCount((c) => c + 1)
        } catch (err) {
          console.error(err)
          setFiles((s) => s.map((x) => (x.id === item.id ? { ...x, status: 'error' } : x)))
        }
      }
    }

    const promises = new Array(Math.min(concurrency, total)).fill(0).map(() => worker())
    await Promise.all(promises)
    setShowThanks(true)
    setUploading(false)
  }

  function removeFile(id) {
    setFiles((s) => s.filter((f) => f.id !== id))
  }

  if (isValid === false) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white card p-6 text-center">
          <h2 className="text-2xl font-semibold">Invalid event</h2>
          <p className="mt-2 text-gray-600">This event is not available. Please check the link or contact the couple.</p>
        </div>
      </main>
    )
  }

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white card p-4 sm:p-6">
        <h2 className="text-3xl font-semibold mb-1 great-vibes-heading text-primary">{eventId === 'upload' ? "Veldis & Nula" : eventId}</h2>
        <p className="text-gray-600 mb-3">Share photos or videos with the couple.</p>

        <div ref={dropRef} className="border-2 border-dashed border-gray-200 rounded-2xl p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <button type="button" onClick={() => fileRef.current.click()} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg shadow-lg hover:opacity-95 transition">
              <UploadCloud size={18} />
              <span>Choose files</span>
            </button>

            <button type="button" onClick={openCamera} className="inline-flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm shadow-sm hover:shadow-md transition">
              <Camera size={16} />
              <span>Take photo</span>
            </button>

            <div className="ml-auto text-sm text-gray-500">Supported: jpg, png, mp4</div>
          </div>

          <input ref={fileRef} type="file" accept="image/jpeg,image/png,video/mp4" multiple className="hidden" onChange={handleFileInput} />

          {cameraOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={closeCamera} />
              <div className="relative z-10 bg-white rounded-lg p-4 max-w-md w-full">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-medium">{cameraMode === 'photo' ? 'Take a photo' : isRecording ? 'Recording...' : 'Record a video'}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={toggleFacing} className="text-sm px-2 py-1 bg-gray-100 rounded">Flip</button>
                    <button onClick={() => switchMode('photo')} className={`text-sm px-2 py-1 rounded ${cameraMode==='photo'?'bg-primary text-white':'bg-gray-100'}`}>Photo</button>
                    <button onClick={() => switchMode('video')} className={`text-sm px-2 py-1 rounded ${cameraMode==='video'?'bg-primary text-white':'bg-gray-100'}`}>Video</button>
                    <button onClick={closeCamera} className="text-sm text-gray-600">Close</button>
                  </div>
                </div>

                <div className="w-full bg-black/80 rounded">
                  {!capturedBlob ? (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover rounded" />
                  ) : (
                    cameraMode === 'video' ? (
                      <video src={URL.createObjectURL(capturedBlob)} controls className="w-full h-64 object-cover rounded" />
                    ) : (
                      <img src={URL.createObjectURL(capturedBlob)} alt="preview" className="w-full h-64 object-cover rounded" />
                    )
                  )}
                </div>

                <div className="mt-3 flex justify-center">
                  {!capturedBlob ? (
                    cameraMode === 'photo' ? (
                      <button onClick={takePhoto} className="px-4 py-2 bg-primary text-white rounded-full">Capture</button>
                    ) : (
                      isRecording ? (
                        <button onClick={stopRecording} className="px-4 py-2 bg-red-500 text-white rounded-full">Stop</button>
                      ) : (
                        <button onClick={startRecording} className="px-4 py-2 bg-primary text-white rounded-full">Record</button>
                      )
                    )
                  ) : (
                    <div className="flex gap-3">
                      <button onClick={acceptCapture} className="px-4 py-2 bg-green-500 text-white rounded">Use</button>
                      <button onClick={retakeCapture} className="px-4 py-2 bg-gray-100 rounded">Retake</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-4 grid gap-3">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg">
                  {f.preview ? (
                    f.file.type.startsWith('image/') ? (
                      <img src={f.preview} alt="preview" className="w-16 h-16 object-cover rounded-md" />
                    ) : (
                      <video src={f.preview} className="w-16 h-16 object-cover rounded-md" muted />
                    )
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center text-sm">Video</div>
                  )}
                  <div className="flex-1 text-sm">
                    <div className="font-medium truncate">{f.file.name}</div>
                    <div className="text-xs text-gray-500">{f.file.type} • {(f.file.size / 1024 / 1024).toFixed(2)} MB</div>
                    <div className="h-2 bg-gray-200 rounded mt-2 overflow-hidden">
                      <div style={{ width: `${f.progress}%` }} className={`h-2 bg-green-500`} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.status === 'done' && <Check size={18} className="text-green-600" />}
                    {f.status === 'error' && <X size={18} className="text-red-600" />}
                    <button onClick={() => removeFile(f.id)} className="text-xs text-gray-600">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex gap-3 items-center">
            <button onClick={() => startUpload(3)} disabled={uploading || files.length === 0} className="flex-1 py-3 bg-primary text-white rounded-lg">
              {uploading ? `Uploading ${uploadedCount}/${files.length}` : 'Start Upload'}
            </button>
            <button onClick={() => setFiles([])} disabled={uploading} className="px-4 py-3 bg-white border rounded-lg">Clear</button>
          </div>
        </div>
      </div>

      {showThanks && <ThankYouModal onClose={() => setShowThanks(false)} />}
    </motion.main>
  )
}
