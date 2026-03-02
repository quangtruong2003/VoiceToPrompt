import { useState, useEffect, useCallback } from 'react'

interface TextEditorModalProps {
  isOpen: boolean
  initialText: string
  onConfirm: (editedText: string) => void
  onCancel: () => void
}

export function TextEditorModal({ isOpen, initialText, onConfirm, onCancel }: TextEditorModalProps) {
  const [text, setText] = useState(initialText)

  useEffect(() => {
    if (isOpen) {
      setText(initialText)
    }
  }, [isOpen, initialText])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    } else if (e.key === 'Enter' && e.ctrlKey) {
      onConfirm(text.trim())
    }
  }, [onCancel, onConfirm, text])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content text-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Chỉnh sửa văn bản</h3>
          <button className="modal-close" onClick={onCancel} title="Đóng (Esc)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <textarea
            className="text-editor-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Văn bản sau khi chuyển đổi..."
            autoFocus
            rows={8}
          />
          <div className="text-editor-hint">
            Nhấn <kbd>Ctrl</kbd>+<kbd>Enter</kbd> để xác nhận, <kbd>Esc</kbd> để hủy
          </div>
        </div>

        <div className="modal-footer">
          <div className="modal-footer-left">
            <span className="word-count">{text.split(/\s+/).filter(Boolean).length} từ</span>
            <span className="char-count">{text.length} ký tự</span>
          </div>
          <div className="modal-footer-right">
            <button className="btn btn-ghost" onClick={onCancel}>
              Hủy
            </button>
            <button className="btn btn-primary" onClick={() => onConfirm(text.trim())}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Xác nhận & Paste
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
