/** Compact tabs (arrow keys move between them). */
import { useId, useRef, useState, type ReactNode } from 'react'

export function Tabs({ tabs, label, initial }: { tabs: { id: string; label: string; body: ReactNode }[]; label: string; initial?: string }) {
  const [cur, setCur] = useState(initial ?? tabs[0]?.id)
  const uid = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const idx = Math.max(0, tabs.findIndex((t) => t.id === cur))
  const go = (i: number) => {
    const n = (i + tabs.length) % tabs.length
    setCur(tabs[n].id)
    refs.current[n]?.focus()
  }
  return (
    <div className="tabs2">
      <div role="tablist" aria-label={label} className="tablist">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { refs.current[i] = el }}
            role="tab"
            id={`${uid}-t-${t.id}`}
            aria-selected={i === idx}
            aria-controls={`${uid}-p`}
            tabIndex={i === idx ? 0 : -1}
            className={i === idx ? 'on' : ''}
            onClick={() => setCur(t.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1) }
              if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1) }
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${uid}-p`} aria-labelledby={`${uid}-t-${tabs[idx]?.id}`} className="tabpanel">
        {tabs[idx]?.body}
      </div>
    </div>
  )
}
