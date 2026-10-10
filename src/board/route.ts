/** Turn nets into drawable copper traces and off-board hook-up wires. */
import type { Board, BoardPart, Net } from '../types'
import { absPins, type Pt } from './footprints'

export type Seg = { net: Net; kind: 'trace' | 'wire'; d: string; a: Pt; b: Pt }
export type PadDot = { net: Net | null; at: Pt; part: BoardPart; pin: string; square: boolean; thermal: boolean }

const manhattan = (a: Pt, b: Pt) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])

function lPath(a: Pt, b: Pt) {
  const dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1])
  if (dx < 1 || dy < 1) return `M${a[0]},${a[1]} L${b[0]},${b[1]}`
  // 45-degree chamfered L, like a real PCB trace
  const c = Math.min(dx, dy, 14)
  const sx = Math.sign(b[0] - a[0]), sy = Math.sign(b[1] - a[1])
  if (dx >= dy) return `M${a[0]},${a[1]} L${b[0] - sx * c},${a[1]} L${b[0]},${a[1] + sy * c} L${b[0]},${b[1]}`
  return `M${a[0]},${a[1]} L${a[0]},${b[1] - sy * c} L${a[0] + sx * c},${b[1]} L${b[0]},${b[1]}`
}

function wirePath(a: Pt, b: Pt) {
  const mx = (a[0] + b[0]) / 2
  const sag = Math.min(60, Math.abs(b[0] - a[0]) * 0.15 + 10)
  return `M${a[0]},${a[1]} C${mx},${a[1] + sag} ${mx},${b[1] + sag} ${b[0]},${b[1]}`
}

/** Prim's minimum spanning tree over points (Manhattan distance). */
function mst(points: Pt[]): [number, number][] {
  if (points.length < 2) return []
  const inTree = new Set([0])
  const edges: [number, number][] = []
  while (inTree.size < points.length) {
    let best: [number, number] | null = null
    let bestD = Infinity
    for (const i of inTree)
      for (let j = 0; j < points.length; j++) {
        if (inTree.has(j)) continue
        const d = manhattan(points[i], points[j])
        if (d < bestD) { bestD = d; best = [i, j] }
      }
    edges.push(best!)
    inTree.add(best![1])
  }
  return edges
}

export type Routed = { segs: Seg[]; pads: PadDot[]; pinNet: Map<string, Net>; partById: Map<string, BoardPart>; problems: string[] }

export function route(board: Board): Routed {
  const partById = new Map(board.parts.map((p) => [p.id, p]))
  const pinNet = new Map<string, Net>()
  const problems: string[] = []
  const segs: Seg[] = []
  const p2p = board.style === 'p2p'

  for (const net of board.nets) {
    const on: { at: Pt; pad: boolean; key: string }[] = []
    const off: { at: Pt; key: string }[] = []
    for (const key of net.pins) {
      const [pid, pin] = key.split('.')
      const bp = partById.get(pid)
      const at = bp && absPins(bp)[pin]
      if (!bp || !at) { problems.push(`${net.id}: ${key}`); continue }
      pinNet.set(key, net)
      if (bp.off) off.push({ at, key })
      else on.push({ at, pad: bp.fp === 'PAD', key })
    }
    if (!(net.pour && board.style === 'pcb')) {
      for (const [i, j] of mst(on.map((o) => o.at))) {
        const a = on[i].at, b = on[j].at
        segs.push({ net, kind: p2p ? 'wire' : 'trace', d: p2p ? wirePath(a, b) : lPath(a, b), a, b })
      }
    }
    const landing = on.filter((o) => o.pad).length ? on.filter((o) => o.pad) : on
    const usedPads = new Set<number>()
    for (const o of off) {
      if (!landing.length) continue
      // prefer a pad not already taken by another wire of this net
      let best = -1, bestD = Infinity
      landing.forEach((l, i) => {
        const d = manhattan(l.at, o.at) + (usedPads.has(i) ? 2000 : 0)
        if (d < bestD) { bestD = d; best = i }
      })
      usedPads.add(best)
      segs.push({ net, kind: 'wire', d: wirePath(o.at, landing[best].at), a: o.at, b: landing[best].at })
    }
    if (!on.length && off.length > 1) {
      for (const [i, j] of mst(off.map((o) => o.at))) segs.push({ net, kind: 'wire', d: wirePath(off[i].at, off[j].at), a: off[i].at, b: off[j].at })
    }
  }

  const pads: PadDot[] = []
  for (const bp of board.parts) {
    for (const [pin, at] of Object.entries(absPins(bp))) {
      const net = pinNet.get(`${bp.id}.${pin}`) ?? null
      pads.push({ net, at, part: bp, pin, square: pin === '1' || pin === '+' || pin === 'p', thermal: !!net?.pour && board.style === 'pcb' && !bp.off })
    }
  }
  return { segs, pads, pinNet, partById, problems }
}
