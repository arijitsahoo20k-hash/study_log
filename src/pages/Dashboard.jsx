import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  listEntries,
  createEntry,
  updateEntry,
  listStreakFreezes,
  useStreakFreeze,
  computeStreak,
  todayISO,
} from '../lib/entries'
import { useOfflineQueue, queuePendingEntry, getPendingEntries, clearPendingEntry } from '../hooks/useOfflineQueue'
import ContactSheet from '../components/ContactSheet'
import FocusHeatmap from '../components/FocusHeatmap'
import StatsPanel from '../components/StatsPanel'
import LogEntryForm from '../components/LogEntryForm'
import DayDetail from '../components/DayDetail'
import './Dashboard.css'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [entries, setEntries] = useState([])
  const [freezeDates, setFreezeDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLogForm, setShowLogForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const today = todayISO()
  const todaysEntry = entries.find((e) => e.study_date === today)

  const flushQueue = useCallback(async () => {
    const pending = await getPendingEntries()
    for (const item of pending) {
      try {
        await createEntry({ userId: user.id, ...item })
        await clearPendingEntry(item.id)
        showToast("Queued entry from earlier uploaded successfully.")
      } catch {
        // leave in queue, will retry next time we're online
      }
    }
    if (pending.length) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const { isOnline, pendingCount, refreshCount } = useOfflineQueue(flushQueue)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [entryData, freezeData] = await Promise.all([listEntries(), listStreakFreezes()])
      setEntries(entryData)
      setFreezeDates(freezeData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const streak = useMemo(() => computeStreak(entries, freezeDates), [entries, freezeDates])
  const missedYesterday = useMemo(() => {
    const y = new Date()
    y.setDate(y.getDate() - 1)
    const iso = new Date(y.getTime() - y.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    return !entries.some((e) => e.study_date === iso) && !freezeDates.includes(iso) && streak.current === 0 && entries.length > 0
  }, [entries, freezeDates, streak])

  function showToast(message) {
    setToast(message)
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSubmitEntry(payload) {
    setSaving(true)
    try {
      if (editingEntry) {
        await updateEntry(editingEntry.id, {
          focus_score: payload.focusScore,
          hours_studied: payload.hoursStudied,
          subject: payload.subject || null,
          note: payload.note || null,
        })
        showToast('Entry updated.')
      } else if (!isOnline) {
        await queuePendingEntry({
          file: payload.file,
          studyDate: today,
          focusScore: payload.focusScore,
          hoursStudied: payload.hoursStudied,
          subject: payload.subject,
          note: payload.note,
        })
        await refreshCount()
        showToast("You're offline — saved locally and will upload automatically once you reconnect.")
      } else {
        await createEntry({
          userId: user.id,
          file: payload.file,
          studyDate: today,
          focusScore: payload.focusScore,
          hoursStudied: payload.hoursStudied,
          subject: payload.subject,
          note: payload.note,
        })
        showToast('Logged today. Streak keeps going.')
      }
      setShowLogForm(false)
      setEditingEntry(null)
      await refresh()
    } catch (err) {
      showToast(err.message || 'Something went wrong saving your entry.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUseFreeze() {
    const y = new Date()
    y.setDate(y.getDate() - 1)
    const iso = new Date(y.getTime() - y.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    try {
      await useStreakFreeze(user.id, iso)
      showToast('Freeze used — your streak is protected.')
      await refresh()
    } catch {
      showToast('Could not apply a freeze right now.')
    }
  }

  function handleSelectDate(iso) {
    const entry = entries.find((e) => e.study_date === iso)
    if (entry) {
      setSelectedDate(entry)
    } else if (iso === today) {
      setShowLogForm(true)
    }
  }

  const selectedEntryDetail = entries.find((e) => e.id === selectedDate?.id)

  return (
    <div className="dash">
      <header className="dash-header">
        <div className="dash-header__brand">
          <span className="dash-header__mark" aria-hidden="true">◐</span>
          <span className="dash-header__title">studylog</span>
        </div>
        <div className="dash-header__actions">
          {!isOnline && <span className="dash-pill dash-pill--offline">Offline</span>}
          {pendingCount > 0 && <span className="dash-pill dash-pill--pending">{pendingCount} queued</span>}
          <button className="dash-signout" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <main className="dash-main">
        {missedYesterday && (
          <div className="freeze-banner">
            <p>Looks like yesterday slipped by. Use a streak freeze to protect your progress.</p>
            <button onClick={handleUseFreeze}>Use a freeze</button>
          </div>
        )}

        <section className="dash-today">
          <div className="dash-today__text">
            <p className="dash-today__eyebrow">{formatToday()}</p>
            <h1>{todaysEntry ? "Today's logged." : 'Show up today.'}</h1>
          </div>
          <button
            className="dash-today__cta"
            onClick={() => {
              setEditingEntry(null)
              setShowLogForm(true)
            }}
          >
            {todaysEntry ? 'Edit today' : 'Take today\'s photo'}
          </button>
        </section>

        <StatsPanel entries={entries} streak={streak} />

        <section className="dash-section">
          <h2 className="dash-section__title">Recent days</h2>
          <ContactSheet entries={entries} freezeDates={freezeDates} onSelectDate={handleSelectDate} />
        </section>

        <section className="dash-section">
          <h2 className="dash-section__title">Focus over time</h2>
          <FocusHeatmap entries={entries} onSelectDate={handleSelectDate} />
        </section>

        {!loading && entries.length === 0 && (
          <div className="dash-empty">
            <p>No entries yet. Take your first photo to start your log.</p>
          </div>
        )}
      </main>

      {showLogForm && (
        <LogEntryForm
          date={editingEntry?.study_date || today}
          existing={editingEntry}
          submitting={saving}
          onSubmit={handleSubmitEntry}
          onClose={() => {
            setShowLogForm(false)
            setEditingEntry(null)
          }}
        />
      )}

      {selectedEntryDetail && (
        <DayDetail
          entry={selectedEntryDetail}
          allEntries={entries}
          onClose={() => setSelectedDate(null)}
          onDeleted={() => {
            setSelectedDate(null)
            refresh()
          }}
          onEdit={(entry) => {
            setSelectedDate(null)
            setEditingEntry(entry)
            setShowLogForm(true)
          }}
        />
      )}

      {toast && <div className="dash-toast">{toast}</div>}
    </div>
  )
}

function formatToday() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}
