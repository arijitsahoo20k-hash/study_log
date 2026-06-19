import { useEffect, useState } from 'react'
import CameraCapture from './CameraCapture'
import { getSignedUrl } from '../lib/entries'
import './LogEntryForm.css'

const FOCUS_OPTIONS = [
  { value: 1, label: 'Scattered', emoji: '🌫️' },
  { value: 2, label: 'Distracted', emoji: '🌀' },
  { value: 3, label: 'Steady', emoji: '🌤️' },
  { value: 4, label: 'Focused', emoji: '🔥' },
  { value: 5, label: 'Locked in', emoji: '⚡' },
]

export default function LogEntryForm({ date, existing, onSubmit, onClose, submitting }) {
  const [photoBlob, setPhotoBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [existingUrl, setExistingUrl] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [focusScore, setFocusScore] = useState(existing?.focus_score || 3)
  const [hours, setHours] = useState(existing?.hours_studied?.toString() || '')
  const [subject, setSubject] = useState(existing?.subject || '')
  const [note, setNote] = useState(existing?.note || '')
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (existing?.photo_path) {
      getSignedUrl(existing.photo_path).then(setExistingUrl).catch(() => setExistingUrl(null))
    }
  }, [existing])


  function handleCapture(blob) {
    setPhotoBlob(blob)
    setPreviewUrl(URL.createObjectURL(blob))
    setShowCamera(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    if (!existing && !photoBlob) {
      setFormError("Add today's photo before saving.")
      return
    }
    const hoursNum = parseFloat(hours)
    if (Number.isNaN(hoursNum) || hoursNum < 0 || hoursNum > 24) {
      setFormError('Enter a valid number of hours (0–24).')
      return
    }
    onSubmit({
      file: photoBlob,
      focusScore,
      hoursStudied: hoursNum,
      subject: subject.trim(),
      note: note.trim(),
    })
  }

  if (showCamera) {
    return <CameraCapture onCapture={handleCapture} onClose={() => setShowCamera(false)} />
  }

  return (
    <div className="log-overlay" role="dialog" aria-modal="true" aria-label="Log study entry">
      <div className="log-card">
        <header className="log-header">
          <div>
            <p className="log-header__eyebrow">Entry for</p>
            <h2 className="log-header__date">{formatDate(date)}</h2>
          </div>
          <button className="log-close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <form className="log-form" onSubmit={handleSubmit}>
          <div className="log-photo-zone">
            {previewUrl || existingUrl ? (
              <div className="log-photo-preview">
                <img src={previewUrl || existingUrl} alt="Today's study capture" />
                {!existing && (
                  <button type="button" className="log-photo-retake" onClick={() => setShowCamera(true)}>
                    Retake
                  </button>
                )}
              </div>
            ) : existing ? (
              <div className="log-photo-preview log-photo-preview--loading" />
            ) : (
              <button type="button" className="log-photo-cta" onClick={() => setShowCamera(true)}>
                <span className="log-photo-cta__icon">📷</span>
                <span>Take today's photo</span>
                <span className="log-photo-cta__hint">Desk, notes, whiteboard — whatever proves you showed up</span>
              </button>
            )}
          </div>

          <fieldset className="log-field">
            <legend>How was your focus?</legend>
            <div className="focus-picker">
              {FOCUS_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  className={`focus-chip ${focusScore === opt.value ? 'focus-chip--active' : ''}`}
                  data-score={opt.value}
                  onClick={() => setFocusScore(opt.value)}
                >
                  <span className="focus-chip__emoji">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="log-row">
            <label className="log-field">
              <span>Hours studied</span>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                placeholder="e.g. 3.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                required
              />
            </label>
            <label className="log-field">
              <span>Subject (optional)</span>
              <input
                type="text"
                placeholder="e.g. Organic Chemistry"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={60}
              />
            </label>
          </div>

          <label className="log-field">
            <span>Note to future you (optional)</span>
            <textarea
              rows={2}
              placeholder="What worked today? What didn't?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={280}
            />
          </label>

          {formError && <p className="log-error">{formError}</p>}

          <button type="submit" className="log-submit" disabled={submitting}>
            {submitting ? 'Saving…' : existing ? 'Update entry' : 'Save entry'}
          </button>
        </form>
      </div>
    </div>
  )
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}
