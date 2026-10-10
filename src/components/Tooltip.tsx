/** One delegated tooltip for anything with data-tip. Mouse: short hover delay. Touch: long-press. Keyboard: on focus. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

type Tip = { text: string; x: number; y: number; below: boolean }

export function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null)
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let timer = 0
    let hideTimer = 0
    let cur: Element | null = null
    let last = { x: 0, y: 0 }
    let press: { x: number; y: number; el: Element } | null = null
    const find = (t: EventTarget | null) => (t instanceof Element ? t.closest('[data-tip]') : null)
    const hide = () => {
      clearTimeout(timer)
      cur = null
      setTip(null)
    }
    const showAt = (target: Element, x: number, y: number, below = true) => {
      const text = target.getAttribute('data-tip')
      if (text) setTip({ text, x, y, below })
    }
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const t = find(e.target)
      if (t === cur) return
      cur = t
      clearTimeout(timer)
      setTip(null)
      if (t) timer = window.setTimeout(() => showAt(t, last.x, last.y), 380)
    }
    const move = (e: PointerEvent) => {
      last = { x: e.clientX, y: e.clientY }
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) {
        clearTimeout(timer)
        press = null
      }
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        hide()
        return
      }
      const t = find(e.target)
      clearTimeout(timer)
      clearTimeout(hideTimer)
      setTip(null)
      if (!t) return
      press = { x: e.clientX, y: e.clientY, el: t }
      timer = window.setTimeout(() => {
        if (press) showAt(press.el, press.x, press.y - 56, false)
      }, 450)
    }
    const up = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return
      clearTimeout(timer)
      press = null
      hideTimer = window.setTimeout(() => setTip(null), 1400)
    }
    const focus = (e: FocusEvent) => {
      const t = find(e.target)
      if (!t || !(e.target as Element).matches(':focus-visible')) return
      const r = t.getBoundingClientRect()
      clearTimeout(timer)
      timer = window.setTimeout(() => showAt(t, r.left + r.width / 2, r.bottom), 300)
    }
    const ctx = (e: Event) => {
      if (press) e.preventDefault()
    }
    document.addEventListener('pointerover', over)
    document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerdown', down)
    document.addEventListener('pointerup', up)
    document.addEventListener('pointercancel', up)
    document.addEventListener('focusin', focus)
    document.addEventListener('focusout', hide)
    document.addEventListener('scroll', hide, true)
    document.addEventListener('contextmenu', ctx)
    window.addEventListener('blur', hide)
    return () => {
      clearTimeout(timer)
      clearTimeout(hideTimer)
      document.removeEventListener('pointerover', over)
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('pointerup', up)
      document.removeEventListener('pointercancel', up)
      document.removeEventListener('focusin', focus)
      document.removeEventListener('focusout', hide)
      document.removeEventListener('scroll', hide, true)
      document.removeEventListener('contextmenu', ctx)
      window.removeEventListener('blur', hide)
    }
  }, [])

  // keep it on screen
  useLayoutEffect(() => {
    const d = el.current
    if (!d || !tip) return
    const r = d.getBoundingClientRect()
    let x = tip.x + 12
    let y = tip.below ? tip.y + 18 : tip.y
    if (x + r.width > window.innerWidth - 8) x = Math.max(8, tip.x - r.width - 12)
    if (y + r.height > window.innerHeight - 8) y = tip.y - r.height - 10
    d.style.transform = `translate(${Math.round(x)}px, ${Math.round(Math.max(8, y))}px)`
    d.style.opacity = '1'
  }, [tip])

  if (!tip) return null
  return (
    <div ref={el} className="tip" role="tooltip">
      {tip.text}
    </div>
  )
}
