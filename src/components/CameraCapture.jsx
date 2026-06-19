import { useEffect, useRef, useState, useCallback } from 'react'
import './CameraCapture.css'

/**
 * Live camera capture with a shutter control, front/back camera switch,
 * and a fallback to file picker for devices/browsers without camera access.
 * Emits a Blob (image/jpeg) via onCapture.
 */
export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)
  const [facingMode, setFacingMode] = useState('user')
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)
  const [flash, setFlash] = useState(false)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const startStream = useCallback(async () => {
    setError(null)
    setReady(false)
    stopStream()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setReady(true)
      }
    } catch (err) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera access was denied. Allow camera permission, or upload a photo instead.'
          : 'Could not start the camera on this device. You can upload a photo instead.'
      )
    }
  }, [facingMode, stopStream])

  useEffect(() => {
    startStream()
    return stopStream
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode])

  function handleShutter() {
    const video = videoRef.current
    if (!video) return
    setFlash(true)
    setTimeout(() => setFlash(false), 180)

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    // Mirror selfie-cam shots back to natural orientation
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        stopStream()
        onCapture(blob)
      },
      'image/jpeg',
      0.92
    )
  }

  function handleFilePicked(e) {
    const file = e.target.files?.[0]
    if (file) {
      stopStream()
      onCapture(file)
    }
  }

  return (
    <div className="camera-overlay" role="dialog" aria-label="Capture today's study photo">
      <div className="camera-frame">
        {!error && (
          <video
            ref={videoRef}
            className={`camera-video ${facingMode === 'user' ? 'mirrored' : ''}`}
            playsInline
            muted
          />
        )}
        {flash && <div className="camera-flash" />}
        {!ready && !error && (
          <div className="camera-status">
            <span className="camera-spinner" />
            Waking up the lens…
          </div>
        )}
        {error && (
          <div className="camera-status camera-status--error">
            <p>{error}</p>
          </div>
        )}
        <div className="camera-sprocket camera-sprocket--top" />
        <div className="camera-sprocket camera-sprocket--bottom" />
      </div>

      <div className="camera-controls">
        <button className="camera-btn camera-btn--ghost" onClick={onClose} aria-label="Cancel">
          Cancel
        </button>

        <button
          className="camera-btn camera-shutter"
          onClick={handleShutter}
          disabled={!ready}
          aria-label="Capture photo"
        >
          <span className="camera-shutter__ring" />
        </button>

        <button
          className="camera-btn camera-btn--ghost"
          onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
          aria-label="Switch camera"
        >
          Flip
        </button>
      </div>

      <button className="camera-upload-link" onClick={() => fileInputRef.current?.click()}>
        or choose a photo from your device
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleFilePicked}
      />
    </div>
  )
}
