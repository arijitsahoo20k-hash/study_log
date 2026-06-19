import { supabase } from './supabaseClient'
import { compressImage, blobToFile } from './imageUtils'

const BUCKET = 'study-photos'
const SIGNED_URL_TTL = 60 * 10 // 10 minutes — just enough to render, never persisted

function todayISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function dateOnly(date) {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Upload a captured/selected photo and create the day's entry. */
export async function createEntry({ userId, file, studyDate, focusScore, hoursStudied, subject, note }) {
  const date = studyDate || todayISO()
  const compressed = await compressImage(file)
  const fileName = blobToFile(compressed, `${date}-${Date.now()}.jpg`)
  const path = `${userId}/${fileName.name}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, fileName, { contentType: 'image/jpeg', upsert: false })

  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('entries')
    .insert({
      user_id: userId,
      study_date: date,
      photo_path: path,
      focus_score: focusScore,
      hours_studied: hoursStudied,
      subject: subject || null,
      note: note || null,
    })
    .select()
    .single()

  if (error) {
    // roll back the orphaned file if the row insert failed (e.g. duplicate day)
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }

  return data
}

export async function updateEntry(id, fields) {
  const { data, error } = await supabase
    .from('entries')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEntry(entry) {
  const { error: dbError } = await supabase.from('entries').delete().eq('id', entry.id)
  if (dbError) throw dbError
  await supabase.storage.from(BUCKET).remove([entry.photo_path])
}

export async function listEntries({ from, to } = {}) {
  let query = supabase.from('entries').select('*').order('study_date', { ascending: false })
  if (from) query = query.gte('study_date', from)
  if (to) query = query.lte('study_date', to)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getEntryByDate(date) {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('study_date', date)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Resolve a short-lived signed URL for a private photo path. Never cache long-term. */
export async function getSignedUrl(path) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL)
  if (error) throw error
  return data.signedUrl
}

export async function getSignedUrls(paths) {
  if (paths.length === 0) return {}
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL)
  if (error) throw error
  const map = {}
  data.forEach((d, i) => {
    map[paths[i]] = d.signedUrl
  })
  return map
}

export async function useStreakFreeze(userId, date) {
  const { error } = await supabase
    .from('streak_freezes')
    .insert({ user_id: userId, used_on_date: date })
  if (error) throw error
}

export async function listStreakFreezes() {
  const { data, error } = await supabase.from('streak_freezes').select('used_on_date')
  if (error) throw error
  return data.map((r) => r.used_on_date)
}

/**
 * Computes current streak, longest streak, and freeze-eligibility.
 * A streak continues across a gap day only if a freeze was explicitly used for that date.
 */
export function computeStreak(entries, freezeDates) {
  const dateSet = new Set(entries.map((e) => e.study_date))
  const freezeSet = new Set(freezeDates)

  let current = 0
  let cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  // If today has no entry yet, start checking from yesterday so the
  // streak doesn't appear broken before the day is even over.
  if (!dateSet.has(dateOnly(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  while (true) {
    const iso = dateOnly(cursor)
    if (dateSet.has(iso)) {
      current += 1
    } else if (freezeSet.has(iso)) {
      // frozen day: doesn't break the streak, doesn't add to it either
    } else {
      break
    }
    cursor.setDate(cursor.getDate() - 1)
  }

  // Longest streak across all history
  const sorted = [...dateSet].sort()
  let longest = 0
  let run = 0
  let prev = null
  for (const iso of sorted) {
    if (prev) {
      const diff = (new Date(iso) - new Date(prev)) / 86400000
      if (diff === 1 || (diff > 1 && allFrozen(prev, iso, freezeSet))) {
        run += 1
      } else {
        run = 1
      }
    } else {
      run = 1
    }
    longest = Math.max(longest, run)
    prev = iso
  }

  return { current, longest }
}

function allFrozen(fromISO, toISO, freezeSet) {
  const from = new Date(fromISO)
  const to = new Date(toISO)
  const cursor = new Date(from)
  cursor.setDate(cursor.getDate() + 1)
  while (cursor < to) {
    if (!freezeSet.has(dateOnly(cursor))) return false
    cursor.setDate(cursor.getDate() + 1)
  }
  return true
}

export { todayISO, dateOnly }
