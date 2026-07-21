import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function InfoButton({ explanation, title }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const [pos, setPos] = useState(null)

  useEffect(() => {
    if (!open) { setPos(null); return }
    const update = () => {
      if (!btnRef.current) return
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left + rect.width / 2 })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return
      if (e.target.closest('[data-info-popover]')) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!explanation) return null

  return (
    <>
      <button ref={btnRef}
        className="opacity-0 group-hover:opacity-100 text-slate-300 dark:text-slate-600 hover:text-brand-500 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-full w-4 h-4 flex items-center justify-center text-[10px] leading-none shrink-0 transition-colors"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        title={title || 'Explicar esta regla'}
      >ⓘ</button>
      {open && pos && createPortal(
        <div data-info-popover
          className="fixed z-[100] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-500 rounded-lg shadow-xl py-1.5 px-3 max-w-xs"
          style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
        >
          <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-200">
            {explanation}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
