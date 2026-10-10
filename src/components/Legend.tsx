/** The color key, folded into the view as a one-line overlay. Open it to tap any color for its why. */
import { useState } from 'react'
import type { Circuit } from '../types'
import type { Sel } from '../selection'
import { WIRE_COLOR } from '../circuitUtil'

type LegendId = 'audio' | 'plus' | 'minus' | 'control' | 'bias' | 'ground'

export function KeyOverlay({ circuit, sel, onSel, map, onFund }: { circuit: Circuit; sel: Sel; onSel: (s: Sel) => void; map?: boolean; onFund?: () => void }) {
  const [open, setOpen] = useState(false)
  const r = circuit.rails
  const plus = r.top.sign === '+' ? r.top : r.bottom.sign === '+' ? r.bottom : null
  const minus = r.top.sign === '-' ? r.top : r.bottom.sign === '-' ? r.bottom : null
  const posGround = !!plus?.ground
  const on = (id: LegendId) => (sel?.kind === 'legend' && sel.id === id ? ' on' : '')
  const pick = (id: LegendId) => onSel({ kind: 'legend', id })
  const rows: [LegendId, string, string][] = [
    ['audio', WIRE_COLOR.audio, 'sound'],
    ['plus', WIRE_COLOR.plus, plus ? `+ rail · ${plus.label}` : '+ rail (none here)'],
    ['minus', WIRE_COLOR.minus, minus ? `− rail · ${minus.label}` : '− rail (none here)'],
    ['control', WIRE_COLOR.control, 'control, modulation'],
    ['bias', WIRE_COLOR.bias, 'resting voltage (bias)'],
  ]
  return (
    <div className={'keyov' + (open ? ' open' : '')}>
      <button className="keyov-toggle" aria-expanded={open} onClick={() => setOpen(!open)} data-tip="What the wire colors mean">
        <span className="keyov-title">Key</span>
        <span className="sw-row" aria-hidden="true">{rows.map(([id, c]) => <i key={id} style={{ background: c }} />)}</span>
        {posGround && <span className="pg" aria-label="positive ground">+ is ground</span>}
        <svg className="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 7.5 6 4l3.5 3.5" /></svg>
      </button>
      {open && (
        <div className="keyov-body">
          {rows.map(([id, c, label]) => (
            <button key={id} className={'kchip' + on(id)} onClick={() => pick(id)}>
              <i style={{ background: c }} />{label}
            </button>
          ))}
          <button className={'kchip ground' + on('ground')} onClick={() => pick('ground')}>⏚ what is ground?</button>
          {posGround && <button className="kchip warn" onClick={() => pick('ground')}>Positive ground: the + rail IS ground (and the box)</button>}
          {map && <p className="keyov-note">Dashed lines only carry something in some switch settings, or if you aim an LED.</p>}
          <p className="keyov-note">Parts hanging up to red or down to blue set where a stage rests (bias) or smooth its supply.</p>
          {onFund && <button className="kchip fundlink" onClick={onFund}>V·I·R What do volts, amps and ohms mean? ›</button>}
        </div>
      )}
    </div>
  )
}

export function legendText(circuit: Circuit, id: 'audio' | 'plus' | 'minus' | 'control' | 'bias' | 'ground') {
  const r = circuit.rails
  const rail = (sign: '+' | '-') => (r.top.sign === sign ? r.top : r.bottom.sign === sign ? r.bottom : null)
  switch (id) {
    case 'audio':
      return { title: 'White: the audio signal path', term: 'signal path', t: { eli5: 'White wires carry the sound itself: fast wiggles of voltage that end up moving a speaker cone.', detail: 'Tap any white wire (or a probe dot) to see and hear the sound at that point. Follow white left to right and you follow the sound.' } }
    case 'plus': {
      const x = rail('+')
      return { title: `Red: the + supply rail${x ? ` (${x.label})` : ''}`, term: 'positive supply rail', t: x ? { eli5: x.eli5, detail: x.detail ?? 'Chips and transistors drink from this rail; their power pins sit on it.' } : { eli5: 'This circuit has no battery, so there is no + rail. Your heel supplies the energy.' } }
    }
    case 'minus': {
      const x = rail('-')
      return { title: `Blue: the − supply rail${x ? ` (${x.label})` : ''}`, term: 'negative supply rail', t: x ? { eli5: x.eli5, detail: x.detail ?? 'Everything returns here to finish its loop.' } : { eli5: 'This circuit has no battery, so there is no − rail. The cable shield is the only reference.' } }
    }
    case 'control':
      return { title: 'Amber: control and modulation', term: 'control voltage (CV) / modulation', t: { eli5: 'Amber wires carry instructions, not sound: slow wiggles, on/off squares, or light that tell another part what to do.', detail: 'Examples: the MOD square going into XR2206 pin 9, or an LEDacle shining on a photocell. You usually don\'t hear a control wire directly; you hear what it does to the sound.' } }
    case 'bias':
      return { title: 'Grey: resting voltages (bias)', term: 'bias / operating point', t: { eli5: 'Grey wires hold steady resting levels. A bias resistor sets where a transistor or chip rests, like tensioning a spring so it can swing both ways.', detail: 'Resistors and caps that run up to red or down to blue are either biasing a stage (setting its resting point) or decoupling it (a little local water tank that smooths the supply).' } }
    case 'ground':
      return { title: 'What is ground?', term: 'ground (0 V reference)', t: { eli5: 'Ground is the shared floor every voltage is measured from, like sea level for mountain heights. Every signal also comes back to it to finish its loop.', detail: circuit.groundNote.eli5 + (circuit.groundNote.detail ? ' ' + circuit.groundNote.detail : '') } }
  }
}
