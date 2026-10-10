/** v4 chip views: a DIP pinout (every pin numbered, named, colored by role, tied to this board's nets) and an ELI5 inside diagram. */
import { useState } from 'react'
import type { Board, Chip, ChipUse, PinRole } from '../types'
import { WIRE_COLOR } from '../circuitUtil'
import { CHIPS, PIN_COLOR, ROLE_LABEL } from '../v4'

type PinProps = { use: ChipUse; board: Board; hiNet: string | null; onHiNet: (id: string | null) => void }

const short = (s: string) => (s.length > 11 ? s.slice(0, 10) + '…' : s)

export function PinoutPanel({ use, board, hiNet, onHiNet }: PinProps) {
  const [alt, setAlt] = useState(false)
  const [pick, setPick] = useState<number | null>(null)
  const chip: Chip = CHIPS[alt && use.alt ? use.alt : use.chip]
  if (!chip) return <p className="muted">No pinout on file.</p>
  const onBoard = !alt && use.bp ? board.parts.find((b) => b.id === use.bp) : undefined
  const netOf = (n: number) => (onBoard ? board.nets.find((x) => x.pins.includes(`${onBoard.id}.${n}`)) : undefined)
  const focus = !alt && use.pins ? new Set(use.pins) : null
  const half = chip.dip / 2
  const H = half * 26 + 34
  const roles = [...new Set(chip.pins.map((p) => p.role))] as PinRole[]

  const pinAt = (n: number): [number, number, 'l' | 'r'] => (n <= half ? [112, 26 + (n - 1) * 26, 'l'] : [188, 26 + (chip.dip - n) * 26, 'r'])
  const tap = (n: number) => {
    setPick(pick === n ? null : n)
    const net = netOf(n)
    if (net) onHiNet(hiNet === net.id ? null : net.id)
  }

  return (
    <div className="pinout">
      {use.alt && (
        <div className="seg2" role="radiogroup" aria-label="Which chip">
          <button role="radio" aria-checked={!alt} className={!alt ? 'on' : ''} onClick={() => setAlt(false)}>{CHIPS[use.chip].name}</button>
          <button role="radio" aria-checked={alt} className={alt ? 'on' : ''} onClick={() => setAlt(true)}>{CHIPS[use.alt].name} (one timer)</button>
        </div>
      )}
      <div className="rolekey">{roles.map((r) => <span key={r}><i style={{ background: PIN_COLOR[r] }} />{ROLE_LABEL[r]}</span>)}</div>
      <svg viewBox={`0 0 300 ${H}`} className="dip" role="img" aria-label={`${chip.name} pinout, ${chip.dip} pins, top view`}>
        <rect x={120} y={10} width={60} height={H - 20} rx={6} className="dbody" />
        <path d={`M140,10 a10,10 0 0 0 20,0`} className="dnotch" />
        <circle cx={131} cy={24} r={3} className="ddot" />
        <text x={150} y={H / 2} textAnchor="middle" className="dname" transform={`rotate(-90 150 ${H / 2})`}>{chip.name}</text>
        {chip.pins.map((pn) => {
          const [x, y, side] = pinAt(pn.n)
          const net = netOf(pn.n)
          const dim = focus && !focus.has(pn.n)
          const on = pick === pn.n || (!!net && net.id === hiNet)
          return (
            <g key={pn.n} className={'dpin' + (dim ? ' dim' : '') + (on ? ' on' : '') + (net ? ' wired' : '')} onClick={() => tap(pn.n)} data-tip={`Pin ${pn.n} · ${pn.name}${net ? ' · ' + net.name : ''}`}>
              <rect x={side === 'l' ? x - 14 : x} y={y - 6} width={14} height={12} rx={2} style={{ fill: PIN_COLOR[pn.role] }} />
              <text x={side === 'l' ? 128 : 172} y={y + 4} textAnchor="middle" className="dnum">{pn.n}</text>
              <text x={side === 'l' ? x - 20 : x + 20} y={y + 4} textAnchor={side === 'l' ? 'end' : 'start'} className="dlabel">{short(pn.name)}</text>
              <rect x={side === 'l' ? 0 : 172} y={y - 12} width={128} height={24} className="dhit" />
            </g>
          )
        })}
      </svg>
      <p className="muted small">Top view, notch up, pin 1 by the dot. Tap a pin to light its wire on the board.{focus ? ' Bright pins belong to this part.' : ''}</p>
      {use.note && !alt && <p className="note">{use.note}</p>}
      <ol className="pinlist">
        {chip.pins.map((pn) => {
          const net = netOf(pn.n)
          const u = !alt ? use.use?.[String(pn.n)] : undefined
          return (
            <li key={pn.n} className={(pick === pn.n ? 'on ' : '') + (focus && !focus.has(pn.n) ? 'dim' : '')} onClick={() => setPick(pn.n)}>
              <span className="pnum" style={{ background: PIN_COLOR[pn.role] }}>{pn.n}</span>
              <span className="ptxt">
                <b>{pn.name}</b> <span className="prole">{ROLE_LABEL[pn.role]}</span>
                <span className="peli">{pn.eli5}</span>
                {(u || net || onBoard) && (
                  <span className="phere">
                    {u && <span>Here: {u} </span>}
                    {net ? (
                      <button className={'chip wirechip' + (hiNet === net.id ? ' on' : '')} style={{ ['--wc' as string]: WIRE_COLOR[net.kind] }} onClick={(e) => { e.stopPropagation(); onHiNet(hiNet === net.id ? null : net.id) }}>→ {net.name}</button>
                    ) : onBoard && !u ? <span className="muted">not connected on this board</span> : null}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="muted small">Pin numbers and names from the <a href={chip.datasheet.url} target="_blank" rel="noopener noreferrer">{chip.datasheet.label}</a>.</p>
    </div>
  )
}

export function InsidePanel({ use }: { use: ChipUse }) {
  const chip = CHIPS[use.chip]
  if (!chip) return null
  const B = chip.inside.blocks
  const by = new Map(B.map((b) => [b.id, b]))
  const shapeOf = (b: (typeof B)[number]) => {
    if (b.shape === 'box') return <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} />
    const tri = `M${b.x},${b.y} L${b.x + b.w - (b.shape === 'inv' ? 10 : 0)},${b.y + b.h / 2} L${b.x},${b.y + b.h} Z`
    return <>{<path d={tri} />}{b.shape === 'inv' && <circle cx={b.x + b.w - 5} cy={b.y + b.h / 2} r={5} />}</>
  }
  return (
    <div className="inside">
      <p className="eli5 lead">{chip.inside.eli5}</p>
      <svg viewBox="0 0 300 150" className="blocks" role="img" aria-label={`${chip.name} inside, simplified`}>
        <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="currentColor" /></marker></defs>
        <rect x={2} y={2} width={296} height={146} rx={12} className="pkg" />
        {chip.inside.links.map(([a, b]) => {
          const A = by.get(a), Bb = by.get(b)
          if (!A || !Bb) return null
          const ax = A.x + A.w / 2, ay = A.y + A.h / 2, bx = Bb.x + Bb.w / 2, byy = Bb.y + Bb.h / 2
          const horiz = Math.abs(bx - ax) > Math.abs(byy - ay)
          const x1 = horiz ? (bx > ax ? A.x + A.w : A.x) : ax, y1 = horiz ? ay : byy > ay ? A.y + A.h : A.y
          const x2 = horiz ? (bx > ax ? Bb.x : Bb.x + Bb.w) : bx, y2 = horiz ? byy : byy > ay ? Bb.y : Bb.y + Bb.h
          return <line key={a + b} x1={x1} y1={y1} x2={x2} y2={y2} className="blink" markerEnd="url(#arr)" />
        })}
        {B.map((b) => (
          <g key={b.id} className={'blk ' + b.shape}>
            {shapeOf(b)}
            <text x={b.shape === 'box' ? b.x + b.w / 2 : b.x + b.w * 0.38} y={b.y + b.h / 2 + 4} textAnchor="middle">{b.label}</text>
          </g>
        ))}
      </svg>
      <p className={'kindline ' + chip.kind}><span className="vocab">{chip.kind === 'logic' ? 'logic chip' : chip.kind === 'mixed' ? 'mixed analog + digital' : 'analog chip'}</span> {chip.logic}</p>
      <div className="callout"><b>Standard or bespoke?</b><p>{chip.standard}</p><p className="muted small">{chip.lineage}</p></div>
      <div className="callout warm"><b>When you buy one</b><p>{chip.buying}</p>{chip.buyingLink && <p className="small"><a href={chip.buyingLink.url} target="_blank" rel="noopener noreferrer">{chip.buyingLink.label}</a></p>}</div>
      <p className="small">Datasheet: <a href={chip.datasheet.url} target="_blank" rel="noopener noreferrer">{chip.datasheet.label}</a></p>
      {chip.inside.detail && <details className="mini"><summary>more</summary><p>{chip.inside.detail}</p><p className="muted small">{chip.full}</p></details>}
    </div>
  )
}
