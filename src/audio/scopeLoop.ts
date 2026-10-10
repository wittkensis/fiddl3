/** One RAF loop: big scope + spectrum for the probe, tiny scopes for every probe point. */
import type { Engine } from './engine'

const buf = new Float32Array(2048)
const fbuf = new Float32Array(1024)

export function startScopeLoop(opts: {
  engine: Engine
  getProbe: () => string
  canvas: () => HTMLCanvasElement | null
  minis: Map<string, SVGPolylineElement>
  miniOn: () => boolean
  zoom: () => number
  /** Optional second scope showing what goes in (the input point). */
  inCanvas?: () => HTMLCanvasElement | null
  inputId?: string
  /** Extra per-frame work (blinking LEDs). */
  onFrame?: () => void
}): () => void {
  let raf = 0
  let frame = 0
  const tick = () => {
    raf = requestAnimationFrame(tick)
    if (document.hidden || !opts.engine.running) return
    frame++
    drawMain(opts)
    if (opts.inCanvas && opts.inputId) drawIn(opts.inCanvas(), opts.engine.analyser(opts.inputId), opts.zoom())
    opts.onFrame?.()
    if (opts.miniOn() && frame % 2 === 0) drawMinis(opts.engine, opts.minis)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

function trigger(data: Float32Array, span: number) {
  for (let i = 1; i < data.length - span; i++) if (data[i - 1] <= 0 && data[i] > 0) return i
  return 0
}

function drawMain(o: Parameters<typeof startScopeLoop>[0]) {
  const c = o.canvas()
  const an = o.engine.analyser(o.getProbe())
  if (!c || !an) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const W = c.clientWidth
  const H = c.clientHeight
  if (!W || !H) return
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
    c.width = Math.round(W * dpr)
    c.height = Math.round(H * dpr)
  }
  const g = c.getContext('2d')!
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.fillStyle = '#0a0c09'
  g.fillRect(0, 0, W, H)
  const slim = H < 90
  const scopeH = slim ? H : H * 0.64
  // grid
  g.strokeStyle = '#1d2419'
  g.lineWidth = 1
  for (let i = 1; i < 8; i++) {
    g.beginPath()
    g.moveTo((W * i) / 8, 0)
    g.lineTo((W * i) / 8, scopeH)
    g.stroke()
  }
  g.beginPath()
  g.moveTo(0, scopeH / 2)
  g.lineTo(W, scopeH / 2)
  g.stroke()
  // wave
  an.getFloatTimeDomainData(buf)
  const span = Math.floor(256 + 1536 * o.zoom())
  const t0 = trigger(buf, span)
  g.strokeStyle = '#c8ff5a'
  g.lineWidth = 2
  g.beginPath()
  let peak = 0
  for (let i = 0; i < span; i++) {
    const v = buf[t0 + i] ?? 0
    peak = Math.max(peak, Math.abs(v))
    const x = (i / (span - 1)) * W
    const y = scopeH / 2 - v * scopeH * 0.45
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.stroke()
  if (slim) return
  // spectrum (log freq 30 Hz..12 kHz)
  an.getFloatFrequencyData(fbuf)
  const sr = an.context.sampleRate
  const top = scopeH + 6
  const sh = H - top
  g.fillStyle = '#10140e'
  g.fillRect(0, top, W, sh)
  g.beginPath()
  g.moveTo(0, H)
  const lo = Math.log(30)
  const hi = Math.log(12000)
  for (let x = 0; x <= W; x += 2) {
    const f = Math.exp(lo + ((hi - lo) * x) / W)
    const bin = Math.min(fbuf.length - 1, Math.round((f / (sr / 2)) * fbuf.length))
    const db = Math.max(-100, Math.min(-10, fbuf[bin]))
    g.lineTo(x, top + sh * ((-10 - db) / 90))
  }
  g.lineTo(W, H)
  g.closePath()
  g.fillStyle = 'rgba(255,170,60,0.55)'
  g.fill()
  g.fillStyle = '#6c7a62'
  g.font = '10px IBM Plex Mono, monospace'
  for (const [f, lab] of [[100, '100'], [1000, '1k'], [10000, '10k']] as const) {
    const x = ((Math.log(f) - lo) / (hi - lo)) * W
    g.fillText(lab, x + 2, H - 3)
  }
  g.fillText(`peak ${peak.toFixed(2)}`, 6, 12)
}

/** The input pane: same trigger and zoom as the output so you can compare shapes. */
function drawIn(c: HTMLCanvasElement | null, an: AnalyserNode | null, zoom: number) {
  if (!c || !an) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const W = c.clientWidth
  const H = c.clientHeight
  if (!W || !H) return
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
    c.width = Math.round(W * dpr)
    c.height = Math.round(H * dpr)
  }
  const g = c.getContext('2d')!
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.fillStyle = '#0a0c09'
  g.fillRect(0, 0, W, H)
  g.strokeStyle = '#1d2419'
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(0, H / 2)
  g.lineTo(W, H / 2)
  g.stroke()
  an.getFloatTimeDomainData(buf)
  const span = Math.floor(256 + 1536 * zoom)
  const t0 = trigger(buf, span)
  g.strokeStyle = '#d9e0cf'
  g.lineWidth = 1.6
  g.beginPath()
  for (let i = 0; i < span; i++) {
    const v = buf[t0 + i] ?? 0
    const x = (i / (span - 1)) * W
    const y = H / 2 - v * H * 0.45
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.stroke()
}

function drawMinis(engine: Engine, minis: Map<string, SVGPolylineElement>) {
  for (const [id, el] of minis) {
    const an = engine.analyser(id)
    if (!an || !el.isConnected) continue
    an.getFloatTimeDomainData(buf)
    const w = Number(el.dataset.w) || 100
    const span = 700
    const t0 = trigger(buf, span)
    const n = 64
    let pts = ''
    for (let i = 0; i < n; i++) {
      const v = buf[t0 + Math.floor((i / (n - 1)) * (span - 1))] ?? 0
      pts += `${((i / (n - 1)) * w).toFixed(1)},${(-Math.max(-1, Math.min(1, v)) * 13).toFixed(1)} `
    }
    el.setAttribute('points', pts)
  }
}

/** RMS per probe point, for headless tests. */
export function probeLevels(engine: Engine): Record<string, number> {
  const out: Record<string, number> = {}
  for (const id of engine.debug().points) {
    const an = engine.analyser(id)
    if (!an) continue
    an.getFloatTimeDomainData(buf)
    let s = 0
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]
    out[id] = Math.sqrt(s / buf.length)
  }
  return out
}

/** Peak/RMS per probe point (crest factor): ~1 = squared off, ~1.4 = sine, higher = spiky/clean pluck. */
export function probeCrest(engine: Engine): Record<string, number> {
  const out: Record<string, number> = {}
  for (const id of engine.debug().points) {
    const an = engine.analyser(id)
    if (!an) continue
    an.getFloatTimeDomainData(buf)
    let s = 0
    let pk = 0
    for (let i = 0; i < buf.length; i++) {
      s += buf[i] * buf[i]
      pk = Math.max(pk, Math.abs(buf[i]))
    }
    const rms = Math.sqrt(s / buf.length)
    out[id] = rms > 1e-5 ? pk / rms : 0
  }
  return out
}

/** Rough pitch per probe point from upward zero crossings (test hook: proves a value change moved the pitch). */
export function probePitch(engine: Engine): Record<string, number> {
  const out: Record<string, number> = {}
  for (const id of engine.debug().points) {
    const an = engine.analyser(id)
    if (!an) continue
    const b = new Float32Array(an.fftSize)
    an.getFloatTimeDomainData(b)
    let ups = 0
    for (let i = 1; i < b.length; i++) if (b[i - 1] < 0 && b[i] >= 0) ups++
    out[id] = (ups * an.context.sampleRate) / b.length
  }
  return out
}
