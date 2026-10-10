/** "About this circuit": key idea, how real the model is, sources and notes. One line until you open it. */
import type { Board, Circuit } from '../types'
import { sectionsOf } from '../circuitUtil'
import { comingNext } from '../circuits'
import { Explain } from './Explain'
import { HONESTY_LABEL } from './SectionMap'

export function About({ circuit, board }: { circuit: Circuit; board: Board }) {
  const rows = sectionsOf(circuit).filter((s) => !s.io && s.honesty)
  const count = (lvl: 'behavioral' | 'approx' | 'none') => rows.filter((s) => s.honesty!.level === lvl).length
  return (
    <details className="about">
      <summary>
        <span className="about-k">About</span>
        <span className="about-line">{circuit.keyIdea.eli5}</span>
        <span className="about-meter" aria-label="how real is this">
          {(['behavioral', 'approx', 'none'] as const).map((l) => count(l) > 0 && <span key={l} className={`hdot ${l}`} data-tip={`${count(l)} section${count(l) > 1 ? 's' : ''} ${HONESTY_LABEL[l]}`}>{count(l)}</span>)}
        </span>
        <svg className="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" /></svg>
      </summary>
      <div className="about-body">
        <section>
          <h4>Key idea</h4>
          <Explain t={circuit.keyIdea} />
          <p className="muted small">{circuit.subtitle}</p>
        </section>
        <section>
          <h4>How real is this?</h4>
          <p className="small">The sound comes from simple Web Audio building blocks that act like each section, not from a full circuit simulation.</p>
          <ul className="honesty">
            {rows.map((s) => (
              <li key={s.id}>
                <span className="dot" style={{ background: s.tint }} />
                <b>{s.title}</b>
                <span className={`hbadge ${s.honesty!.level}`}>{HONESTY_LABEL[s.honesty!.level]}</span>
                <Explain t={{ eli5: s.honesty!.eli5, detail: s.honesty!.detail }} />
              </li>
            ))}
          </ul>
          {circuit.honestyNote && <Explain t={circuit.honestyNote} />}
          <p className="muted small">
            Board layout: {board.fidelity === 'kit' ? 'part placement matches the real kit PCB' : board.fidelity === 'schematic' ? 'drawn from the schematic' : 'a generic sketch'}. {board.fidelityNote}
          </p>
        </section>
        <section>
          <h4>Sources</h4>
          <p className="links">
            <a href={circuit.source.url} target="_blank" rel="noreferrer">{circuit.source.label} ↗</a>
            {board.reference && <a href={board.reference.url} target="_blank" rel="noreferrer">{board.reference.label} ↗</a>}
            {circuit.sim ? <a href={circuit.sim.url} target="_blank" rel="noreferrer">Real simulation: {circuit.sim.label} ↗</a> : <span className="muted">No ready-made Falstad model for this one.</span>}
          </p>
          {circuit.notes && <ul className="notes">{circuit.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
          <p className="muted small">Coming next to fiddl3: {comingNext.map((c) => c.name).join(' · ')}</p>
        </section>
      </div>
    </details>
  )
}
