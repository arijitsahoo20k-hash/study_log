import { useCallback, useEffect, useState } from 'react'

const DB_NAME = 'studylog-queue'
const STORE = 'pending-entries'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore(mode, fn) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const store = tx.objectStore(STORE)
    const result = fn(store)
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
  })
}

export async function queuePendingEntry(payload) {
  await withStore('readwrite', (store) => store.add(payload))
}

export async function getPendingEntries() {
  return withStore('readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }).then((r) => r)
}

export async function clearPendingEntry(id) {
  await withStore('readwrite', (store) => store.delete(id))
}

/** Tracks online/offline state and exposes how many uploads are queued. */
export function useOfflineQueue(onFlush) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)

  const refreshCount = useCallback(async () => {
    try {
      const all = await getPendingEntries()
      setPendingCount(all.length)
    } catch {
      setPendingCount(0)
    }
  }, [])

  useEffect(() => {
    refreshCount()
    function goOnline() {
      setIsOnline(true)
      onFlush?.()
    }
    function goOffline() {
      setIsOnline(false)
    }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { isOnline, pendingCount, refreshCount }
}
