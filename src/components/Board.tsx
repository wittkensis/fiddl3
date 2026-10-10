/** BOARD view: a top-down mockup of what you'd actually solder. Controls are live; everything else is tappable. */
import { useMemo, useRef, useState, type ReactNode } from 'react'
import type { Board as BoardT, BoardPart, Circuit, Knob } from '../types'
import { absBox, absPins, cpRadius, resistorBands, rotate } from '../board/footprints'
import { route } from '../board/route'
import { WIRE_COLOR, sectionOfPart, sectionsOf } from '../circuitUtil'
import { boardTip } from '../tips'
import { usePanZoom } from './usePanZoom'

type Props = {
  circuit: Circuit
  board: BoardT
  selPart: string | null
  selNet: string | null
  selSection: string | null
  neighbors: Set<string>
  removed: Set<string>
  probe: string
  values: Record<string, number>
  setValue: (id: string, v: number) => void
  fswOn: boolean
  onFsw: () => void
  registerLed: (id: string, el: SVGElement | null) => void
  onPart: (partId: string | null, bpId: string) => void
  onNet: (netId: string) => void
  onSection: (id: string) => void
  overlay?: ReactNode
  /** v4: parts whose value was changed (badged on the board). */
  changed?: Set<string>
  onResetVals?: () => void
  /** v5 Layers: parts that just arrived glow; the rest dim a little. */
  fresh?: Set<string>
  layered?: boolean
}

/** Substrates sit back at low contrast so parts and controls carry the picture. */
const BOARD_FILL: Record<BoardT['color'], string> = { white: '#1f201c', green: '#122019', perf: '#201b12', wood: '#22170e' }
const SILK = '#7d8873'
const CONTROL_FPS = new Set<BoardPart['fp']>(['POT', 'SWPOT', 'TRIM', 'TOG', 'LDR', 'LED', 'FSW3', 'PUSH'])
const LABELLED_BY_CONTROL = new Set<BoardPart['fp']>(['POT', 'SWPOT', 'TRIM', 'TOG', 'FSW3', 'PUSH'])
const KIND_WORD = { audio: 'Audio trace', control: 'Control trace', plus: '+ supply trace', minus: '− supply trace', bias: 'Resting-voltage trace' } as const

const clamp = (v: number) => Math.min(1, Math.max(0, v))

export function Board(p: Props) {
  const { circuit, board } = p
  const routed = useMemo(() => route(board), [board])
  const [showOff, setShowOff] = useState(true)
  const [allTints, setAllTints] = useState(false)
  // headroom so the section chips (top) and the key (bottom left) never sit on the artwork
  const [vx, vy, vw, vh] = board.view
  const pz = usePanZoom([vx - vw * 0.04, vy - vh * 0.13, vw * 1.08, vh * 1.24] as typeof board.view)
  const pour = board.nets.find((n) => n.pour)
  const sections = sectionsOf(circuit).filter((s) => !s.io)
  const partCount = board.parts.length

  const hot = useMemo(() => {
    if (p.selNet) return new Set([p.selNet])
    if (!p.selPart) return null
    const ids = new Set(board.parts.filter((bp) => bp.part === p.selPart).map((bp) => bp.id))
    const nets = new Set<string>()
    for (const [key, net] of routed.pinNet) if (ids.has(key.split('.')[0])) nets.add(net.id)
    return nets
  }, [p.selNet, p.selPart, board.parts, routed.pinNet])

  const tintCss = useMemo(
    () => sections.map((s) => `.board[data-hs="${s.id}"] .tint[data-s="${s.id}"],.board[data-ss="${s.id}"] .tint[data-s="${s.id}"]{opacity:.3}`).join(''),
    [sections],
  )

  const setHover = (id: string) => {
    const el = pz.svg.current
    if (el && el.dataset.hs !== id) el.dataset.hs = id
  }

  // The heavy, mostly static layers. Knob turns don't touch these.
  const staticLayer = useMemo(() => {
    const partById = new Map(circuit.parts.map((x) => [x.id, x]))
    const visible = (bp: BoardPart) => showOff || !bp.off
    const dim = (netId: string) => (hot && !hot.has(netId) ? ' dim' : '')
    const outside = (bp: BoardPart) => {
      const [x, y, w, h] = absBox(bp)
      return x < 0 || y < 0 || x + w > board.w || y + h > board.h
    }
    return (
      <g>
        <rect className="substrate" x={0} y={0} width={board.w} height={board.h} rx={board.style === 'p2p' ? 6 : 14} fill={BOARD_FILL[board.color]} />
        {board.color === 'perf' && <rect x={0} y={0} width={board.w} height={board.h} fill="url(#perfholes)" className="substrate-tex" />}
        {board.color === 'wood' && <rect x={0} y={0} width={board.w} height={board.h} fill="url(#grain)" className="substrate-tex" />}
        {board.style === 'pcb' && [[14, 14], [board.w - 14, 14], [14, board.h - 14], [board.w - 14, board.h - 14]].map(([x, y]) => (
          <circle key={`${x},${y}`} cx={x} cy={y} r={8} className="mount" />
        ))}
        {pour && board.style === 'pcb' && (
          <g className="pour" style={{ color: WIRE_COLOR[pour.kind] }} onClick={() => p.onNet(pour.id)} data-tip={`Copper pour · ${pour.name}`}>
            <rect x={24} y={24} width={board.w - 48} height={board.h - 48} rx={8} fill="url(#hatch)" opacity={0.1} />
          </g>
        )}

        {/* section tints: hidden until you hover or pick a section */}
        {board.parts.filter(visible).map((bp) => {
          const sec = bp.part ? sectionOfPart(circuit, bp.part) : undefined
          if (!sec || bp.fp === 'WOODBOX') return null
          const [x, y, w, h] = absBox(bp)
          return <rect key={`t-${bp.id}`} className="tint" data-s={sec.id} x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={8} fill={sec.tint} />
        })}

        {routed.segs.filter((s) => s.kind === 'trace').map((s, i) => (
          <g key={`tr-${i}`} className={'trace' + dim(s.net.id) + (p.selNet === s.net.id ? ' sel' : '') + (s.net.probe && s.net.probe === p.probe ? ' probed' : '')}
            onClick={() => p.onNet(s.net.id)} data-tip={`${KIND_WORD[s.net.kind]} · ${s.net.name}`}>
            <path d={s.d} className="copper" stroke={board.style === 'perf' ? '#8d8d8d' : '#9a6a36'} />
            <path d={s.d} className="core" stroke={WIRE_COLOR[s.net.kind]} />
            <path d={s.d} className="hit" />
          </g>
        ))}

        {board.parts.filter(visible).map((bp) => {
          if (bp.fp === 'PAD') return null
          const isSel = !!bp.part && p.selPart === bp.part
          const isNb = !!bp.part && p.neighbors.has(bp.part)
          const isOut = !!bp.part && p.removed.has(bp.part)
          const [bx, by, bw, bh] = absBox(bp)
          const sec = bp.part ? sectionOfPart(circuit, bp.part)?.id : undefined
          const container = bp.fp === 'WOODBOX' || bp.fp === 'FELT'
          const isFresh = !!bp.part && !!p.fresh?.has(bp.part)
          const lay = p.layered ? (isFresh ? 'fresh' : 'older') : null
          return (
            <g key={bp.id} className={['bpart', isSel && 'sel', isNb && 'nb', isOut && 'out', bp.off && 'off', container && 'container', lay].filter(Boolean).join(' ')}
              onClick={() => p.onPart(bp.part ?? null, bp.id)} data-sec={sec} data-tip={boardTip(bp, bp.part ? partById.get(bp.part) : undefined)}>
              <rect className="bhit" x={bx - 4} y={by - 4} width={bw + 8} height={bh + 8} rx={8} />
              <g transform={`translate(${bp.x},${bp.y}) rotate(${bp.rot ?? 0})`}>
                <Body bp={bp} boardColor={board.color} />
              </g>
              {isOut && <path className="xout" d={`M${bx},${by} L${bx + bw},${by + bh} M${bx + bw},${by} L${bx},${by + bh}`} />}
            </g>
          )
        })}

        {showOff && routed.segs.filter((s) => s.kind === 'wire').map((s, i) => (
          <g key={`w-${i}`} className={'hookup' + dim(s.net.id) + (p.selNet === s.net.id ? ' sel' : '')} onClick={() => p.onNet(s.net.id)} data-tip={`Hook-up wire · ${s.net.name}`}>
            <path d={s.d} className="ins-edge" />
            <path d={s.d} className="ins" stroke={WIRE_COLOR[s.net.kind]} />
            <path d={s.d} className="hit" />
          </g>
        ))}

        {routed.pads.filter((d) => visible(d.part)).map((d) => (
          <g key={`${d.part.id}.${d.pin}`} className={'pad' + (d.net && p.selNet === d.net.id ? ' sel' : '')}
            onClick={(e) => { if (d.net) { e.stopPropagation(); p.onNet(d.net.id) } }} data-tip={d.net ? `${d.part.fp === 'PAD' ? 'Wire pad' : 'Pad'} · ${d.part.fp === 'PAD' ? d.part.label + ' · ' : ''}${d.net.name}` : undefined}>
            {d.part.fp === 'PAD' || !d.part.off ? (
              d.square ? <rect x={d.at[0] - 5} y={d.at[1] - 5} width={10} height={10} rx={1.5} className="ring" /> : <circle cx={d.at[0]} cy={d.at[1]} r={5} className="ring" />
            ) : <circle cx={d.at[0]} cy={d.at[1]} r={3.5} className="lug" />}
            {!d.part.off && <circle cx={d.at[0]} cy={d.at[1]} r={1.8} className="hole" />}
            {d.thermal && <path className="thermal" style={{ stroke: WIRE_COLOR[d.net!.kind] }} d={`M${d.at[0] - 9},${d.at[1]} h4 M${d.at[0] + 5},${d.at[1]} h4 M${d.at[0]},${d.at[1] - 9} v4 M${d.at[0]},${d.at[1] + 5} v4`} />}
            {d.net && <circle cx={d.at[0]} cy={d.at[1]} r={10} className="padhit" />}
          </g>
        ))}

        {board.parts.filter((bp) => visible(bp) && !LABELLED_BY_CONTROL.has(bp.fp)).map((bp) => (
          <Label key={`l-${bp.id}`} bp={bp} silk={bp.off || outside(bp) ? '#a9b39f' : SILK} />
        ))}
      </g>
    )
  }, [board, circuit, routed, showOff, hot, p.selPart, p.selNet, p.neighbors, p.removed, p.probe, p.fresh, p.layered]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="board-wrap">
      <svg
        ref={pz.svg}
        className="board"
        viewBox={pz.vb.join(' ')}
        role="img"
        aria-label={`${circuit.name} board mockup, ${partCount} parts`}
        data-ss={p.selSection ?? ''}
        data-all={allTints ? '1' : ''}
        onPointerOver={(e) => setHover((e.target as Element).closest('[data-sec]')?.getAttribute('data-sec') ?? '')}
        onPointerLeave={() => setHover('')}
        {...pz.handlers}
      >
        <defs>
          <pattern id="perfholes" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="2.4" fill="#0f0d08" />
          </pattern>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="1.2" />
          </pattern>
          <pattern id="grain" width="120" height="14" patternUnits="userSpaceOnUse">
            <path d="M0,7 C30,3 60,11 120,6" stroke="#2e1f12" strokeWidth="2" fill="none" />
          </pattern>
          <radialGradient id="can" cx="35%" cy="35%"><stop offset="0" stopColor="#f2f2f2" /><stop offset="1" stopColor="#8a8a8a" /></radialGradient>
          <radialGradient id="capface" cx="40%" cy="35%"><stop offset="0" stopColor="#3a3f36" /><stop offset="1" stopColor="#1a1d18" /></radialGradient>
          <radialGradient id="metal" cx="38%" cy="32%"><stop offset="0" stopColor="#f4f4f0" /><stop offset="0.6" stopColor="#a9ada4" /><stop offset="1" stopColor="#6b6f67" /></radialGradient>
          <radialGradient id="halo"><stop offset="0" stopColor="currentColor" stopOpacity="0.9" /><stop offset="0.45" stopColor="currentColor" stopOpacity="0.35" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></radialGradient>
          <style>{tintCss}</style>
        </defs>
        {staticLayer}
        {p.changed && p.changed.size > 0 && (
          <g className="vbadges" aria-hidden="true">
            {board.parts.filter((bp) => bp.part && p.changed!.has(bp.part) && bp.fp !== 'PAD' && (showOff || !bp.off)).map((bp) => {
              const [x, y, w] = absBox(bp)
              return <g key={bp.id} className="vbadge-dot" transform={`translate(${x + w},${y})`}><circle r={9} /><text y={4} textAnchor="middle">Δ</text></g>
            })}
          </g>
        )}
        <BoardControls {...p} showOff={showOff} />
      </svg>
      {p.overlay}
      <div className="board-tools" role="toolbar" aria-label="board tools">
        <button className={showOff ? 'on' : ''} onClick={() => setShowOff(!showOff)} aria-pressed={showOff} data-tip="Show or hide the wires to parts off the board">Off-board</button>
        <button className={allTints ? 'on' : ''} onClick={() => setAllTints(!allTints)} aria-pressed={allTints} data-tip="Color every section at once">Sections</button>
        <button onClick={pz.zoomIn} aria-label="zoom in" data-tip="Zoom in">+</button>
        <button onClick={pz.zoomOut} aria-label="zoom out" data-tip="Zoom out">−</button>
        <button onClick={pz.reset} data-tip="Fit the whole board">Fit</button>
      </div>
      {p.changed && p.changed.size > 0 && (
        <button className="changed-chip" onClick={p.onResetVals} data-tip="Put every changed value back to the original">
          <b>Δ</b> Changed parts ({p.changed.size}) · reset all
        </button>
      )}
      <div className="sec-chips" aria-label="board sections">
        {sections.map((s) => (
          <button key={s.id} className={'tint-chip' + (p.selSection === s.id ? ' on' : '')} style={{ ['--tint' as string]: s.tint }}
            onClick={() => p.onSection(s.id)} onPointerEnter={() => setHover(s.id)} onPointerLeave={() => setHover('')} onFocus={() => setHover(s.id)} onBlur={() => setHover('')}>
            <i />{s.title}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Live controls drawn on top of their parts: knob caps, switch bats, the footswitch, glowing LEDs and photocells. */
function BoardControls(p: Props & { showOff: boolean }) {
  const { board, circuit } = p
  const knobByPart = useMemo(() => new Map(circuit.knobs.filter((k) => k.part).map((k) => [k.part!, k])), [circuit.knobs])
  const partById = useMemo(() => new Map(circuit.parts.map((x) => [x.id, x])), [circuit.parts])
  const drag = useRef<{ y0: number; v0: number; moved: boolean } | null>(null)

  const select = (bp: BoardPart) => p.onPart(bp.part ?? null, bp.id)
  const dialHandlers = (bp: BoardPart, k: Knob | undefined) => {
    const v = k ? p.values[k.id] ?? k.default : 0.5
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.stopPropagation()
        ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
        drag.current = { y0: e.clientY, v0: v, moved: false }
      },
      onPointerMove: (e: React.PointerEvent) => {
        const d = drag.current
        if (!d || !k) return
        const dy = d.y0 - e.clientY
        if (Math.abs(dy) > 3) d.moved = true
        if (d.moved) p.setValue(k.id, clamp(d.v0 + dy / 160))
      },
      onPointerUp: () => {
        const d = drag.current
        drag.current = null
        if (d && !d.moved) select(bp)
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(bp) }
        if (!k) return
        const step = e.shiftKey ? 0.1 : 0.03
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); p.setValue(k.id, clamp(v + step)) }
        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); p.setValue(k.id, clamp(v - step)) }
      },
    }
  }
  const switchHandlers = (bp: BoardPart, flip: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onPointerUp: () => { flip(); select(bp) },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); select(bp) }
    },
  })

  return (
    <g className="controls-layer">
      {board.parts.filter((bp) => CONTROL_FPS.has(bp.fp) && (p.showOff || !bp.off)).map((bp) => {
        const k = bp.part ? knobByPart.get(bp.part) : undefined
        const part = bp.part ? partById.get(bp.part) : undefined
        const live = !!k
        const name = (bp.label ?? part?.ref ?? '').toUpperCase()
        const sel = !!bp.part && p.selPart === bp.part
        const cls = 'ctl' + (live ? ' live' : ' idle') + (sel ? ' sel' : '')
        const sec = bp.part ? sectionOfPart(circuit, bp.part)?.id : undefined

        if (bp.fp === 'POT' || bp.fp === 'SWPOT' || bp.fp === 'TRIM' || (bp.fp === 'LDR' && k && !k.options)) {
          const v = k ? p.values[k.id] ?? k.default : 0.5
          if (bp.fp === 'LDR') {
            return (
              <g key={bp.id} className={cls + ' ldr'} data-sec={sec} data-tip={boardTip(bp, part, 'drag up for more light')} tabIndex={0} role="slider"
                aria-label={`${bp.label ?? 'Photocell'} light`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} {...dialHandlers(bp, k)}>
                <circle cx={bp.x} cy={bp.y} r={44} className="halo" style={{ color: '#ffd25a', opacity: 0.15 + v * 0.85 }} fill="url(#halo)" />
                <circle cx={bp.x} cy={bp.y} r={24} className="ctl-hit" />
                <text className="ctl-val" x={bp.x} y={bp.y + 40} textAnchor="middle">☀ {Math.round(v * 100)}%</text>
              </g>
            )
          }
          const trim = bp.fp === 'TRIM'
          const [ox, oy] = trim ? rotate([-4, 0], bp.rot) : rotate([0, -55], bp.rot)
          const cx = bp.x + ox, cy = bp.y + oy
          const [dx, dy] = rotate([0, -1], bp.rot)
          const ang = -135 + 270 * v
          const R = trim ? 9 : 31
          const arc = (a0: number, a1: number, r: number) => {
            const pt = (a: number) => [cx + r * Math.sin((a * Math.PI) / 180), cy - r * Math.cos((a * Math.PI) / 180)]
            const [x0, y0] = pt(a0), [x1, y1] = pt(a1)
            return `M${x0},${y0} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1},${y1}`
          }
          const lx = cx + dx * (trim ? 30 : 50), ly = cy + dy * (trim ? 30 : 50) + (dy > 0 ? 10 : dy < 0 ? -2 : 4)
          return (
            <g key={bp.id} className={cls + (trim ? ' trim' : ' knob')} data-sec={sec} data-tip={boardTip(bp, part, live ? 'drag to turn' : 'not wired to the sound')}
              tabIndex={0} role="slider" aria-label={`${name} dial`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} {...dialHandlers(bp, k)}>
              {!trim && <path d={arc(-135, 135, R + 8)} className="track" />}
              {!trim && live && v > 0.003 && <path d={arc(-135, ang, R + 8)} className="track-on" />}
              {trim ? (
                <circle cx={cx} cy={cy} r={R} className="trim-face" />
              ) : (
                <>
                  <circle cx={cx} cy={cy} r={R} className="cap-skirt" />
                  <circle cx={cx} cy={cy} r={R - 6} fill="url(#capface)" className="cap-top" />
                </>
              )}
              <line className="pointer" x1={cx} y1={cy} x2={cx} y2={cy - (trim ? 8 : R - 3)} transform={`rotate(${ang} ${cx} ${cy})`} />
              {trim && <line className="pointer" x1={cx} y1={cy} x2={cx} y2={cy + 8} transform={`rotate(${ang} ${cx} ${cy})`} />}
              <circle cx={cx} cy={cy} r={trim ? 22 : R + 12} className="ctl-hit" />
              <text className="ctl-name" x={lx} y={ly} textAnchor="middle">{name}</text>
            </g>
          )
        }

        if (bp.fp === 'TOG') {
          const n = k?.options?.length ?? 2
          const i = k ? Math.round(p.values[k.id] ?? k.default) : 0
          const [ox, oy] = rotate([0, -8], bp.rot)
          const cx = bp.x + ox, cy = bp.y + oy
          const a = i === 0 ? -28 : 28
          const opt = k?.options?.[i]?.label
          return (
            <g key={bp.id} className={cls + ' toggle'} data-sec={sec} data-tip={boardTip(bp, part, live ? `${opt}, tap to flip` : 'not wired to the sound')}
              tabIndex={0} role="switch" aria-checked={i === 1} aria-label={`${name}${opt ? ': ' + opt : ''}`}
              {...switchHandlers(bp, () => k && p.setValue(k.id, (i + 1) % n))}>
              <circle cx={cx} cy={cy} r={11} className="bushing" />
              <line className="bat" x1={cx} y1={cy} x2={cx} y2={cy - 26} transform={`rotate(${a} ${cx} ${cy})`} />
              <circle className="bat-tip" cx={cx} cy={cy - 26} r={4.5} transform={`rotate(${a} ${cx} ${cy})`} />
              <circle cx={cx} cy={cy - 8} r={28} className="ctl-hit" />
              <text className="ctl-name" x={cx} y={cy - 40} textAnchor="middle">{name}</text>
              {opt && <text className="ctl-val" x={cx} y={cy + 34} textAnchor="middle">{opt.split('·')[0].trim()}</text>}
            </g>
          )
        }

        if (bp.fp === 'FSW3') {
          return (
            <g key={bp.id} className={cls + ' live fsw' + (p.fswOn ? ' on' : '')} data-sec={sec} data-tip={boardTip(bp, part, p.fswOn ? 'effect on, tap to bypass' : 'bypassed, tap to turn on')}
              tabIndex={0} role="switch" aria-checked={p.fswOn} aria-label="Footswitch" {...switchHandlers(bp, p.onFsw)}>
              <circle cx={bp.x} cy={bp.y} r={30} className="fsw-ring" />
              <circle cx={bp.x} cy={bp.y} r={22} fill="url(#metal)" className="fsw-cap" />
              <circle cx={bp.x} cy={bp.y} r={44} className="ctl-hit" />
              <text className="ctl-name" x={bp.x} y={bp.y + 50} textAnchor="middle">{p.fswOn ? 'ON' : 'BYPASS'}</text>
            </g>
          )
        }

        if (bp.fp === 'PUSH') {
          return (
            <g key={bp.id} className={cls + ' live fsw push' + (p.fswOn ? ' on' : '')} data-sec={sec} data-tip={boardTip(bp, part, p.fswOn ? 'effect on, tap to bypass (soft button: the flip-flop remembers)' : 'bypassed, tap to turn on')}
              tabIndex={0} role="switch" aria-checked={p.fswOn} aria-label="Footswitch (soft button)" {...switchHandlers(bp, p.onFsw)}>
              <circle cx={bp.x} cy={bp.y - 8} r={24} className="fsw-ring" />
              <circle cx={bp.x} cy={bp.y - 8} r={16} fill="url(#metal)" className="fsw-cap" />
              <circle cx={bp.x} cy={bp.y - 8} r={40} className="ctl-hit" />
              <text className="ctl-name" x={bp.x} y={bp.y + 40} textAnchor="middle">{p.fswOn ? 'ON' : 'BYPASS'}</text>
            </g>
          )
        }

        if (bp.fp === 'LED') {
          const color = bp.color ?? '#ff4d4d'
          const steady = bp.blink === 'fsw' ? (p.fswOn ? 1 : 0.04) : undefined
          return (
            <g key={bp.id} className={cls + ' led' + (bp.blink === 'breathe' ? ' breathe' : '')} data-sec={sec}
              data-tip={boardTip(bp, part, bp.blink === 'breathe' ? 'glows slowly (not modeled)' : bp.blink === 'fsw' ? (p.fswOn ? 'lit: effect on' : 'off: bypassed') : bp.blink ? 'blinks with its oscillator' : undefined)}
              onClick={() => select(bp)}>
              <circle ref={(el) => { if (bp.blink && bp.blink.startsWith('tap:')) p.registerLed(bp.id, el) }} data-src={bp.blink}
                cx={bp.x} cy={bp.y} r={46} fill="url(#halo)" className="halo" style={{ color, opacity: steady ?? (bp.blink ? 0.25 : 0.5) }} />
            </g>
          )
        }
        return null
      })}
    </g>
  )
}

function Label({ bp, silk }: { bp: BoardPart; silk: string }) {
  const [x, y, w, h] = absBox(bp)
  if (bp.fp === 'PAD') {
    const right = bp.x > 600 || bp.x > (bp.label?.length ?? 0) * 50
    return <text className="silk small" x={bp.x + (bp.x > 300 ? -9 : 9)} y={bp.y + 3} textAnchor={bp.x > 300 && right ? 'end' : 'start'} fill={silk}>{bp.label}</text>
  }
  if (bp.fp === 'R' || bp.fp === 'CC' || bp.fp === 'CP' || bp.fp === 'CF') {
    const txt = bp.value ?? bp.label
    const vertical = bp.rot === 90 || bp.rot === 270
    return vertical ? (
      <text className="silk tiny" x={x + w / 2} y={y + h + 8} textAnchor="middle" fill={silk}>{txt}</text>
    ) : (
      <text className="silk tiny" x={x + w + 2} y={y + h / 2 + 3} fill={silk}>{txt}</text>
    )
  }
  if (bp.fp === 'DIP') {
    const pins = absPins(bp)
    return (
      <g>
        <text className="silk chip" x={bp.x} y={bp.y + 4} textAnchor="middle">{bp.value}</text>
        <text className="silk small" x={x} y={y - 4} fill={silk}>{bp.label}</text>
        {Object.entries(pins).map(([n, [px, py]]) => (
          <text key={n} className="pinno" x={px} y={py + (py > bp.y ? 13 : -8)} textAnchor="middle" fill={silk}>{n}</text>
        ))}
      </g>
    )
  }
  if (bp.fp === 'TO92' || bp.fp === 'QCAN') {
    const pins = absPins(bp)
    return (
      <g>
        <text className="silk small" x={x + w + 3} y={y + 10} fill={silk}>{bp.label} {bp.value}</text>
        {Object.entries(pins).map(([n, [px, py]]) => <text key={n} className="pinno strong" x={px + 7} y={py + 3} fill={silk}>{n}</text>)}
      </g>
    )
  }
  if (bp.fp === 'FELT' || bp.fp === 'WOODBOX') return bp.label ? <text className="silk small" x={x + 8} y={y + 16} fill={silk}>{bp.label}</text> : null
  const below = bp.fp === 'POT' && bp.rot === 180
  return (
    <text className="silk small" x={x + w / 2} y={below ? y + h + 11 : y - 5} textAnchor="middle" fill={silk}>
      {bp.label}{bp.value && bp.fp !== 'TOG' ? ` ${bp.value}` : ''}
    </text>
  )
}

function Body({ bp, boardColor }: { bp: BoardPart; boardColor: BoardT['color'] }) {
  const s = bp.span
  switch (bp.fp) {
    case 'R': {
      const h = (s ?? 80) / 2
      const bands = resistorBands(bp.value)
      return (
        <g>
          <line x1={-h} y1={0} x2={h} y2={0} className="lead" />
          <rect x={-17} y={-6.5} width={34} height={13} rx={6} fill="#e3cf9f" stroke="#7a6a48" strokeWidth={0.8} />
          {bands.map((c, i) => <rect key={i} x={i < 3 ? -11 + i * 5 : 9} y={-6.5} width={3} height={13} fill={c} />)}
        </g>
      )
    }
    case 'D': {
      const h = (s ?? 80) / 2
      return <g><line x1={-h} y1={0} x2={h} y2={0} className="lead" /><rect x={-14} y={-5} width={28} height={10} rx={2} fill="#1b1b1b" /><rect x={8} y={-5} width={4} height={10} fill="#ccc" /></g>
    }
    case 'CC': {
      const h = (s ?? 20) / 2
      return <g><path d={`M${-h},0 L-5,-9 M${h},0 L5,-9`} className="lead" /><ellipse cx={0} cy={-13} rx={15} ry={10} fill="#e0a43a" stroke="#8a5a14" strokeWidth={0.8} /></g>
    }
    case 'CF': return <g><line x1={-10} y1={0} x2={10} y2={0} className="lead" /><rect x={-15} y={-10} width={30} height={20} rx={3} fill="#c9783a" stroke="#6b3a14" strokeWidth={0.8} /></g>
    case 'CP': {
      const r = cpRadius(bp)
      const x0 = r * 0.45
      const yy = Math.sqrt(r * r - x0 * x0)
      return (
        <g>
          <circle r={r} fill="#24438f" stroke="#0d1d44" strokeWidth={1} />
          <path d={`M${x0},${-yy} A${r},${r} 0 0 1 ${x0},${yy} Z`} fill="#b9c6e4" />
          <text x={(x0 + r) / 2} y={3} className="cp-minus" textAnchor="middle">−</text>
          <path d={`M${-r * 0.5},0 L${r * 0.3},0 M${-r * 0.1},${-r * 0.4} L${-r * 0.1},${r * 0.4}`} stroke="#6f86c2" strokeWidth={1} opacity={0.6} />
          <text x={-r - 6} y={-r + 6} className="cp-plus">+</text>
        </g>
      )
    }
    case 'TO92': return <path d="M-24,7 L24,7 A24,24 0 0 0 -24,7 Z" fill="#1d1d1d" stroke="#000" />
    case 'QCAN': return <g><circle r={29} fill="url(#can)" stroke="#555" /><circle r={21} fill="none" stroke="#777" /><rect x={18} y={-26} width={8} height={8} transform="rotate(45 22 -22)" fill="#999" /></g>
    case 'DIP': {
      const half = (s ?? 8) / 2
      const w = half * 20 + 2
      return (
        <g>
          {Array.from({ length: half }, (_, i) => -20 * (half - 1) / 2 + 20 * i).map((x) => (
            <g key={x}><rect x={x - 3} y={20} width={6} height={10} fill="#bbb" /><rect x={x - 3} y={-30} width={6} height={10} fill="#bbb" /></g>
          ))}
          <rect x={-w / 2} y={-22} width={w} height={44} rx={3} fill="#1c1c1c" stroke="#000" />
          <path d={`M${-w / 2},-7 A7,7 0 0 1 ${-w / 2},7`} fill={boardColor === 'white' ? '#ebe7dc' : '#555'} />
          <circle cx={-w / 2 + 12} cy={13} r={2.5} fill="#444" />
        </g>
      )
    }
    case 'POT':
    case 'SWPOT':
      return (
        <g>
          {[-40, 0, 40].map((x) => <rect key={x} x={x - 4} y={-14} width={8} height={16} fill="#c9c9c9" stroke="#666" strokeWidth={0.6} />)}
          <circle cy={-55} r={42} fill="#8d939a" stroke="#4b5056" />
          {bp.fp === 'SWPOT' && <rect x={-26} y={-62} width={52} height={22} rx={3} fill="#2b2b2b" opacity={0.85} />}
        </g>
      )
    case 'TRIM': return <g><rect x={-21} y={-18} width={34} height={36} rx={4} fill="#2f6fd0" stroke="#163a73" /></g>
    case 'LDR':
      return <g><circle r={17} fill="#c8742e" stroke="#7a3f12" /><path d="M-10,-8 h20 v4 h-20 v4 h20 v4 h-20 v4 h20" fill="none" stroke="#f3d9a4" strokeWidth={1.4} /><circle r={17} fill="#fff" opacity={0.12} /></g>
    case 'LED':
      return <g><path d="M14,-9 A17,17 0 1 1 14,9 Z" fill={bp.color ?? '#ff4d4d'} opacity={0.9} stroke="#000" strokeOpacity={0.4} /><circle cx={-5} cy={-5} r={4} fill="#fff" opacity={0.45} /></g>
    case 'JACK':
    case 'JACK3': {
      const w = bp.fp === 'JACK' ? 64 : 76
      return <g><rect x={-w / 2} y={-58} width={w} height={46} rx={5} fill="#1e1e1e" stroke="#000" /><circle cy={-58} r={13} fill="#9a9a9a" stroke="#555" /><circle cy={-58} r={6} fill="#222" /></g>
    }
    case 'DCJ': return <g><rect x={-42} y={-58} width={84} height={46} rx={5} fill="#1e1e1e" /><circle cy={-35} r={11} fill="#333" stroke="#777" /><circle cy={-35} r={3} fill="#bbb" /></g>
    case 'BAT':
      return (
        <g>
          <line x1={-14} y1={-40} x2={-14} y2={0} stroke="#d22" strokeWidth={3} />
          <line x1={14} y1={-40} x2={14} y2={0} stroke="#111" strokeWidth={3} />
          <rect x={-50} y={-112} width={100} height={72} rx={6} fill="#2a2a2a" stroke="#000" />
          <rect x={-50} y={-82} width={100} height={14} fill="#d9a520" />
          <text x={0} y={-50} textAnchor="middle" className="bat-text">9V</text>
        </g>
      )
    case 'PUSH': return <g><rect x={-30} y={-34} width={60} height={44} rx={8} fill="#2a2a2a" stroke="#000" /><line x1={-16} y1={0} x2={-16} y2={10} className="lead" /><line x1={16} y1={0} x2={16} y2={10} className="lead" /></g>
    case 'FSW3':
      return <g><rect x={-60} y={-60} width={120} height={120} rx={10} fill="#2f5fb3" opacity={0.55} /></g>
    case 'TOG':
      return (
        <g>
          <rect x={-30} y={-34} width={60} height={52} rx={4} fill={bp.color ?? '#888'} opacity={0.45} />
          <circle cy={-8} r={17} fill="#9a9a9a" stroke="#555" />
        </g>
      )
    case 'JMP3': return <rect x={-26} y={-7} width={32} height={14} rx={3} fill="#111" opacity={0.85} />
    case 'SPK':
      return (
        <g>
          <circle cy={-90} r={78} fill="#2c2c2c" stroke="#111" />
          <circle cy={-90} r={60} fill="#3a3a3a" />
          <circle cy={-90} r={40} fill="#444" />
          <circle cy={-90} r={18} fill="#555" />
          <rect x={-22} y={-14} width={44} height={14} rx={3} fill="#222" />
        </g>
      )
    case 'XFMR':
      return <g><rect x={-30} y={-28} width={60} height={56} rx={3} fill="#4a4a4a" />{[-18, -9, 0, 9, 18].map((y) => <line key={y} x1={-30} y1={y} x2={30} y2={y} stroke="#333" />)}<rect x={-14} y={-28} width={28} height={56} fill="#b5651d" opacity={0.85} /></g>
    case 'AMP': return <g><rect x={-40} y={-48} width={140} height={96} rx={6} fill="#1b1b1b" stroke="#000" /><rect x={-30} y={-38} width={120} height={40} fill="#2e2e2e" />{[-30, -20, -10].map((y) => <line key={y} x1={-26} y1={y} x2={86} y2={y} stroke="#444" />)}<circle cx={-28} cy={30} r={8} fill="#999" /></g>
    case 'FELT': return <rect x={-22} y={-13} width={44} height={26} rx={8} fill="#3b3b3b" opacity={0.9} />
    case 'WOODBOX': {
      const w = bp.w ?? 400, h = bp.h ?? 300
      return <rect x={-w / 2 + 12} y={-h / 2 + 12} width={w - 24} height={h - 24} rx={4} fill="none" stroke="#3e2410" strokeWidth={10} opacity={0.6} />
    }
    default: return null
  }
}
