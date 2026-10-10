/** v4 Lugs tab: a zoomed map of a multi-terminal part (3PDT footswitch, jacks, pots, toggles, transistors). */
import { useEffect, useState } from 'react'
import type { Board, Circuit, LugMap, Part } from '../types'
import { WIRE_COLOR } from '../circuitUtil'
import { LUG_COLOR } from '../v4'

type Props = {
  part: Part
  circuit: Circuit
  board: Board
  fswOn: boolean
  onFsw: () => void
  values: Record<string, number>
  setValue: (id: string, v: number) => void
  hiNet: string | null
  onHiNet: (id: string | null) => void
}

const W = 300

function layout(m: LugMap): Record<string, [number, number]> {
  const pos: Record<string, [number, number]> = {}
  if (m.kind === 'fsw3') {
    for (let k = 1; k <= 9; k++) pos[String(k)] = [90 + ((k - 1) % 3) * 70, 46 + Math.floor((k - 1) / 3) * 56]
    return pos
  }
  const row = m.lugs.filter((l) => !l.pin.startsWith('S') || m.kind !== 'swpot')
  row.forEach((l, i) => { pos[l.pin] = [70 + (i * (W - 140)) / Math.max(1, row.length - 1), m.kind === 'swpot' ? 120 : 104] })
  if (m.kind === 'swpot') { pos.S1 = [126, 40]; pos.S2 = [174, 40] }
  return pos
}

/** Local states for parts whose state isn't a knob: plug in / out for jacks. */
function localStates(m: LugMap) {
  if (m.kind === 'jack3') return [{ id: 'in', label: 'Mono plug in', joins: [['R', 'S']] as [string, string][], eli5: 'The plug sleeve bridges ring to sleeve: the battery circuit closes and the pedal wakes up.' }, { id: 'out', label: 'Unplugged', joins: [] as [string, string][], eli5: 'Nothing bridges ring and sleeve, so the battery rests.' }]
  if (m.kind === 'dcj') return [{ id: 'none', label: 'No plug', joins: [['S', 'R']] as [string, string][], eli5: 'The switch lug rests against the barrel contact.' }, { id: 'plug', label: 'Supply plugged in', joins: [] as [string, string][], eli5: 'The plug pushes the switch lug away and the supply takes over.' }]
  return m.states ?? []
}

export function LugPanel(p: Props) {
  const m = p.part.lugs!
  const states = localStates(m)
  const knob = m.stateFrom && m.stateFrom !== 'fsw' ? p.circuit.knobs.find((k) => k.id === m.stateFrom) : undefined
  const [local, setLocal] = useState(0)
  const [demo, setDemo] = useState(false)
  const [demoIdx, setDemoIdx] = useState(0)
  const live = m.stateFrom === 'fsw' ? (p.fswOn ? 0 : 1) : knob ? Math.round(p.values[knob.id] ?? knob.default) : local
  const shown = demo ? demoIdx : live
  const st = states[shown]

  useEffect(() => {
    if (!demo || states.length < 2) return
    const id = window.setInterval(() => setDemoIdx((i) => (i + 1) % states.length), 1400)
    return () => window.clearInterval(id)
  }, [demo, states.length])

  const pick = (i: number) => {
    setDemo(false)
    if (m.stateFrom === 'fsw') { if (i !== live) p.onFsw() }
    else if (knob) p.setValue(knob.id, i)
    else setLocal(i)
  }

  const bp = m.bp ? p.board.parts.find((b) => b.id === m.bp) : undefined
  const netOf = (pin: string) => (bp ? p.board.nets.find((n) => n.pins.includes(`${bp.id}.${pin}`)) : undefined)
  const pos = layout(m)
  const joined = new Set((st?.joins ?? []).flat())
  const potKnob = m.knob ? p.circuit.knobs.find((k) => k.id === m.knob) : undefined
  const wiper = potKnob ? p.values[potKnob.id] ?? potKnob.default : 0.5

  return (
    <div className={'lugpanel lug-' + m.kind}>
      <p className="eli5">{m.eli5}</p>
      <svg viewBox={`0 0 ${W} ${m.kind === 'fsw3' ? 190 : 160}`} className="lugmap" role="img" aria-label={`${p.part.label} lug map${st ? ', ' + st.label : ''}`}>
        {m.kind === 'fsw3' && (
          <>
            <rect x={50} y={14} width={220} height={166} rx={14} className="lbody" />
            {m.poles?.map((pl, i) => <text key={pl.name} x={90 + i * 70} y={10} textAnchor="middle" className="lhead">{pl.name.split('·')[1]?.trim() ?? pl.name}</text>)}
            {m.rows?.map((r, i) => <text key={r} x={44} y={50 + i * 56} textAnchor="end" className="lrow">{r.split(' ')[0] === 'commons' ? 'common' : r.split(' (')[0]}</text>)}
          </>
        )}
        {(m.kind === 'pot' || m.kind === 'trim' || m.kind === 'swpot') && (
          <>
            <path d={`M70,${pos['1'][1] - 18} A80,60 0 0 1 230,${pos['3'][1] - 18}`} className="ltrack" />
            {(() => {
              const a = Math.PI * (1 - wiper)
              const cx = 150, cy = pos['1'][1] - 18 + 0, rx = 80, ry = 60
              const wx = cx + rx * Math.cos(a), wy = cy - ry * Math.sin(a) + 0
              return <g className="lwiper"><line x1={pos['2'][0]} y1={pos['2'][1] - 10} x2={wx} y2={wy} /><circle cx={wx} cy={wy} r={6} /></g>
            })()}
            {m.kind === 'swpot' && <rect x={108} y={22} width={84} height={36} rx={8} className="lbody" />}
          </>
        )}
        {m.kind === 'transistor' && <><circle cx={150} cy={52} r={36} className="lbody" /><text x={150} y={57} textAnchor="middle" className="lhead">{p.part.ref}</text></>}
        {(m.kind === 'jack3' || m.kind === 'dcj') && <rect x={40} y={34} width={220} height={44} rx={10} className="lbody" />}
        {m.kind === 'toggle' && <rect x={46} y={64} width={208} height={80} rx={12} className="lbody" />}

        {/* every possible join, faint; the shown state's joins, bright */}
        {states.flatMap((s, si) => s.joins.map(([a, b]) => (
          <line key={`${si}-${a}-${b}`} x1={pos[a]?.[0]} y1={pos[a]?.[1]} x2={pos[b]?.[0]} y2={pos[b]?.[1]} className={'ljoin' + (si === shown ? ' on' : '')} />
        )))}
        {m.lugs.map((l) => {
          const [x, y] = pos[l.pin] ?? [0, 0]
          const n = netOf(l.pin)
          const hi = !!n && p.hiNet === n.id
          return (
            <g key={l.pin} className={'lug' + (joined.has(l.pin) ? ' j' : '') + (hi ? ' hi' : '') + (n ? ' tap' : '')} onClick={() => n && p.onHiNet(hi ? null : n.id)}
              data-tip={`${l.pin} · ${l.name}${n ? ' · ' + n.name : ''}`}>
              <circle cx={x} cy={y} r={15} style={{ stroke: LUG_COLOR[l.role] }} />
              <text x={x} y={y + 4} textAnchor="middle">{l.pin}</text>
              {m.kind !== 'fsw3' && <text x={x} y={y + 30} textAnchor="middle" className="lname">{l.name}</text>}
            </g>
          )
        })}
      </svg>

      {states.length > 1 && (
        <div className="lstates">
          <div className="seg2" role="radiogroup" aria-label="Switch state">
            {states.map((s, i) => (
              <button key={s.id} role="radio" aria-checked={shown === i} className={shown === i ? 'on' : ''} onClick={() => pick(i)}>{s.label}</button>
            ))}
          </div>
          <button className={'btn ghost small' + (demo ? ' on' : '')} aria-pressed={demo} onClick={() => { setDemoIdx(live); setDemo(!demo) }}>{demo ? '■ stop' : '▶ flip back and forth'}</button>
        </div>
      )}
      {st?.eli5 && <p className="note">{st.eli5}</p>}

      <ul className="luglist">
        {m.lugs.map((l) => {
          const n = netOf(l.pin)
          return (
            <li key={l.pin} className={joined.has(l.pin) ? 'j' : ''}>
              <span className="lnum" style={{ borderColor: LUG_COLOR[l.role] }}>{l.pin}</span>
              <span className="ltxt"><b>{l.name}</b> {l.eli5}</span>
              {n && <button className={'chip wirechip' + (p.hiNet === n.id ? ' on' : '')} style={{ ['--wc' as string]: WIRE_COLOR[n.kind] }} onClick={() => p.onHiNet(p.hiNet === n.id ? null : n.id)} data-tip="Light this wire up on the board">{n.name}</button>}
            </li>
          )
        })}
      </ul>

      {m.why?.map((w) => <div key={w.q} className="callout"><b>{w.q}</b><p>{w.a}</p></div>)}
      <p className="vocab">standard or bespoke? {m.standard}</p>
      {(m.detail || m.alts) && (
        <details className="mini">
          <summary>more</summary>
          {m.detail && <p>{m.detail}</p>}
          {m.alts && <><p className="muted small">Common alternatives:</p><ul className="alts">{m.alts.map((a) => <li key={a}>{a}</li>)}</ul></>}
        </details>
      )}
    </div>
  )
}
