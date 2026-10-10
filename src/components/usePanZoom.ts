/** Pointer + wheel pan/zoom for an SVG viewBox. Taps still click; drags and pinches don't. */
import { useCallback, useEffect, useRef, useState } from 'react'

export type VB = [number, number, number, number]

export function usePanZoom(initial: VB) {
  const [vb, setVb] = useState<VB>(initial)
  const svg = useRef<SVGSVGElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const moved = useRef(0)
  const pinch = useRef<{ d: number; vb: VB; cx: number; cy: number } | null>(null)
  const key = initial.join(',')

  useEffect(() => setVb(initial), [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const toUnits = useCallback((dxPx: number, dyPx: number, v: VB) => {
    const el = svg.current
    if (!el) return [0, 0]
    const r = el.getBoundingClientRect()
    const s = Math.max(v[2] / r.width, v[3] / r.height)
    return [dxPx * s, dyPx * s]
  }, [])

  const zoomAt = useCallback((factor: number, clientX?: number, clientY?: number) => {
    setVb((v) => {
      const el = svg.current
      const r = el?.getBoundingClientRect()
      const fx = r && clientX !== undefined ? (clientX - r.left) / r.width : 0.5
      const fy = r && clientY !== undefined ? (clientY - r.top) / r.height : 0.5
      const w = Math.min(initial[2] * 1.5, Math.max(initial[2] / 8, v[2] * factor))
      const h = (w / v[2]) * v[3]
      return [v[0] + (v[2] - w) * fx, v[1] + (v[3] - h) * fy, w, h]
    })
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = svg.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      e.preventDefault()
      zoomAt(Math.exp(e.deltaY * 0.0015), e.clientX, e.clientY)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) moved.current = 0
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), vb, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const cur = { x: e.clientX, y: e.clientY }
    pointers.current.set(e.pointerId, cur)
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      moved.current += 10
      const p = pinch.current
      const factor = p.d / Math.max(10, d)
      const el = svg.current!.getBoundingClientRect()
      const fx = (p.cx - el.left) / el.width, fy = (p.cy - el.top) / el.height
      const w = Math.min(initial[2] * 1.5, Math.max(initial[2] / 8, p.vb[2] * factor))
      const h = (w / p.vb[2]) * p.vb[3]
      setVb([p.vb[0] + (p.vb[2] - w) * fx, p.vb[1] + (p.vb[3] - h) * fy, w, h])
      return
    }
    const dx = cur.x - prev.x, dy = cur.y - prev.y
    moved.current += Math.abs(dx) + Math.abs(dy)
    if (moved.current < 6) return
    if (!svg.current?.hasPointerCapture(e.pointerId)) svg.current?.setPointerCapture(e.pointerId)
    setVb((v) => {
      const [ux, uy] = toUnits(dx, dy, v)
      return [v[0] - ux, v[1] - uy, v[2], v[3]]
    })
  }
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }
  /** Swallow the click that ends a drag. */
  const onClickCapture = (e: React.MouseEvent) => {
    if (moved.current >= 6) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  return {
    svg,
    vb,
    reset: () => setVb(initial),
    zoomIn: () => zoomAt(0.7),
    zoomOut: () => zoomAt(1.4),
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClickCapture },
  }
}
