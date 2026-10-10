/** The inspector: whatever you tapped, ELI5 first, details in compact tabs. On phones it is a bottom sheet. */
import { useEffect, useState, type ReactNode, type RefObject } from 'react'
import type { Board, Circuit, InputKind, Net } from '../types'
import type { Sel } from '../selection'
import { INPUT_ID } from '../audio/engine'
import { WIRE_COLOR, LINK_COLOR, linksOf, railColor, sectionOfPart, sectionsOf } from '../circuitUtil'
import { boardTip, partTip } from '../tips'
import { Explain } from './Explain'
import { legendText } from './Legend'
import { HONESTY_LABEL } from './SectionMap'
import { Tabs } from './Tabs'
import { termById, termsForPart, type TermId } from '../fundamentals'
import { ValuePanel } from './ValuePanel'
import { LugPanel } from './LugPanel'
import { InsidePanel, PinoutPanel } from './PinoutPanel'
import { tuneLabel } from '../v4'
import type { PartValues } from '../audio/resolve'

type Props = {
  circuit: Circuit
  board: Board
  sel: Sel
  removed: Set<string>
  bypassed: Set<string>
  probe: string
  probeName: string
  onSel: (s: Sel) => void
  onTogglePart: (id: string) => void
  onToggleBlock: (id: string) => void
  onDrill: (sectionId: string) => void
  onShow: (view: 'board' | 'path') => void
  onRestore: () => void
  canvas: RefObject<HTMLCanvasElement | null>
  inCanvas: RefObject<HTMLCanvasElement | null>
  input: InputKind
  defaultInput: InputKind
  onInput: (k: InputKind) => void
  listen: boolean
  onListen: (v: boolean) => void
  onFund: (t: TermId, from: string) => void
  partVals: PartValues
  onPartVal: (id: string, v: number | string | undefined) => void
  onResetVals: () => void
  fswOn: boolean
  onFsw: () => void
  knobValues: Record<string, number>
  setKnob: (id: string, v: number) => void
  hiNet: string | null
  onHiNet: (id: string | null) => void
}

/** Built-in test sounds. One is each circuit's default; the rest show how it treats other material. */
export const MELODIES: { id: InputKind; label: string; tip: string }[] = [
  { id: 'pluck', label: 'bass pluck', tip: 'A plucked bass line: E, A, D, A' },
  { id: 'riff', label: 'riff in A', tip: 'A short guitar riff in A minor pentatonic' },
  { id: 'arp', label: 'arpeggio', tip: 'Am, F, C, G chords played one note at a time' },
  { id: 'stomp', label: 'heel stomps', tip: 'Heel knocks on a wooden box' },
  { id: 'drone', label: 'drone', tip: 'A steady A and E that slowly swells' },
  { id: 'tone', label: 'clean sine', tip: 'A pure 110 Hz test tone' },
  { id: 'mic', label: 'mic', tip: 'Your microphone (asks for permission)' },
  { id: 'off', label: 'none', tip: 'No input' },
]

const KIND_WORD: Record<Net['kind'], string> = { audio: 'Audio wire', control: 'Control wire', plus: '+ supply wire', minus: '− supply wire', bias: 'Resting-voltage wire' }

type View = { kicker: string; title: string; color?: string; body: ReactNode; probeWant?: string | null; terms?: TermId[] }

export function Inspector(p: Props) {
  const { circuit, sel } = p
  const [sheet, setSheet] = useState(false)
  const [scopeBig, setScopeBig] = useState(false)
  useEffect(() => {
    if (sel) setSheet(true)
  }, [sel])

  const chip = (id: string) => {
    const o = circuit.parts.find((x) => x.id === id)
    if (!o) return null
    return <button key={id} className="chip" onClick={() => p.onSel({ kind: 'part', id })} data-tip={partTip(o)}>{o.ref}<span> · {o.label.split('(')[0].trim()}</span></button>
  }
  const view = describe(p, chip)
  const pulled = p.removed.size + p.bypassed.size
  const nChanged = Object.keys(p.partVals).length
  const big = scopeBig || !!view?.probeWant

  return (
    <aside className={'inspector' + (sheet ? ' sheet-open' : '')} aria-label="Inspector">
      <header className="insp-head">
        <button className="sheet-handle" onClick={() => setSheet(!sheet)} aria-label={sheet ? 'Lower the inspector' : 'Raise the inspector'} aria-expanded={sheet}><i /></button>
        <div className="insp-titles">
          <span className="kicker" style={view?.color ? { color: view.color } : undefined}>{view ? view.kicker : 'Inspector'}</span>
          <h2>{view ? view.title : 'Tap anything'}</h2>
        </div>
        {sel && <button className="icon-btn" onClick={() => p.onSel(null)} aria-label="Clear selection" data-tip="Clear">×</button>}
      </header>
      <div className="insp-body" aria-live="polite">
        {pulled > 0 && (
          <div className="restore-bar">
            <span>{p.removed.size} pulled · {p.bypassed.size} bypassed</span>
            <button onClick={p.onRestore}>Restore all</button>
          </div>
        )}
        {nChanged > 0 && (
          <div className="restore-bar changed">
            <span>Changed parts ({nChanged}): {Object.keys(p.partVals).map((id) => {
              const o = circuit.parts.find((x) => x.id === id)
              return o ? <button key={id} className="linkish" onClick={() => p.onSel({ kind: 'part', id })}>{o.ref} {tuneLabel(o, p.partVals[id])}</button> : null
            })}</span>
            <button onClick={p.onResetVals}>Reset all</button>
          </div>
        )}
        {view ? view.body : (
          <div className="empty">
            <p className="eli5">Tap any part, wire, knob or box to see what it does and why it is there.</p>
            <ul className="hints">
              <li><b>Hover</b> (or long-press) for a quick name.</li>
              <li><b>Turn a knob</b> on the board or in Controls and listen.</li>
              <li><b>Pull a part</b> to hear what it was doing.</li>
            </ul>
          </div>
        )}
        {view?.terms && view.terms.length > 0 && (
          <div className="whyword">
            <span>Why this word matters here</span>
            {view.terms.map((t) => (
              <button key={t} className="wchip" onClick={() => p.onFund(t, view.title)} data-tip={termById(t).eli5}>
                <b>{termById(t).sym}</b> {termById(t).name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={'probebox' + (big ? ' big' : '')}>
        <div className="melodies" role="radiogroup" aria-label="Test sound going in">
          {MELODIES.map((m) => (
            <button key={m.id} role="radio" aria-checked={p.input === m.id} className={'mel' + (p.input === m.id ? ' on' : '') + (m.id === 'mic' || m.id === 'off' ? ' minor' : '')}
              onClick={() => p.onInput(m.id)} data-tip={`${m.tip}${m.id === p.defaultInput ? ' (this circuit\'s default)' : ''}`}>
              {m.label}{m.id === p.defaultInput && <i className="defdot" aria-label="default" />}
            </button>
          ))}
        </div>
        <div className="duo">
          <figure className="pane">
            <figcaption>In · {MELODIES.find((m) => m.id === p.input)?.label}</figcaption>
            <canvas ref={p.inCanvas} className="scope in" />
          </figure>
          <figure className="pane out">
            <figcaption data-tip="The scope shows the signal at the probe point. Tap a wire to move it.">Out · {p.probeName}</figcaption>
            <canvas ref={p.canvas} className="scope" />
          </figure>
        </div>
        {p.defaultInput === 'off' && p.input !== 'off' && <p className="note muted small">This circuit makes its own sound, so the input never reaches the output.</p>}
        <div className="probebox-foot">
          <button className={'listen' + (p.listen ? ' on' : '')} aria-pressed={p.listen} onClick={() => p.onListen(!p.listen)} data-tip={p.listen ? 'You hear the probe point. Tap to hear the output again.' : 'Hear the probe point instead of the output'}>
            {p.listen ? '🎧 hearing the probe' : '🎧 hear the probe'}
          </button>
          <button className="icon-btn" onClick={() => setScopeBig(!scopeBig)} aria-label={big ? 'Shrink the scopes' : 'Grow the scopes'} aria-pressed={big} data-tip={big ? 'Smaller scopes' : 'Bigger scopes with a spectrum'}>{big ? '▾' : '▴'}</button>
        </div>
      </div>
    </aside>
  )
}

function ProbeNote({ probe, want, kind }: { probe: string; want: string | null | undefined; kind?: Net['kind'] }) {
  if (!want) {
    const what = kind === 'plus' || kind === 'minus' ? 'a steady supply voltage' : kind === 'bias' ? 'a steady resting voltage or an internal timing ramp' : kind === 'control' ? "light or a control signal the model doesn't simulate" : "something the model doesn't simulate"
    return <p className="note muted">Nothing to scope here: this wire carries {what}.</p>
  }
  return <p className="note acc">{probe === want ? 'The scope below shows this point.' : 'Tap it again to move the scope here.'}{want === INPUT_ID ? ' (same as the input)' : ''}</p>
}

function describe(p: Props, chip: (id: string) => ReactNode): View | null {
  const { circuit, sel, board } = p
  if (!sel) return null

  if (sel.kind === 'part') {
    const part = circuit.parts.find((x) => x.id === sel.id)
    if (!part) return null
    const block = circuit.blocks.find((b) => b.id === part.block)
    const section = sectionOfPart(circuit, part.id)
    const isOut = p.removed.has(part.id)
    const others = circuit.parts.filter((o) => o.id !== part.id && (part.connects.includes(o.id) || o.connects.includes(part.id)))
    const mine = new Set(board.parts.filter((b) => b.part === part.id).map((b) => b.id))
    const wires = board.nets.filter((n) => n.pins.some((k) => mine.has(k.split('.')[0])))
    return {
      kicker: partTip(part),
      title: part.label,
      terms: termsForPart(part),
      body: (
        <>
          <p className="eli5 lead">{part.job.eli5}</p>
          <p className="vocab">vocab: {part.term}{section ? ` · in ${section.title}` : ''}{p.partVals[part.id] !== undefined && <b className="nowval"> · changed to {tuneLabel(part, p.partVals[part.id])}</b>}</p>
          <Tabs
            key={part.id}
            label="About this part"
            initial={part.chip ? 'pinout' : part.lugs?.kind === 'fsw3' ? 'lugs' : 'job'}
            tabs={[
              { id: 'job', label: 'Job', body: <>{part.job.detail ? <p>{part.job.detail}</p> : <p className="muted">That line above is the whole job.</p>}<p className="muted small">In {block?.title}.</p><div className="callout"><b>Why here</b><Explain t={part.order} /></div></> },
              ...(part.tune ? [{ id: 'value', label: 'Value', body: <ValuePanel part={part} value={p.partVals[part.id]} onChange={(v) => p.onPartVal(part.id, v)} onFund={(t) => p.onFund(t, part.label)} /> }] : []),
              ...(part.lugs ? [{ id: 'lugs', label: 'Lugs', body: <LugPanel part={part} circuit={circuit} board={board} fswOn={p.fswOn} onFsw={p.onFsw} values={p.knobValues} setValue={p.setKnob} hiNet={p.hiNet} onHiNet={p.onHiNet} /> }] : []),
              ...(part.chip ? [
                { id: 'pinout', label: 'Pinout', body: <PinoutPanel use={part.chip} board={board} hiNet={p.hiNet} onHiNet={p.onHiNet} /> },
                { id: 'inside', label: 'Inside', body: <InsidePanel use={part.chip} /> },
              ] : []),
              {
                id: 'wires', label: 'Wires', body: (
                  <>
                    <div className="chips">{others.length ? others.map((o) => chip(o.id)) : <span className="muted">Only the rails and the outside world.</span>}</div>
                    {wires.length > 0 && (
                      <div className="chips">
                        {wires.map((n) => (
                          <button key={n.id} className="chip wirechip" style={{ ['--wc' as string]: WIRE_COLOR[n.kind] }} onClick={() => p.onSel({ kind: 'net', id: n.id })} data-tip={`${KIND_WORD[n.kind]} · ${n.name}`}>{n.name}</button>
                        ))}
                      </div>
                    )}
                  </>
                ),
              },
              { id: 'pull', label: 'If pulled', body: <Explain t={part.breaks} /> },
            ]}
          />
          <div className="actions">
            <button className={isOut ? 'btn restore' : 'btn pull'} onClick={() => p.onTogglePart(part.id)}>{isOut ? '↩ Put it back' : '✂ Pull it and listen'}</button>
            <button className="btn ghost" onClick={() => p.onShow('board')}>On board</button>
            <button className="btn ghost" onClick={() => p.onShow('path')}>In path</button>
          </div>
          {isOut && (part.silentNote || !part.onRemove?.length) && <p className="note warm">{part.silentNote ?? "The model doesn't change the sound for this part. The 'If pulled' tab says what the real circuit does."}</p>}
        </>
      ),
    }
  }

  if (sel.kind === 'block' || sel.kind === 'wire') {
    const block = circuit.blocks.find((b) => b.id === sel.id)
    if (!block) return null
    if (sel.kind === 'wire') {
      const want = block.stage ? block.id : block.probeTap ? `tap:${block.id}` : null
      return {
        kicker: block.side ? 'Control wire' : 'Audio wire',
        color: WIRE_COLOR[block.side ? 'control' : 'audio'],
        title: `After ${block.title}`,
        probeWant: want,
        body: (
          <>
            <Explain t={block.wire ?? { eli5: block.side ? 'Instructions for another block travel here.' : 'The sound after this block travels here to the next one.' }} />
            <ProbeNote probe={p.probe} want={want} />
          </>
        ),
      }
    }
    const on = !p.bypassed.has(block.id)
    return {
      kicker: 'Block',
      title: block.title,
      body: (
        <>
          <Explain t={block.job} />
          <details className="mini"><summary>Parts ({circuit.parts.filter((x) => x.block === block.id).length})</summary><div className="chips">{circuit.parts.filter((x) => x.block === block.id).map((x) => chip(x.id))}</div></details>
          <div className="actions"><button className={on ? 'btn pull' : 'btn restore'} onClick={() => p.onToggleBlock(block.id)}>{on ? '⏻ Bypass this block' : '↩ Bring it back'}</button></div>
        </>
      ),
    }
  }

  if (sel.kind === 'rail') {
    const r = circuit.rails[sel.id]
    return {
      kicker: `${r.sign === '+' ? 'Positive supply rail' : r.sign === '-' ? 'Negative supply rail' : 'Reference line'}${r.ground ? ' · ground' : ''}`,
      color: railColor(r.sign),
      title: r.label,
      terms: r.ground ? ['ground', 'voltage'] : ['voltage', 'signal'],
      body: (
        <>
          <Explain t={{ eli5: r.eli5, detail: r.detail }} />
          {r.ground && <div className="callout"><b>What is ground?</b><Explain t={{ eli5: 'The shared floor every voltage is measured from, like sea level. Every signal comes back here to finish its loop.', detail: circuit.groundNote.eli5 }} /></div>}
        </>
      ),
    }
  }

  if (sel.kind === 'legend') {
    const L = legendText(circuit, sel.id)
    const lt: Record<string, TermId[]> = { audio: ['signal', 'acdc'], plus: ['voltage'], minus: ['voltage', 'ground'], control: ['frequency'], bias: ['voltage', 'resistance'], ground: ['ground'] }
    return { kicker: `Key · ${L.term}`, title: L.title, body: <Explain t={L.t} />, terms: lt[sel.id] }
  }

  if (sel.kind === 'net') {
    const net = board.nets.find((n) => n.id === sel.id)
    if (!net) return null
    const partsOn = [...new Set(net.pins.map((k) => board.parts.find((b) => b.id === k.split('.')[0])?.part).filter(Boolean) as string[])]
    return {
      kicker: `${KIND_WORD[net.kind]}${net.pour ? ' · copper pour' : ''}`,
      color: WIRE_COLOR[net.kind],
      title: net.name,
      terms: net.kind === 'audio' ? ['signal', 'acdc'] : net.kind === 'control' ? ['frequency'] : ['voltage', 'current'],
      probeWant: net.probe ?? null,
      body: (
        <>
          <Explain t={{ eli5: net.eli5, detail: net.detail }} />
          <details className="mini"><summary>Joins {net.pins.length} legs on {partsOn.length} parts</summary><div className="chips">{partsOn.map(chip)}</div></details>
          <ProbeNote probe={p.probe} want={net.probe} kind={net.kind} />
        </>
      ),
    }
  }

  if (sel.kind === 'link') {
    const l = linksOf(circuit).find((x) => x.id === sel.id)
    if (!l) return null
    const secs = sectionsOf(circuit)
    const a = secs.find((s) => s.id === l.from), b = secs.find((s) => s.id === l.to)
    return {
      kicker: `${l.kind === 'power' ? 'Power' : l.kind === 'audio' ? 'Audio' : 'Control'} link${l.optional ? ' · only sometimes' : ''}`,
      color: LINK_COLOR[l.kind],
      title: l.label,
      probeWant: l.kind !== 'power' ? l.probe ?? null : undefined,
      body: (
        <>
          <Explain t={{ eli5: l.eli5, detail: l.detail }} />
          <div className="chips">
            {a && <button className="chip" onClick={() => p.onSel({ kind: 'section', id: a.id })}>from {a.title}</button>}
            {b && <button className="chip" onClick={() => p.onSel({ kind: 'section', id: b.id })}>to {b.title}</button>}
          </div>
          {l.kind !== 'power' && <ProbeNote probe={p.probe} want={l.probe} kind={l.kind === 'control' ? 'control' : 'audio'} />}
        </>
      ),
    }
  }

  if (sel.kind === 'section') {
    const s = sectionsOf(circuit).find((x) => x.id === sel.id)
    if (!s) return null
    const parts = circuit.parts.filter((x) => s.blocks.includes(x.block))
    return {
      kicker: `${s.io ? 'Endpoint' : 'Section'} · ${s.term}`,
      color: s.tint,
      title: s.title,
      body: (
        <>
          <Explain t={{ eli5: s.eli5, detail: s.detail }} />
          {s.honesty && <p className="note"><span className={`hbadge ${s.honesty.level}`}>{HONESTY_LABEL[s.honesty.level]}</span> {s.honesty.eli5}</p>}
          {!s.io && parts.length > 0 && <details className="mini"><summary>Parts ({parts.length})</summary><div className="chips">{parts.map((x) => chip(x.id))}</div></details>}
          {!s.io && s.blocks.length > 0 && <div className="actions"><button className="btn restore" onClick={() => p.onDrill(s.id)}>Open its signal path ›</button></div>}
        </>
      ),
    }
  }

  if (sel.kind === 'bpart') {
    const bp = board.parts.find((b) => b.id === sel.id)
    if (!bp) return null
    return {
      kicker: boardTip(bp),
      title: `${bp.label ?? ''} ${bp.value ?? ''}`.trim() || 'Board part',
      body: <p className="eli5">This piece belongs to the {bp.fp === 'PAD' ? 'wiring' : 'build'} and has no write-up of its own yet. Tap a wire next to it to read what travels there.</p>,
    }
  }
  return null
}
