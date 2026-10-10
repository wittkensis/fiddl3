/** Turns knob positions + pulled parts + bypassed blocks into per-stage params. */
import type { Circuit, Effect, Knob, ParamValue } from '../types'
import type { Params } from './stages'

export type KnobValues = Record<string, number>

export type Resolved = {
  params: Record<string, Params>
  bypass: Set<string>
}

export function knobDefault(k: Knob): number {
  return k.default
}

function mapTarget(v: number, from: number, to: number, curve: 'lin' | 'exp' = 'lin') {
  if (curve === 'exp' && from > 0 && to > 0) return from * Math.pow(to / from, v)
  return from + (to - from) * v
}

export function applyEffects(params: Record<string, Params>, bypass: Set<string>, effects: Effect[]) {
  for (const e of effects) {
    if ('bypass' in e) {
      bypass.add(e.stage)
      continue
    }
    const p = (params[e.stage] ??= {})
    if ('value' in e) p[e.param] = e.value
    else {
      const cur = p[e.param]
      if (typeof cur === 'number') p[e.param] = cur * e.scale
    }
  }
}

/** Part values changed away from the original: a number (ohms / farads) or a choice id. */
export type PartValues = Record<string, number | string>

export function resolve(
  circuit: Circuit,
  knobs: KnobValues,
  removed: Set<string>,
  bypassedBlocks: Set<string>,
  values: PartValues = {},
  /** v5: layer-rung effects, applied after knobs and part values, before pulled parts. */
  extra: Effect[] = [],
): Resolved {
  const params: Record<string, Params> = {}
  const bypass = new Set<string>()
  for (const b of circuit.blocks) if (b.stage) params[b.id] = { ...b.stage.params }

  // 1) knobs: sets, then switch options, then multipliers
  const muls: { stage: string; param: string; v: number }[] = []
  for (const k of circuit.knobs) {
    const v = knobs[k.id] ?? k.default
    for (const t of k.targets ?? []) {
      const val = mapTarget(v, t.from, t.to, t.curve)
      if (t.mode === 'mul') muls.push({ stage: t.stage, param: t.param, v: val })
      else (params[t.stage] ??= {})[t.param] = val
    }
    if (k.options) {
      const opt = k.options[Math.round(v)] ?? k.options[0]
      applyEffects(params, bypass, opt.effects)
    }
  }
  for (const m of muls) {
    const cur = params[m.stage]?.[m.param]
    if (typeof cur === 'number') params[m.stage][m.param] = cur * m.v
  }

  // 1b) changed part values scale the params they feed (after knobs, so a bigger cap still tracks the knob)
  for (const part of circuit.parts) {
    const v = values[part.id]
    const tu = part.tune
    if (v === undefined || !tu) continue
    if (typeof v === 'string') {
      const ch = tu.choices?.find((c) => c.id === v)
      if (ch) applyEffects(params, bypass, ch.effects)
      continue
    }
    if (!tu.nominal) continue
    const ratio = v / tu.nominal
    for (const tg of tu.targets ?? []) {
      const p = (params[tg.stage] ??= {})
      const cur = p[tg.param]
      if (typeof cur !== 'number') continue
      let nv = tg.add !== undefined ? cur + tg.add * Math.log2(ratio) : cur * Math.pow(ratio, tg.exp ?? 1)
      if (tg.min !== undefined) nv = Math.max(tg.min, nv)
      if (tg.max !== undefined) nv = Math.min(tg.max, nv)
      p[tg.param] = nv
    }
  }

  // 1c) the current Layers rung (e.g. hard vs soft clipping, no tone stage yet)
  applyEffects(params, bypass, extra)

  // 2) pulled parts
  for (const part of circuit.parts) {
    if (removed.has(part.id) && part.onRemove) applyEffects(params, bypass, part.onRemove)
  }

  // 3) bypassed blocks
  for (const b of circuit.blocks) {
    if (!bypassedBlocks.has(b.id)) continue
    if (b.stage) bypass.add(b.id)
    if (b.onBypass) applyEffects(params, bypass, b.onBypass)
  }
  return { params, bypass }
}

export function fmtParam(v: ParamValue | undefined): string {
  if (typeof v === 'number') return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)
  return String(v ?? '')
}
