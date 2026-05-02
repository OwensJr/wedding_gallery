import { useEffect } from 'react'
import { motion } from 'framer-motion'

export default function ThankYouModal({ onClose }) {
  useEffect(() => {
    const t = setTimeout(() => onClose(), 4000)
    return () => clearTimeout(t)
  }, [onClose])

  async function copyContact() {
    try {
      await navigator.clipboard.writeText('info@easytechsolutionz.com | 0778091199')
      alert('Contact copied to clipboard')
    } catch (e) {
      alert('Unable to copy. Please copy manually: info@easytechsolutionz.com')
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-2xl p-6 z-10 text-center shadow-2xl w-full max-w-sm">
        <div className="text-2xl font-semibold">Thank you for sharing!</div>
        <div className="mt-2 text-sm text-gray-600">Your files have been sent to the couple. Want the same for your wedding? Contact us:</div>
        <div className="mt-3 flex flex-col gap-2 items-center">
          <a href="mailto:info@easytechsolutionz.com" className="text-primary font-medium">info@easytechsolutionz.com</a>
          <div className="text-sm text-gray-500">0778091199</div>
          <div className="mt-2 flex gap-2">
            <button onClick={copyContact} className="px-3 py-2 bg-primary text-white rounded-md">Copy contact</button>
            <button onClick={onClose} className="px-3 py-2 bg-gray-100 rounded-md">Close</button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
