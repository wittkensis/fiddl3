/** Helpers shared by the three views: colors, fallback sections/boards, lookups. */
import { localPins } from './board/footprints'
import type { Board, BoardPart, Circuit, Footprint, Link, Net, PartKind, Section, WireKind } from './types'

export const WIRE_COLOR: Record<WireKind, string> = {
  audio: '#f4f4ee',
  plus: '#ff5a4f',
  minus: '#4f8dff',
  control: '#ffb020',
  bias: '#9aa3ad',
}
export const LINK_COLOR: Record<Link['kind'], string> = { audio: WIRE_COLOR.audio, control: WIRE_COLOR.control, power: WIRE_COLOR.plus }

export const railColor = (sign: '+' | '-' | 'none') => (sign === '+' ? WIRE_COLOR.plus : sign === '-' ? WIRE_COLOR.minus : '#6b7280')

const TINTS = ['#2dd4bf', '#a78bfa', '#f472b6', '#a3e635', '#d6b98c', '#94a3b8']

/** Sections for the map. Circuits without authored sections get one per block, in a row. */
export function sectionsOf(c: Circuit): Section[] {
  if (c.sections?.length) return c.sections
  const main = c.blocks.filter((b) => !b.side)
  const side = c.blocks.filter((b) => b.side)
  const w = Math.min(200, 900 / Math.max(1, main.length) - 30)
  return [
    ...main.map((b, i): Section => ({ id: b.id, title: b.title, term: b.stage?.kind ?? 'block', eli5: b.job.eli5, blocks: [b.id], tint: TINTS[i % TINTS.length], map: [40 + i * (w + 30), 200, w, 130],
      honesty: { level: 'behavioral', eli5: 'Modeled by behavior with a Web Audio stage.' } })),
    ...side.map((b, i): Section => ({ id: b.id, title: b.title, term: 'side chain', eli5: b.job.eli5, blocks: [b.id], tint: '#94a3b8', map: [40 + i * 230, 30, 200, 100],
      honesty: { level: 'approx', eli5: 'Side chain: its effect is mapped onto the main stages.' } })),
  ]
}

export function linksOf(c: Circuit): Link[] {
  if (c.links?.length || c.sections?.length) return c.links ?? []
  const main = c.blocks.filter((b) => !b.side)
  return main.slice(1).map((b, i): Link => ({ id: `auto-${i}`, from: main[i].id, to: b.id, kind: 'audio', label: 'signal', eli5: main[i].wire?.eli5 ?? 'The sound, passed along to the next block.', probe: main[i].id }))
}

export function sectionOfBlock(c: Circuit, blockId: string): Section | undefined {
  return sectionsOf(c).find((s) => !s.io && s.blocks.includes(blockId))
}

export function sectionOfPart(c: Circuit, partId: string | undefined): Section | undefined {
  const p = c.parts.find((x) => x.id === partId)
  return p ? sectionOfBlock(c, p.block) : undefined
}

const FP: Partial<Record<PartKind, Footprint>> = {
  R: 'R', C: 'CC', CP: 'CP', D: 'D', DD: 'D', LED: 'LED', Q: 'TO92', QP: 'TO92', JFET: 'TO92', OPAMP: 'DIP', IC: 'DIP', OSC: 'DIP', MULT: 'DIP',
  POT: 'POT', TRIM: 'TRIM', LDR: 'LDR', XFMR: 'XFMR', SPK: 'SPK', SW: 'TOG', JACK: 'JACK', BAT: 'BAT', BOX: 'FELT', L: 'R', WIRE: 'PAD',
}

/** Perfboard sketch for circuits without an authored board: parts grouped by block, wired by their 'connects' lists. */
export function autoBoard(c: Circuit): Board {
  const parts: BoardPart[] = []
  const blocks = c.blocks
  const colW = 230
  const first = new Map<string, string>()
  blocks.forEach((b, bi) => {
    const ps = c.parts.filter((p) => p.block === b.id)
    ps.forEach((p, k) => {
      const fp = FP[p.kind] ?? 'PAD'
      const isBig = fp === 'POT' || fp === 'SPK' || fp === 'BAT'
      const bp: BoardPart = { id: `a_${p.id}`, part: p.id, fp, x: 60 + bi * colW + (k % 2) * 100, y: 90 + Math.floor(k / 2) * 120 + (isBig ? 40 : 0), label: p.ref, value: /^[\d.]+[kKM]?$/.test(p.ref) ? p.ref : undefined }
      if (fp === 'DIP') bp.span = 8
      if (fp === 'R' || fp === 'D') bp.span = 60
      parts.push(bp)
      first.set(p.id, bp.id)
    })
  })
  const firstPin = (bp: BoardPart) => {
    const order = ['2', 'p', '1', '+', 'T', 'A', 'C', 'P1', 'S1']
    const names = Object.keys(pinsCache(bp))
    return order.find((n) => names.includes(n)) ?? names[0]
  }
  const lastPin = (bp: BoardPart) => {
    const order = ['1', 'p', '-', 'S', 'K', 'E', 'P2', 'S2', '3']
    const names = Object.keys(pinsCache(bp))
    return order.find((n) => names.includes(n)) ?? names[names.length - 1]
  }
  const nets: Net[] = []
  const seen = new Set<string>()
  for (const p of c.parts) {
    for (const q of p.connects) {
      const key = [p.id, q].sort().join('|')
      if (seen.has(key) || !first.has(q)) continue
      seen.add(key)
      const a = parts.find((x) => x.id === first.get(p.id))!
      const b = parts.find((x) => x.id === first.get(q))!
      const blk = c.blocks.find((x) => x.id === p.block)
      nets.push({ id: `n_${key}`, name: `${p.ref} \u2194 ${c.parts.find((x) => x.id === q)?.ref}`, kind: blk?.side ? 'control' : 'audio',
        pins: [`${a.id}.${firstPin(a)}`, `${b.id}.${lastPin(b)}`], probe: blk?.stage ? blk.id : undefined,
        eli5: `A wire from ${p.ref} to ${c.parts.find((x) => x.id === q)?.ref}. In this sketch it stands for 'these two parts talk'.` })
    }
  }
  const maxX = Math.max(...parts.map((p) => p.x)) + 120
  const maxY = Math.max(...parts.map((p) => p.y)) + 120
  return {
    style: 'perf', color: 'perf', w: maxX, h: maxY, view: [-40, -60, maxX + 80, maxY + 120], fidelity: 'generic',
    fidelityNote: 'Auto-generated perfboard sketch: one column of parts per block, wired by which parts talk to each other. It shows what kinds of parts you would solder, not a buildable layout.',
    parts, nets,
  }
}

const pinsCache = (bp: BoardPart) => localPins(bp)

export function boardOf(c: Circuit): Board {
  return c.board ?? autoBoard(c)
}
