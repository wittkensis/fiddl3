/** v5 Layers stepper: L0 … Ln plus a minimal vs full toggle. Lives in the Controls tray for circuits that have layers. */
import type { Layers } from '../types'

type Props = { layers: Layers; rung: string; setRung: (id: string) => void }

const HEAR: Record<'yes' | 'some' | 'no', [string, string]> = {
  yes: ['you can hear it', 'hear-yes'],
  some: ['a little', 'hear-some'],
  no: ['explain-only', 'hear-no'],
}

export function LayerStepper({ layers, rung, setRung }: Props) {
  const main = layers.rungs.filter((r) => !r.branch)
  const branches = layers.rungs.filter((r) => r.branch)
  const cur = layers.rungs.find((r) => r.id === rung) ?? main[main.length - 1]
  const idx = main.findIndex((r) => r.id === (cur.branch ?? cur.id))
  const [hear, hearCls] = HEAR[cur.hear]
  const step = (d: number) => setRung(main[Math.max(0, Math.min(main.length - 1, idx + d))].id)
  return (
    <div className="layers" aria-label="Layers: build it up one job at a time">
      <div className="layers-row">
        <span className="layers-k" data-tip="Layers: from the most minimal working version to the real pedal, one job at a time">Layers</span>
        <div className="seg2 minfull" role="radiogroup" aria-label="Minimal or full">
          <button role="radio" aria-checked={cur.id === layers.minimal} className={cur.id === layers.minimal ? 'on' : ''} onClick={() => setRung(layers.minimal)}>{layers.minimalLabel ?? 'Minimal'}</button>
          <button role="radio" aria-checked={cur.id === layers.full} className={cur.id === layers.full ? 'on' : ''} onClick={() => setRung(layers.full)}>{layers.fullLabel}</button>
        </div>
        <div className="rungs" role="radiogroup" aria-label="Rung"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
            if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
          }}>
          {main.map((r, i) => (
            <button key={r.id} role="radio" aria-checked={cur.id === r.id} tabIndex={cur.id === r.id ? 0 : -1}
              className={'rung' + (cur.id === r.id ? ' on' : '') + (i <= idx ? ' lit' : '') + ` ${HEAR[r.hear][1]}`}
              onClick={() => setRung(r.id)} data-tip={`${r.label} · ${r.title} · ${r.count} parts`}>
              {r.label}
            </button>
          ))}
          {branches.map((r) => (
            <button key={r.id} role="radio" aria-checked={cur.id === r.id} tabIndex={-1} className={'rung branch' + (cur.id === r.id ? ' on' : '')}
              onClick={() => setRung(r.id)} data-tip={`Side branch off ${r.branch} · ${r.title}`}>
              {r.label}
            </button>
          ))}
        </div>
        <span className="layers-count" aria-label={`${cur.count} of ${layers.fullCount} parts`}>
          <b>{cur.count}</b>/{layers.fullCount} parts
          <span className="meter" aria-hidden="true"><span style={{ width: `${(100 * cur.count) / layers.fullCount}%` }} /></span>
        </span>
      </div>
      <div className="layers-why">
        <p className="layers-title"><b>{cur.label}</b> {cur.title} <span className={'hear ' + hearCls} data-tip={cur.hearNote}>{hear}</span></p>
        <div className="explain">
          <p className="eli5">{cur.why.eli5}</p>
          <details>
            <summary>more</summary>
            {cur.why.detail && <p>{cur.why.detail}</p>}
            <p><b>In the sketch:</b> {cur.hearNote}</p>
            <ul className="small">{cur.pedals.map((pd) => <li key={pd.name}><b>{pd.name}.</b> {pd.note}</li>)}</ul>
            {layers.note && <p className="muted small">{layers.note}</p>}
          </details>
        </div>
        <p className="layers-pedals small">
          <span className="muted">Stops near here:</span>{' '}
          {cur.pedals.map((pd, i) => (
            <span key={pd.name}>
              {i > 0 && ' · '}
              <a href={pd.link.url} target="_blank" rel="noreferrer" data-tip={`${pd.note} · ${pd.link.label}`}>{pd.name}{pd.year ? ` (${pd.year})` : ''} ↗</a>
            </span>
          ))}
        </p>
      </div>
    </div>
  )
}
