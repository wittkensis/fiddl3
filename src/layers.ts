/** v5 Layers: filter a circuit down to one rung of its complexity ladder. Reusable for any circuit with `layers`. */
import type { Circuit, Effect, Rung } from './types'

export type LayerView = {
  /** What the views draw: only the parts, knobs, sections and wires that exist at this rung. */
  circuit: Circuit
  /** What the audio engine gets: every block (so switching rungs never rebuilds the graph), only present parts and knobs. */
  audio: Circuit
  rung: Rung | null
  /** Parts that arrive (or move) at this rung: they glow. */
  fresh: Set<string>
  present: Set<string> | null
  effects: Effect[]
}

export const mainRungs = (c: Circuit) => c.layers?.rungs.filter((r) => !r.branch) ?? []
export const branchRungs = (c: Circuit) => c.layers?.rungs.filter((r) => r.branch) ?? []

export function presentAt(c: Circuit, rungId: string): Set<string> {
  const rungs = c.layers?.rungs ?? []
  const r = rungs.find((x) => x.id === rungId)
  const base = r?.branch ?? rungId
  const out = new Set<string>()
  for (const x of mainRungs(c)) {
    x.adds.forEach((id) => out.add(id))
    if (x.id === base) break
  }
  return out
}

const inLayer = (layers: string[] | undefined, id: string) => !layers || layers.includes(id)

export function layerView(c: Circuit, rungId: string | null): LayerView {
  const L = c.layers
  const rung = L && rungId ? L.rungs.find((r) => r.id === rungId) ?? null : null
  if (!L || !rung) return { circuit: c, audio: c, rung: null, fresh: new Set(), present: null, effects: [] }
  const base = rung.branch ? L.rungs.find((r) => r.id === rung.branch)! : rung
  const present = presentAt(c, rung.id)
  const hardware = new Set(L.hardware)
  const fresh = new Set(rung.branch ? Object.keys(rung.set ?? {}) : [...rung.adds, ...(rung.moves ?? [])])
  const effects = rung.branch ? [...base.effects, ...rung.effects] : rung.effects

  const parts = c.parts.filter((p) => present.has(p.id))
  const knobs = c.knobs.filter((k) => !k.part || present.has(k.part))
  const realBlocks = new Set(parts.filter((p) => !hardware.has(p.id)).map((p) => p.block))
  const blocks = c.blocks.filter((b) => realBlocks.has(b.id))
  const hwBlocks = new Set(parts.filter((p) => hardware.has(p.id)).map((p) => p.block))
  const sections = c.sections?.filter((s) => (s.io ? s.blocks.some((b) => hwBlocks.has(b) || realBlocks.has(b)) : s.blocks.some((b) => realBlocks.has(b))))
  const sids = new Set(sections?.map((s) => s.id))
  const links = c.links?.filter((l) => inLayer(l.layers, base.id) && sids.has(l.from) && sids.has(l.to))

  let board = c.board
  if (board) {
    const bps = board.parts
      .filter((bp) => !bp.part || present.has(bp.part))
      .map((bp) => (rung.set && bp.part && rung.set[bp.part] ? { ...bp, value: rung.set[bp.part] } : bp))
    const ids = new Set(bps.map((bp) => bp.id))
    const nets = board.nets
      .filter((n) => inLayer(n.layers, base.id))
      .map((n) => ({ ...n, pins: n.pins.filter((k) => ids.has(k.split('.')[0])) }))
      .filter((n) => n.pins.length > 0)
    board = { ...board, parts: bps, nets }
  }
  const circuit: Circuit = { ...c, parts, knobs, blocks, sections, links, board }
  const audio: Circuit = { ...c, parts, knobs }
  return { circuit, audio, rung, fresh, present, effects }
}
