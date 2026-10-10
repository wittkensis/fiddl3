/** Physical footprints: pin positions + body boxes in board units (0.1 inch = 20). */
import type { BoardPart } from '../types'

export type Pt = [number, number]

export function rotate([x, y]: Pt, rot = 0): Pt {
  switch (rot) {
    case 90: return [-y, x]
    case 180: return [-x, -y]
    case 270: return [y, -x]
    default: return [x, y]
  }
}

export function cpRadius(bp: BoardPart) {
  return (bp.span ?? 0) >= 30 || /220|470|100\u00b5/.test(bp.value ?? '') ? 24 : 13
}

export function localPins(bp: BoardPart): Record<string, Pt> {
  const s = bp.span
  switch (bp.fp) {
    case 'R':
    case 'D': {
      const h = (s ?? 80) / 2
      return { '1': [-h, 0], '2': [h, 0] }
    }
    case 'CC':
    case 'CF': {
      const h = (s ?? 20) / 2
      return { '1': [-h, 0], '2': [h, 0] }
    }
    case 'CP': return { '+': [-10, 0], '-': [10, 0] }
    case 'TO92': {
      const po = bp.pinout ?? 'EBC'
      return { [po[0]]: [-20, 0], [po[1]]: [0, 0], [po[2]]: [20, 0] }
    }
    case 'QCAN': return { E: [0, -21], B: [-24, 0], C: [0, 21] }
    case 'DIP': {
      const n = s ?? 8
      const half = n / 2
      const x0 = (-20 * (half - 1)) / 2
      const pins: Record<string, Pt> = {}
      for (let k = 1; k <= n; k++) pins[String(k)] = k <= half ? [x0 + 20 * (k - 1), 30] : [x0 + 20 * (n - k), -30]
      return pins
    }
    case 'POT': return { '1': [-40, 0], '2': [0, 0], '3': [40, 0] }
    case 'SWPOT': return { '1': [-40, 0], '2': [0, 0], '3': [40, 0], S1: [-14, -50], S2: [14, -50] }
    case 'TRIM': return { '1': [9, -21], '2': [-15, 0], '3': [9, 21] }
    case 'LDR': return { '1': [-10, 0], '2': [10, 0] }
    case 'LED': return { A: [-10, 0], K: [10, 0] }
    case 'JACK': return { T: [-20, 0], S: [20, 0] }
    case 'JACK3': return { T: [-25, 0], R: [0, 0], S: [25, 0] }
    case 'DCJ': return { S: [-30, 0], C: [0, 0], R: [30, 0] }
    case 'BAT': return { '+': [-14, 0], '-': [14, 0] }
    case 'FSW3': {
      const pins: Record<string, Pt> = {}
      for (let k = 1; k <= 9; k++) pins[String(k)] = [(((k - 1) % 3) - 1) * 37, (Math.floor((k - 1) / 3) - 1) * 37]
      return pins
    }
    case 'TOG':
    case 'JMP3': return { '1': [-20, 0], '2': [0, 0], '3': [20, 0] }
    case 'SPK': return { '+': [-14, 0], '-': [14, 0] }
    case 'XFMR': return { P1: [-35, -15], P2: [-35, 15], S1: [35, -15], S2: [35, 15] }
    case 'PAD': return { p: [0, 0] }
    case 'PUSH': return { '1': [-16, 0], '2': [16, 0] }
    case 'AMP': return { T: [-50, -12], S: [-50, 12] }
    default: return {}
  }
}

/** Local body box [x, y, w, h] before rotation. */
export function localBox(bp: BoardPart): [number, number, number, number] {
  const s = bp.span
  switch (bp.fp) {
    case 'R': case 'D': { const h = (s ?? 80) / 2; return [-h - 4, -10, 2 * h + 8, 20] }
    case 'CC': return [-17, -26, 34, 34]
    case 'CF': return [-17, -13, 34, 26]
    case 'CP': { const r = cpRadius(bp) + 3; return [-r, -r, 2 * r, 2 * r] }
    case 'TO92': return [-28, -26, 56, 34]
    case 'QCAN': return [-34, -34, 68, 68]
    case 'DIP': { const half = (s ?? 8) / 2; const w = half * 20 + 8; return [-w / 2, -42, w, 84] }
    case 'POT': case 'SWPOT': return [-50, -102, 100, 112]
    case 'TRIM': return [-26, -28, 48, 56]
    case 'LDR': case 'LED': return [-22, -22, 44, 44]
    case 'JACK': return [-36, -62, 72, 72]
    case 'JACK3': return [-42, -62, 84, 72]
    case 'DCJ': return [-46, -62, 92, 72]
    case 'BAT': return [-54, -114, 108, 124]
    case 'FSW3': return [-62, -62, 124, 124]
    case 'TOG': return [-32, -34, 64, 54]
    case 'JMP3': return [-30, -12, 60, 24]
    case 'SPK': return [-82, -172, 164, 184]
    case 'XFMR': return [-46, -34, 92, 68]
    case 'PAD': return [-11, -11, 22, 22]
    case 'PUSH': return [-40, -40, 80, 56]
    case 'AMP': return [-62, -52, 164, 104]
    case 'FELT': return [-24, -15, 48, 30]
    case 'WOODBOX': { const w = bp.w ?? 400, h = bp.h ?? 300; return [-w / 2, -h / 2, w, h] }
    default: return [-10, -10, 20, 20]
  }
}

export function absPins(bp: BoardPart): Record<string, Pt> {
  const out: Record<string, Pt> = {}
  for (const [k, p] of Object.entries(localPins(bp))) {
    const [rx, ry] = rotate(p, bp.rot)
    out[k] = [bp.x + rx, bp.y + ry]
  }
  return out
}

export function absBox(bp: BoardPart): [number, number, number, number] {
  const [x, y, w, h] = localBox(bp)
  const pts = [rotate([x, y], bp.rot), rotate([x + w, y], bp.rot), rotate([x, y + h], bp.rot), rotate([x + w, y + h], bp.rot)]
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const x0 = Math.min(...xs), y0 = Math.min(...ys)
  return [bp.x + x0, bp.y + y0, Math.max(...xs) - x0, Math.max(...ys) - y0]
}

const BAND = ['#111', '#7a4a1e', '#d22', '#f07d1a', '#f2d21b', '#2a9d3a', '#2a5bd7', '#8b3fc7', '#888', '#f5f5f5']

/** 4-band resistor colors from a value like "4.7k", "220", "1.5M". */
export function resistorBands(value: string | undefined): string[] {
  if (!value) return []
  const m = /^([\d.]+)\s*([kKmMrR\u03a9]?)/.exec(value)
  if (!m) return []
  let ohms = parseFloat(m[1])
  const suf = m[2].toLowerCase()
  if (suf === 'k') ohms *= 1e3
  if (suf === 'm') ohms *= 1e6
  if (!(ohms > 0)) return []
  let exp = Math.floor(Math.log10(ohms)) - 1
  let sig = Math.round(ohms / Math.pow(10, exp))
  if (sig >= 100) { sig = Math.round(sig / 10); exp += 1 }
  const d1 = Math.floor(sig / 10), d2 = sig % 10
  return [BAND[d1], BAND[d2], exp >= 0 && exp <= 9 ? BAND[exp] : exp === -1 ? '#c9a227' : '#999', '#c9a227']
}
