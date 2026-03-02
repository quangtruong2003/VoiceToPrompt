/**
 * Transcription History Storage
 * Uses localStorage to persist transcription history
 */

export interface TranscriptionRecord {
  id: string
  timestamp: number
  duration: number
  language: string
  originalText: string
  finalText?: string
  wordCount: number
}

const STORAGE_KEY = 'voice-to-text-history'
const MAX_HISTORY_ITEMS = 100

export function getHistory(): TranscriptionRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Failed to load history:', e)
  }
  return []
}

export function addToHistory(record: Omit<TranscriptionRecord, 'id' | 'timestamp'>): TranscriptionRecord {
  const newRecord: TranscriptionRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  }

  const history = getHistory()
  history.unshift(newRecord)

  // Keep only the most recent items
  const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory))
  } catch (e) {
    console.error('Failed to save history:', e)
  }

  return newRecord
}

export function updateHistoryRecord(id: string, updates: Partial<TranscriptionRecord>): boolean {
  const history = getHistory()
  const index = history.findIndex(r => r.id === id)

  if (index === -1) return false

  history[index] = { ...history[index], ...updates }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    return true
  } catch (e) {
    console.error('Failed to update history:', e)
    return false
  }
}

export function deleteFromHistory(id: string): boolean {
  const history = getHistory()
  const filteredHistory = history.filter(r => r.id !== id)

  if (filteredHistory.length === history.length) return false

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredHistory))
    return true
  } catch (e) {
    console.error('Failed to delete from history:', e)
    return false
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.error('Failed to clear history:', e)
  }
}

export function getHistoryStats(): {
  totalTranscriptions: number
  totalWords: number
  avgWordsPerTranscription: number
  mostUsedLanguage: string
  todayCount: number
  weekCount: number
} {
  const history = getHistory()

  if (history.length === 0) {
    return {
      totalTranscriptions: 0,
      totalWords: 0,
      avgWordsPerTranscription: 0,
      mostUsedLanguage: 'N/A',
      todayCount: 0,
      weekCount: 0,
    }
  }

  const totalWords = history.reduce((sum, r) => sum + r.wordCount, 0)
  const languageCounts: Record<string, number> = {}

  const now = Date.now()
  const todayStart = new Date().setHours(0, 0, 0, 0)
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000

  let todayCount = 0
  let weekCount = 0

  history.forEach(r => {
    languageCounts[r.language] = (languageCounts[r.language] || 0) + 1

    if (r.timestamp >= todayStart) {
      todayCount++
    }
    if (r.timestamp >= weekStart) {
      weekCount++
    }
  })

  const mostUsedLanguage = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

  return {
    totalTranscriptions: history.length,
    totalWords,
    avgWordsPerTranscription: Math.round(totalWords / history.length),
    mostUsedLanguage,
    todayCount,
    weekCount,
  }
}
