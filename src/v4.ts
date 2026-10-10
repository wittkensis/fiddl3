/** v4 helpers: E-series steps, value formatting, live formulas, the chip database and role colors. */
import type { Chip, Circuit, LugRole, Part, PinRole, Tune } from './types'
import chipData from './circuits/chips.json'

export const CHIPS = (chipData as unknown as { chips: Record<string, Chip> }).chips
export const ROLE_LABEL = (chipData as unknown as { roles: Record<PinRole, string> }).roles

export const PIN_COLOR: Record<PinRole, string> = {
  power: '#ff5a4f', ground: '#4f8dff', in: '#f4f4ee', out: '#c6f36b', timing: '#ffb020', control: '#f08bd0', feedback: '#a98bff', ref: '#7fd6c8', nc: '#5b6355',
}
export const LUG_COLOR: Record<LugRole, string> = {
  audio: '#f4f4ee', led: '#ffb020', power: '#ff5a4f', ground: '#4f8dff', control: '#ffb020', unused: '#5b6355', end: '#9aa3ad', wiper: '#c6f36b',
}

const MANT: Record<NonNullable<Tune['series']>, number[]> = {
  E12: [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2],
  E6: [1, 1.5, 2.2, 3.3, 4.7, 6.8],
  pot: [1, 2, 2.5, 5],
}
const sig = (x: number) => Number(x.toPrecision(3))

/** Standard values between min and max, always including the original. */
export function stepsFor(t: Tune): number[] {
  if (!t.nominal || !t.min || !t.max) return []
  const out = new Set<number>([sig(t.nominal)])
  const m = MANT[t.series ?? 'E12']
  for (let d = Math.floor(Math.log10(t.min)) - 1; d <= Math.ceil(Math.log10(t.max)); d++) {
    for (const k of m) {
      const v = sig(k * Math.pow(10, d))
      if (v >= t.min * 0.999 && v <= t.max * 1.001) out.add(v)
    }
  }
  return [...out].sort((a, b) => a - b)
}

export function fmtValue(v: number, unit: Tune['unit']): string {
  const n = (x: number) => String(Number(x.toPrecision(3)))
  if (unit === 'F') {
    if (v >= 1e-6) return `${n(v * 1e6)} µF`
    if (v >= 1e-9) return `${n(v * 1e9)} nF`
    return `${n(v * 1e12)} pF`
  }
  if (v >= 1e6) return `${n(v / 1e6)}M`
  if (v >= 1e3) return `${n(v / 1e3)}k`
  return `${n(v)} Ω`
}

const fmtHz = (f: number) => (f >= 1000 ? `${Number((f / 1000).toPrecision(3))} kHz` : f >= 10 ? `${Math.round(f)} Hz` : `${Number(f.toPrecision(2))} Hz`)
const fmtS = (s: number) => (s >= 1 ? `${Number(s.toPrecision(3))} s` : s >= 1e-3 ? `${Number((s * 1e3).toPrecision(3))} ms` : `${Number((s * 1e6).toPrecision(3))} µs`)

// PT2399 datasheet table 1: VCO resistor (Ω) vs delay time (ms)
const PT: [number, number][] = [[0.5, 31.3], [288, 32.6], [519, 34.4], [723, 36.6], [894, 38.5], [1080, 40.6], [1280, 43], [1470, 45.8], [1670, 48.1], [2000, 52.3], [2400, 56.6], [2800, 61.6], [3400, 68.1], [4000, 75.9], [4500, 81], [4900, 86.3], [5400, 92.2], [5800, 97.1], [6400, 104.3], [7200, 113.7], [8200, 124.1], [9200, 136.6], [10500, 151], [12100, 171], [14300, 196], [17200, 228], [21300, 273], [27600, 342]]

export type Readout = { eq: string; result: string; warn?: boolean; note?: string }

/** A live formula for the slider: corner frequency, pitch, pulse length, LED current or PT2399 delay. */
export function readout(t: Tune, v: number): Readout | null {
  const c = t.calc
  if (!c) return null
  const other = 'with' in c ? fmtValue(c.with, t.unit === 'Ω' ? 'F' : 'Ω') : ''
  if (c.kind === 'rc') {
    const f = 1 / (2 * Math.PI * v * c.with)
    return { eq: `f = 1 ÷ (2π × R × C) = 1 ÷ (2π × ${t.unit === 'Ω' ? fmtValue(v, 'Ω') + ' × ' + other : other + ' × ' + fmtValue(v, 'F')})`, result: `corner ≈ ${fmtHz(f)}`, note: c.label }
  }
  if (c.kind === 'xr') {
    const f = 1 / (v * c.with)
    return { eq: `f = 1 ÷ (R × C)`, result: `pitch ≈ ${fmtHz(f)}`, note: c.label + ' (XR2206 datasheet formula)' }
  }
  if (c.kind === 'mono') {
    const s = 1.1 * v * c.with
    return { eq: `t = 1.1 × R × C`, result: `pulse ≈ ${fmtS(s)}`, note: c.label + ' (555 datasheet formula)' }
  }
  if (c.kind === 'ohm') {
    const i = c.volts / v
    const mA = i * 1000
    return { eq: `I = V ÷ R = ${c.volts} V ÷ ${fmtValue(v, 'Ω')}`, result: `≈ ${mA >= 1 ? mA.toFixed(1) : mA.toFixed(2)} mA`, warn: mA > 20, note: c.label + (mA > 20 ? '. Over 20 mA: most small LEDs burn out.' : '') }
  }
  if (c.kind === 'pt2399') {
    if (v > PT[PT.length - 1][0]) return { eq: 'datasheet table 1: R on pin 6 vs delay', result: '> 342 ms (past the table)', warn: true, note: c.label + ': past the datasheet table, so expect grit and aliasing' }
    let i = 1
    while (i < PT.length - 1 && PT[i][0] < v) i++
    const [r0, t0] = PT[i - 1], [r1, t1] = PT[i]
    const ms = t0 + ((t1 - t0) * (v - r0)) / (r1 - r0)
    return { eq: 'datasheet table 1: R on pin 6 vs delay', result: `≈ ${Math.round(ms)} ms`, note: c.label }
  }
  return null
}

export const isAudible = (t: Tune) => (t.targets?.length ?? 0) > 0 || (t.choices?.some((c) => c.effects.length > 0) ?? false)

export function tuneLabel(p: Part, v: number | string | undefined): string {
  const t = p.tune
  if (!t) return ''
  if (t.choices) return t.choices.find((c) => c.id === (v ?? t.default))?.label ?? ''
  return fmtValue(typeof v === 'number' ? v : t.nominal ?? 0, t.unit)
}

/** Board part ids for every part whose value differs from the original. */
export function changedBoardParts(c: Circuit, ids: Set<string>): string[] {
  return (c.board?.parts ?? []).filter((b) => b.part && ids.has(b.part)).map((b) => b.id)
}
