import { useEffect, useState } from 'react'
import { getSignedUrl, deleteEntry } from '../lib/entries'
import './DayDetail.css'

const FOCUS_LABELS = ['', 'Scattered', 'Distracted', 'Steady', 'Focused', 'Locked in']

export default function DayDetail({ entry, allEntries, onClose, onDeleted, onEdit }) {
  const [url, setUrl] = useState(null)
  const [compareWith, setCompareWith] = useState(null)
  const [compareUrl, setCompareUrl] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getSignedUrl(entry.photo_path).then(setUrl)
  }, [entry.photo_path])

  useEffect(() => {
    if (!compareWith) {
      setCompareUrl(null)
      return
    }
    getSignedUrl(compareWith.photo_path).then(setCompareUrl)
  }, [compareWith])

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteEntry(entry)
      onDeleted(entry)
    } finally {
      setDeleting(false)
    }
  }

  const others = allEntries.filter((e) => e.id !== entry.id)

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-card" onClick={(e) => e.stopPropagation()}>
        <header className="detail-header">
          <div>
            <p className="detail-header__eyebrow">{FOCUS_LABELS[entry.focus_score]}</p>
            <h2>{formatDate(entry.study_date)}</h2>
          </div>
          <button className="log-close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className={`detail-photos ${compareWith ? 'detail-photos--split' : ''}`}>
          <div className="detail-photo">
            {url ? <img src={url} alt={`Study session on ${entry.study_date}`} /> : <div className="detail-photo__loading" />}
          </div>
          {compareWith && (
            <div className="detail-photo">
              {compareUrl ? <img src={compareUrl} alt={`Study session on ${compareWith.study_date}`} /> : <div className="detail-photo__loading" />}
              <span className="detail-photo__tag">{formatDate(compareWith.study_date)}</span>
            </div>
          )}
        </div>

        <dl className="detail-meta">
          <div>
            <dt>Hours</dt>
            <dd>{entry.hours_studied}h</dd>
          </div>
          <div>
            <dt>Subject</dt>
            <dd>{entry.subject || '—'}</dd>
          </div>
          <div>
            <dt>Focus</dt>
            <dd>{FOCUS_LABELS[entry.focus_score]}</dd>
          </div>
        </dl>

        {entry.note && <p className="detail-note">&ldquo;{entry.note}&rdquo;</p>}

        <div className="detail-compare">
          <label>
            <span>Compare with another day</span>
            <select
              value={compareWith?.id || ''}
              onChange={(e) => setCompareWith(others.find((o) => o.id === e.target.value) || null)}
            >
              <option value="">None</option>
              {others.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.study_date} — {FOCUS_LABELS[o.focus_score]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="detail-actions">
          <button className="detail-btn detail-btn--ghost" onClick={() => onEdit(entry)}>
            Edit entry
          </button>
          {!confirmingDelete ? (
            <button className="detail-btn detail-btn--danger" onClick={() => setConfirmingDelete(true)}>
              Delete
            </button>
          ) : (
            <div className="detail-confirm">
              <span>Delete this entry and photo permanently?</span>
              <button className="detail-btn detail-btn--ghost" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </button>
              <button className="detail-btn detail-btn--danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}
