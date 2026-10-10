/** The circuit switcher: one custom listbox, grouped quietly, keyboard friendly (arrows, Home/End, type to jump, Esc). */
import { useEffect, useId, useRef, useState } from 'react'

export type PickItem = { id: string; name: string; desc: string; group: string }

export function CircuitPicker({ items, value, onChange }: { items: PickItem[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(() => Math.max(0, items.findIndex((i) => i.id === value)))
  const root = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const typed = useRef({ s: '', t: 0 })
  const uid = useId()
  const cur = items.find((i) => i.id === value) ?? items[0]
  const groups = [...new Set(items.map((i) => i.group))]

  const openList = (at?: number) => {
    setActive(at ?? Math.max(0, items.findIndex((i) => i.id === value)))
    setOpen(true)
  }
  const close = (focusBtn = true) => {
    setOpen(false)
    if (focusBtn) btn.current?.focus()
  }
  const pick = (i: number) => {
    onChange(items[i].id)
    close()
  }

  useEffect(() => {
    if (!open) return
    list.current?.focus()
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  useEffect(() => {
    if (open) document.getElementById(`${uid}-o-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active, uid])

  const onListKey = (e: React.KeyboardEvent) => {
    const n = items.length
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % n) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + n) % n) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(n - 1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(active) }
    else if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'Tab') setOpen(false)
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now()
      typed.current = { s: (now - typed.current.t > 600 ? '' : typed.current.s) + e.key.toLowerCase(), t: now }
      const hit = items.findIndex((i) => i.name.toLowerCase().startsWith(typed.current.s))
      if (hit >= 0) setActive(hit)
    }
  }

  return (
    <div className={'picker' + (open ? ' open' : '')} ref={root}>
      <button
        ref={btn}
        className="picker-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${uid}-list`}
        onClick={() => (open ? close() : openList())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openList() }
        }}
      >
        <span className="picker-label">
          <span className="picker-name">{cur.name}</span>
          <span className="picker-desc">{cur.desc}</span>
        </span>
        <svg className="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" /></svg>
      </button>
      {open && (
        <div
          className="picker-pop"
          id={`${uid}-list`}
          role="listbox"
          ref={list}
          tabIndex={-1}
          aria-label="Choose a circuit"
          aria-activedescendant={`${uid}-o-${active}`}
          onKeyDown={onListKey}
        >
          {groups.map((g) => (
            <div role="group" aria-label={g} key={g} className="picker-group">
              <div className="picker-ghead" aria-hidden="true">{g}</div>
              {items.map((it, i) =>
                it.group !== g ? null : (
                  <div
                    key={it.id}
                    id={`${uid}-o-${i}`}
                    role="option"
                    aria-selected={it.id === value}
                    className={'picker-opt' + (i === active ? ' active' : '') + (it.id === value ? ' cur' : '')}
                    onPointerEnter={() => setActive(i)}
                    onClick={() => pick(i)}
                  >
                    <span className="picker-name">{it.name}</span>
                    <span className="picker-desc">{it.desc}</span>
                    {it.id === value && <svg className="tick" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5 5 9l5-6" /></svg>}
                  </div>
                ),
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
