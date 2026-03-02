import { useState, useEffect } from 'react'
import { TranscriptionRecord, getHistory, deleteFromHistory, clearHistory, getHistoryStats } from '../lib/transcription-history'

interface HistoryViewProps {
  onClose?: () => void
}

const LANGUAGE_LABELS: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
}

export function HistoryView({ onClose }: HistoryViewProps) {
  const [history, setHistory] = useState<TranscriptionRecord[]>([])
  const [stats, setStats] = useState(getHistoryStats())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPinned, setIsPinned] = useState(false)

  useEffect(() => {
    setHistory(getHistory())
    setStats(getHistoryStats())
  }, [])

  const handleDelete = (id: string) => {
    deleteFromHistory(id)
    setHistory(getHistory())
    setStats(getHistoryStats())
    if (selectedId === id) {
      setSelectedId(null)
    }
  }

  const handleClearAll = () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử?')) {
      clearHistory()
      setHistory([])
      setStats(getHistoryStats())
    }
  }

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handlePinToggle = async () => {
    const newPinned = !isPinned
    setIsPinned(newPinned)
    await window.electronAPI.setHistoryPinned(newPinned)
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      window.electronAPI.closeHistory()
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <div className="history-header-left">
          <h2>Lịch sử Transcription</h2>
          <span className="history-count">{history.length} bản ghi</span>
        </div>
        <div className="history-header-actions">
          <button
            className={`history-pin-btn ${isPinned ? 'pinned' : ''}`}
            onClick={handlePinToggle}
            title={isPinned ? 'Bỏ ghim khỏi trên cùng' : 'Ghim lên trên cùng'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L12 12" />
              <path d="M18.5 8L18.5 13.5" />
              <path d="M5.5 8L5.5 13.5" />
              <path d="M12 22L12 12" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </button>
          <button className="history-close-btn" onClick={handleClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="history-stats">
        <div className="history-stat-item">
          <span className="history-stat-value">{stats.totalTranscriptions}</span>
          <span className="history-stat-label">Tổng bản ghi</span>
        </div>
        <div className="history-stat-item">
          <span className="history-stat-value">{stats.totalWords}</span>
          <span className="history-stat-label">Tổng từ</span>
        </div>
        <div className="history-stat-item">
          <span className="history-stat-value">{stats.avgWordsPerTranscription}</span>
          <span className="history-stat-label">TB từ/bản</span>
        </div>
        <div className="history-stat-item">
          <span className="history-stat-value">{stats.todayCount}</span>
          <span className="history-stat-label">Hôm nay</span>
        </div>
      </div>

      {/* History List */}
      <div className="history-list">
        {history.length === 0 ? (
          <div className="history-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Chưa có bản ghi nào</p>
            <span>Bắt đầu sử dụng để ghi lại lịch sử</span>
          </div>
        ) : (
          history.map((record) => (
            <div
              key={record.id}
              className={`history-item ${selectedId === record.id ? 'selected' : ''}`}
              onClick={() => setSelectedId(record.id)}
            >
              <div className="history-item-header">
                <div className="history-item-meta">
                  <span className="history-lang-badge">{LANGUAGE_LABELS[record.language] || record.language}</span>
                  <span className="history-duration">{formatDuration(record.duration)}</span>
                  <span className="history-date">{formatDate(record.timestamp)}</span>
                </div>
                <div className="history-item-actions">
                  <button
                    className="history-action-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopyText(record.finalText || record.originalText)
                    }}
                    title="Copy"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                    </svg>
                  </button>
                  <button
                    className="history-action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(record.id)
                    }}
                    title="Xóa"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="history-item-text">
                {record.finalText || record.originalText}
              </div>
              <div className="history-item-footer">
                <span className="history-word-count">{record.wordCount} từ</span>
                {record.finalText && record.finalText !== record.originalText && (
                  <span className="history-edited">Đã chỉnh sửa</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {history.length > 0 && (
        <div className="history-footer">
          <button className="history-clear-btn" onClick={handleClearAll}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
            </svg>
            Xóa toàn bộ
          </button>
        </div>
      )}
    </div>
  )
}
