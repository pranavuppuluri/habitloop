import { useEffect, useRef, type ReactNode } from 'react'
import { Close } from './icons'

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function Sheet({ title, onClose, children, footer, wide }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Move focus into the dialog so keyboard users land inside it, not behind it.
    panel.current?.querySelector<HTMLElement>('input, textarea, button')?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={wide ? 'sheet is-wide' : 'sheet'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panel}
      >
        <header className="sheet-head">
          <h2 className="sheet-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Close />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </div>
    </div>
  )
}
