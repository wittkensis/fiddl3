/** The Controls tray: the same knobs, switches and light you'd touch on the real thing. Mirrors the board both ways. */
import { useRef } from 'react'
import type { Circuit, Knob } from '../types'
import { LayerStepper } from './LayerStepper'

type Props = {
  circuit: Circuit
  values: Record<string, number>
  setValue: (id: string, v: number) => void
  onSelectPart: (id: string) => void
  selPart: string | null
  fsw?: { on: boolean; toggle: () => void; part?: string; label?: string }
  /** v5: the Layers rung stepper for circuits with a ladder. */
  layer?: { rung: string; setRung: (id: string) => void }
}

const clamp = (v: number) => Math.min(1, Math.max(0, v))

function readout(k: Knob, v: number) {
  if (!k.readout) return `${Math.round(v * 100)}%`
  const r = k.readout
  const x = r.curve === 'exp' && r.from > 0 ? r.from * Math.pow(r.to / r.from, v) : r.from + (r.to - r.from) * v
  return `${r.label} ${x.toFixed(r.digits ?? 1)} ${r.unit}`.trim()
}

/** "Bias TRIM (20k)" → "BIAS TRIM", "LEDacle → Photocell 1" stays readable. */
const short = (label: string) => label.replace(/\s*\(.*\)\s*$/, '').toUpperCase()

export function Controls({ circuit, values, setValue, onSelectPart, selPart, fsw, layer }: Props) {
  if (!circuit.knobs.length && !fsw && !(layer && circuit.layers)) return null
  return (
    <section className="tray" aria-label="Controls">
      <div className="tray-head">
        <h3>Controls</h3>
        <span className="muted small">Turn them here or on the board. They stay in sync.</span>
      </div>
      {layer && circuit.layers && <LayerStepper layers={circuit.layers} rung={layer.rung} setRung={layer.setRung} />}
      <div className="tray-row">
        {fsw && (
          <div className={'tctl stomp' + (fsw.part && selPart === fsw.part ? ' sel' : '')}>
            <button className={'stomp-btn' + (fsw.on ? ' on' : '')} role="switch" aria-checked={fsw.on} onClick={fsw.toggle} aria-label="Footswitch">
              <span className="stomp-led" />
            </button>
            <button className="tname" onClick={() => fsw.part && onSelectPart(fsw.part)} data-tip={`Footswitch (${fsw.label ?? '3PDT'}) · tap to read about it`}>FOOTSWITCH</button>
            <span className="tval">{fsw.on ? 'effect on' : 'bypassed'}</span>
          </div>
        )}
        {layer && circuit.layers && !circuit.knobs.length && !fsw && <span className="muted small">No knobs yet on this rung: step up a layer to add them.</span>}
        {circuit.knobs.map((k) => {
          const v = values[k.id] ?? k.default
          const sel = !!k.part && selPart === k.part
          const name = <button className="tname" onClick={() => k.part && onSelectPart(k.part)} data-tip={`${k.pad ? 'Photocell' : k.options ? 'Switch' : 'Dial (potentiometer)'} · ${k.label} · tap to read about it`}>{short(k.label)}</button>
          if (k.pad) return <LightPad key={k.id} knob={k} value={v} onChange={(x) => setValue(k.id, x)} name={name} sel={sel} />
          if (k.options) {
            const i = Math.round(v)
            return (
              <div className={'tctl switch' + (sel ? ' sel' : '')} key={k.id}>
                <div className="seg" role="radiogroup" aria-label={k.label}>
                  {k.options.map((o, j) => (
                    <button key={o.label} role="radio" aria-checked={i === j} className={i === j ? 'on' : ''} onClick={() => setValue(k.id, j)}>
                      {o.label}
                    </button>
                  ))}
                </div>
                {name}
              </div>
            )
          }
          return (
            <div className={'tctl dial' + (sel ? ' sel' : '')} key={k.id}>
              <Dial value={v} label={k.label} onChange={(x) => setValue(k.id, x)} />
              {name}
              <span className="tval">{readout(k, v)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** A rotary knob: drag up/down, scroll, or use the arrow keys. */
function Dial({ value, label, onChange }: { value: number; label: string; onChange: (v: number) => void }) {
  const drag = useRef<{ y: number; v: number } | null>(null)
  const ang = -135 + 270 * value
  const R = 22
  const pt = (a: number, r: number) => [32 + r * Math.sin((a * Math.PI) / 180), 32 - r * Math.cos((a * Math.PI) / 180)]
  const arc = (a0: number, a1: number) => {
    const [x0, y0] = pt(a0, R + 6), [x1, y1] = pt(a1, R + 6)
    return `M${x0},${y0} A${R + 6},${R + 6} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1},${y1}`
  }
  return (
    <div
      className="dialw"
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      onPointerDown={(e) => {
        ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
        drag.current = { y: e.clientY, v: value }
      }}
      onPointerMove={(e) => drag.current && onChange(clamp(drag.current.v + (drag.current.y - e.clientY) / 150))}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 0.1 : 0.02
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); onChange(clamp(value + step)) }
        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); onChange(clamp(value - step)) }
        if (e.key === 'Home') { e.preventDefault(); onChange(0) }
        if (e.key === 'End') { e.preventDefault(); onChange(1) }
      }}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d={arc(-135, 135)} className="track" />
        {value > 0.003 && <path d={arc(-135, ang)} className="track-on" />}
        <circle cx={32} cy={32} r={R} className="cap-skirt" />
        <circle cx={32} cy={32} r={R - 5} className="cap-top" />
        <line x1={32} y1={32} x2={32} y2={32 - R + 3} className="pointer" transform={`rotate(${ang} 32 32)`} />
      </svg>
    </div>
  )
}

function LightPad({ knob, value, onChange, name, sel }: { knob: Knob; value: number; onChange: (v: number) => void; name: React.ReactNode; sel: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const down = useRef(false)
  const set = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    onChange(clamp((e.clientX - r.left) / r.width))
  }
  return (
    <div className={'tctl light' + (sel ? ' sel' : '')}>
      <div
        ref={ref}
        className="lightpad"
        style={{ ['--light' as string]: value }}
        onPointerDown={(e) => {
          down.current = true
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          set(e)
        }}
        onPointerMove={(e) => down.current && set(e)}
        onPointerUp={() => (down.current = false)}
        onPointerCancel={() => (down.current = false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(clamp(value + 0.05)) }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(clamp(value - 0.05)) }
        }}
        tabIndex={0}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-label={knob.label}
      >
        <span className="sun" style={{ left: `${value * 100}%` }}>☀</span>
        <span className="pad-hint">dark · drag · bright</span>
      </div>
      {name}
      <span className="tval">light {Math.round(value * 100)}%</span>
    </div>
  )
}
