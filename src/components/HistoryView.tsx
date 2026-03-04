import { useState, useEffect } from 'react'
import { TranscriptionRecord, getHistory, deleteFromHistory, clearHistory, getHistoryStats } from '../lib/transcription-history'
import { useI18n } from '../i18n'

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
  const { t } = useI18n()
  const [history, setHistory] = useState<TranscriptionRecord[]>([])
  const [stats, setStats] = useState(getHistoryStats())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPinned, setIsPinned] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const loadData = () => {
    setHistory(getHistory())
    setStats(getHistoryStats())
  }

  useEffect(() => {
    loadData()
    window.addEventListener('storage', loadData)
    window.addEventListener('focus', loadData)
    return () => {
      window.removeEventListener('storage', loadData)
      window.removeEventListener('focus', loadData)
    }
  }, [])

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteFromHistory(id)
    if (expandedId === id) setExpandedId(null)
    loadData()
    showToast('Đã xóa bản ghi')
  }

  const handleClearAll = () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử?')) {
      clearHistory()
      setHistory([])
      setStats(getHistoryStats())
      setExpandedId(null)
      showToast('Đã xóa tất cả bản ghi')
    }
  }

  const handleCopyText = async (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  const handlePinToggle = async () => {
    if (!window.electronAPI) return
    const newPinned = !isPinned
    setIsPinned(newPinned)
    await window.electronAPI.setHistoryPinned(newPinned)
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else if (window.electronAPI) {
      window.electronAPI.closeHistory()
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = date.toDateString() === yesterday.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
    if (isYesterday) {
      return 'Hôm qua'
    }
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  }

  const filteredHistory = searchQuery.trim()
    ? history.filter(record => {
      const text = (record.finalText || record.originalText).toLowerCase()
      return text.includes(searchQuery.toLowerCase())
    })
    : history

  return (
    <div className="hist-container">
      {/* Header */}
      <div className="hist-header">
        <div className="hist-header-left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="hist-title">Lịch sử</span>
          {history.length > 0 && (
            <span className="hist-count">{history.length}</span>
          )}
        </div>
        <div className="hist-header-right">
          <button
            className={`hist-btn-icon ${isPinned ? 'active' : ''}`}
            onClick={handlePinToggle}
            title={isPinned ? 'Bỏ ghim' : 'Ghim lên trên'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
            </svg>
          </button>
          <button className="hist-btn-icon close" onClick={handleClose} title="Đóng">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="hist-search-wrap">
        <svg className="hist-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          className="hist-search-input"
          placeholder="Tìm kiếm..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="hist-search-clear" onClick={() => setSearchQuery('')}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* List */}
      <div className="hist-list">
        {filteredHistory.length === 0 ? (
          <div className="hist-empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)', marginBottom: 8 }}>
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có bản ghi nào'}</span>
          </div>
        ) : (
          filteredHistory.map((record) => {
            const text = record.finalText || record.originalText
            const isExpanded = expandedId === record.id
            const isCopied = copiedId === record.id

            return (
              <div
                key={record.id}
                className={`hist-item ${isExpanded ? 'expanded' : ''}`}
                onClick={() => setExpandedId(isExpanded ? null : record.id)}
              >
                <div className={`hist-item-text ${isExpanded ? '' : 'truncated'}`}>
                  {text}
                </div>

                <div className="hist-item-footer">
                  <div className="hist-item-meta">
                    <span className="hist-meta-date">{formatDate(record.timestamp)}</span>
                    <span className="hist-meta-sep">·</span>
                    <span className="hist-meta-lang">{LANGUAGE_LABELS[record.language] || record.language}</span>
                    <span className="hist-meta-sep">·</span>
                    <span className="hist-meta-words">{record.wordCount} từ</span>
                  </div>

                  <div className="hist-item-actions">
                    <button
                      className={`hist-action-btn ${isCopied ? 'copied' : ''}`}
                      onClick={(e) => handleCopyText(e, text, record.id)}
                      title="Sao chép"
                    >
                      {isCopied ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      )}
                    </button>
                    <button
                      className="hist-action-btn delete"
                      onClick={(e) => handleDelete(e, record.id)}
                      title="Xóa"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {isExpanded && record.finalText && record.finalText !== record.originalText && (
                  <div className="hist-edited-badge">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Đã tự động chỉnh sửa
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      {history.length > 0 && (
        <div className="hist-footer">
          <button className="hist-clear-btn" onClick={handleClearAll}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Xóa tất cả
          </button>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="history-toast">{toastMessage}</div>
      )}
    </div>
  )
}
