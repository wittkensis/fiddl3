/** SECTION MAP: the board's sub-circuits as boxes, with typed links (audio / control / power). */
import type { Circuit, Link, Section } from '../types'
import { LINK_COLOR, WIRE_COLOR, linksOf, sectionsOf } from '../circuitUtil'

type Props = {
  circuit: Circuit
  selSection: string | null
  selLink: string | null
  onSection: (id: string) => void
  onDrill: (id: string) => void
  onLink: (id: string) => void
  overlay?: React.ReactNode
}

type P = [number, number]

function clipToBox([cx, cy]: P, [tx, ty]: P, [, , w, h]: Section['map'], pad = 4): P {
  const dx = tx - cx, dy = ty - cy
  if (!dx && !dy) return [cx, cy]
  const sx = dx ? (w / 2 + pad) / Math.abs(dx) : Infinity
  const sy = dy ? (h / 2 + pad) / Math.abs(dy) : Infinity
  const s = Math.min(sx, sy)
  return [cx + dx * s, cy + dy * s]
}

const center = (s: Section): P => [s.map[0] + s.map[2] / 2, s.map[1] + s.map[3] / 2]

export const HONESTY_LABEL = { behavioral: 'modeled', approx: 'approximated', none: 'not modeled' } as const

export function SectionMap({ circuit, selSection, selLink, onSection, onDrill, onLink, overlay }: Props) {
  const sections = sectionsOf(circuit)
  const links = linksOf(circuit)
  const byId = new Map(sections.map((s) => [s.id, s]))
  const pairCount = new Map<string, number>()
  const pairIdx = new Map<string, number>()
  for (const l of links) {
    const k = [l.from, l.to].sort().join('|')
    pairIdx.set(l.id, pairCount.get(k) ?? 0)
    pairCount.set(k, (pairCount.get(k) ?? 0) + 1)
  }

  const geom = (l: Link) => {
    const a = byId.get(l.from), b = byId.get(l.to)
    if (!a || !b) return null
    const ca = center(a), cb = center(b)
    const len = Math.hypot(cb[0] - ca[0], cb[1] - ca[1]) || 1
    const nx = -(cb[1] - ca[1]) / len, ny = (cb[0] - ca[0]) / len
    const k = [l.from, l.to].sort().join('|')
    const n = pairCount.get(k) ?? 1
    const dir = l.from < l.to ? 1 : -1
    const off = ((pairIdx.get(l.id) ?? 0) - (n - 1) / 2) * 22 * dir
    const mid: P = [(ca[0] + cb[0]) / 2 + nx * off, (ca[1] + cb[1]) / 2 + ny * off]
    const ctrl: P = [mid[0] + nx * 2 * (l.bend ?? 0), mid[1] + ny * 2 * (l.bend ?? 0)]
    const sa: P = [ca[0] + nx * off, ca[1] + ny * off]
    const sb: P = [cb[0] + nx * off, cb[1] + ny * off]
    const p0 = clipToBox(sa, l.bend ? ctrl : sb, a.map)
    const p1 = clipToBox(sb, l.bend ? ctrl : sa, b.map, 10)
    const c: P = l.bend ? ctrl : [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2]
    const lab: P = [0.25 * p0[0] + 0.5 * c[0] + 0.25 * p1[0], 0.25 * p0[1] + 0.5 * c[1] + 0.25 * p1[1]]
    return { d: `M${p0[0]},${p0[1]} Q${c[0]},${c[1]} ${p1[0]},${p1[1]}`, lab, nx, ny }
  }

  // place link labels so they don't sit on each other or on a box's text
  const H = Math.max(560, ...sections.map((s) => s.map[1] + s.map[3] + 24))
  type R4 = [number, number, number, number]
  const taken: R4[] = sections.map((s) => s.map as R4)
  const hits = (r: R4) => taken.some((q) => r[0] < q[0] + q[2] && r[0] + r[2] > q[0] && r[1] < q[1] + q[3] && r[1] + r[3] > q[1])
  const labels = links.filter((l) => l.kind !== 'power').flatMap((l) => {
    const g = geom(l)
    if (!g) return []
    const t = l.label.length > 30 ? l.label.slice(0, 29) + '…' : l.label
    const w = t.length * 6.3 + 10
    let best: P = g.lab
    for (const k of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5]) {
      const c: P = [g.lab[0] + g.nx * k * 14, g.lab[1] + g.ny * k * 14]
      if (!hits([c[0] - w / 2 - 2, c[1] - 11, w + 4, 21])) { best = c; break }
    }
    taken.push([best[0] - w / 2 - 2, best[1] - 11, w + 4, 21])
    return [{ l, t, x: best[0], y: best[1], w }]
  })

  return (
    <div className="map-wrap">
      <svg className="sectionmap" viewBox={`0 0 1000 ${H}`} role="img" aria-label={`${circuit.name} section map`}>
        <defs>
          {(['audio', 'control'] as const).map((k) => (
            <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={LINK_COLOR[k]} />
            </marker>
          ))}
        </defs>
        {links.map((l) => {
          const g = geom(l)
          if (!g) return null
          const sel = selLink === l.id
          if (l.kind === 'power') {
            return (
              <g key={l.id} className={'mlink power' + (sel ? ' sel' : '')} onClick={() => onLink(l.id)} data-tip={`Power link · ${l.label}`}>
                <path d={g.d} stroke={WIRE_COLOR.plus} transform={`translate(${g.nx * 3},${g.ny * 3})`} />
                <path d={g.d} stroke={WIRE_COLOR.minus} transform={`translate(${-g.nx * 3},${-g.ny * 3})`} />
                <path d={g.d} className="hit" />
                <title>{l.label}</title>
              </g>
            )
          }
          return (
            <g key={l.id} className={'mlink' + (sel ? ' sel' : '') + (l.optional ? ' optional' : '')} onClick={() => onLink(l.id)} data-tip={`${l.kind === 'audio' ? 'Audio' : 'Control'} link · ${l.label}${l.optional ? ' (only sometimes)' : ''}`}>
              <path d={g.d} stroke={LINK_COLOR[l.kind]} markerEnd={`url(#arrow-${l.kind})`} />
              <path d={g.d} className="hit" />
              <title>{l.label}</title>
            </g>
          )
        })}
        {sections.map((s) => {
          const [x, y, w, h] = s.map
          const on = selSection === s.id
          return (
            <g key={s.id} className={'mbox' + (s.io ? ' io' : '') + (on ? ' sel' : '')} style={{ ['--tint' as string]: s.tint }}
              onClick={() => (s.io ? onSection(s.id) : onDrill(s.id))} role="button" tabIndex={0} aria-label={s.io ? s.title : `open ${s.title} in the path view`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (s.io) onSection(s.id); else onDrill(s.id) } }}
              data-tip={`${s.io ? 'Endpoint' : 'Section'} · ${s.title}${s.io ? '' : ' · tap to open its path'}`}>
              <rect x={x} y={y} width={w} height={h} rx={s.io ? 28 : 12} />
              <foreignObject x={x + 8} y={y + 6} width={w - 16} height={h - 12}>
                <div className="mbox-body">
                  <div className="mbox-title">{s.title}</div>
                  {!s.io && <div className="mbox-term">{s.term}</div>}
                  {!s.io && h > 110 && <div className="mbox-eli5">{s.eli5}</div>}
                  {!s.io && s.honesty && <span className={`hbadge ${s.honesty.level}`}>{HONESTY_LABEL[s.honesty.level]}</span>}
                  {!s.io && s.blocks.length > 0 && <span className="mbox-open">open path ›</span>}
                </div>
              </foreignObject>
            </g>
          )
        })}
        {labels.map(({ l, t, x, y, w }) => (
          <g key={`lab-${l.id}`} className={'mlabel ' + l.kind + (selLink === l.id ? ' sel' : '')} onClick={() => onLink(l.id)} data-tip={`${l.kind === 'audio' ? 'Audio' : 'Control'} link · ${l.label}`}>
            <rect x={x - w / 2} y={y - 9} width={w} height={17} rx={8} />
            <text x={x} y={y + 4} textAnchor="middle">{t}</text>
          </g>
        ))}
      </svg>
      {overlay}
    </div>
  )
}
