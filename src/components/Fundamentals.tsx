/** Fundamentals drawer: a short primer, one word at a time, with a tiny living water diagram tied to a real knob. */
import { useEffect, useRef } from 'react'
import type { Circuit } from '../types'
import type { Sel } from '../selection'
import { TERMS, fmt, hookFor, termById, toyModel, type TermId } from '../fundamentals'

type Props = {
  circuit: Circuit
  values: Record<string, number>
  term: TermId | null
  onTerm: (t: TermId | null) => void
  onClose: () => void
  onSee: (s: Sel) => void
  /** the part the user came from, if any */
  from?: string | null
}

export function Fundamentals({ circuit, values, term, onTerm, onClose, onSee, from }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    panel.current?.focus()
  }, [term])
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [onClose])
  const t = term ? termById(term) : null
  const hook = t ? hookFor(t.id, circuit) : null

  return (
    <div className="fund" role="dialog" aria-modal="false" aria-label="Fundamentals" ref={panel} tabIndex={-1}>
      <header className="fund-head">
        {t ? (
          <button className="icon-btn" onClick={() => onTerm(null)} aria-label="Back to all words">‹</button>
        ) : null}
        <div className="fund-titles">
          <span className="kicker">Fundamentals{from ? ` · from ${from}` : ''}</span>
          <h2>{t ? <><span className="fsym">{t.sym}</span>{t.name}</> : 'Height, flow and squeeze'}</h2>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close fundamentals">×</button>
      </header>
      <div className="fund-body">
        <WaterDiagram circuit={circuit} values={values} focus={t?.id ?? null} />
        {!t ? (
          <>
            <p className="eli5 lead">Think of electricity as water on a hill. The battery lifts it up, it rushes back down through the parts, and on the way it does the work that makes sound.</p>
            <ul className="fund-list">
              {TERMS.map((x) => (
                <li key={x.id}>
                  <button onClick={() => onTerm(x.id)}>
                    <span className="fsym">{x.sym}</span>
                    <span className="fname">{x.name}</span>
                    <span className="fline">{x.eli5}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="eli5 lead">{t.eli5}</p>
            <p className="vocab">vocab: {t.unit}</p>
            <section className="fund-links" aria-label="How it links to the other words">
              <h4>How it links</h4>
              {t.links.map((l, i) => (
                <div key={i} className="flink">
                  {l.eq && <code>{l.eq}</code>}
                  <p>{l.read}</p>
                  <div className="chips">
                    {l.to.map((id) => (
                      <button key={id} className="chip" onClick={() => onTerm(id)}>{termById(id).sym} {termById(id).name}</button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
            {hook && (
              <section className="fund-see">
                <h4>See it here</h4>
                <p>{hook.text}</p>
                {hook.sel && <button className="btn restore" onClick={() => onSee(hook.sel!)}>Show me ›</button>}
              </section>
            )}
            <details className="mini">
              <summary>more</summary>
              <p className="small">{t.detail}</p>
            </details>
          </>
        )}
      </div>
    </div>
  )
}

/** Tank height = voltage, faucet gap = resistance, flowing dashes = current, wheel = power. Toy numbers driven by a real knob. */
function WaterDiagram({ circuit, values, focus }: { circuit: Circuit; values: Record<string, number>; focus: TermId | null }) {
  const m = toyModel(circuit, values)
  const h = 18 + Math.min(1, m.V / 9) * 62
  const gap = 2 + 9 * m.open
  const flow = Math.min(1, Math.log10(1 + m.I * 1e5) / 3)
  const work = Math.min(1, Math.log10(1 + m.P * 1e6) / 4)
  const hi = (id: TermId) => (focus === id ? ' hi' : '')
  return (
    <figure className="water" aria-label={`Toy model: ${fmt(m.V, 'V')} of height, ${fmt(m.R, 'Ω')} of squeeze, ${fmt(m.I, 'A')} of flow, ${fmt(m.P, 'W')} of work`}>
      <svg viewBox="0 0 300 116" style={{ ['--flow' as string]: `${(2.4 - flow * 2).toFixed(2)}s`, ['--spin' as string]: `${(6 - work * 5.4).toFixed(2)}s` }}>
        <line x1={4} y1={100} x2={296} y2={100} className="sea" />
        <text x={296} y={112} textAnchor="end" className="wl">⏚ ground</text>
        <g className={'w-v' + hi('voltage')}>
          <rect x={14} y={100 - h} width={36} height={h} className="tank" rx={3} />
          <line x1={10} y1={100 - h} x2={54} y2={100 - h} className="rail-top" />
          <text x={32} y={100 - h - 6} textAnchor="middle" className="wl">V</text>
        </g>
        <path d={`M50,92 H130 M170,92 H252`} className="pipe" />
        <g className={'w-r' + hi('resistance')}>
          <path d={`M130,${92 - 6} L150,${92 - gap / 2} L170,${92 - 6} M130,${92 + 6} L150,${92 + gap / 2} L170,${92 + 6}`} className="faucet" />
          <text x={150} y={74} textAnchor="middle" className="wl">R</text>
        </g>
        <path d="M50,92 H252" className={'stream' + hi('current')} style={{ strokeWidth: 1 + flow * 5 }} />
        <text x={90} y={84} textAnchor="middle" className={'wl' + hi('current')}>I</text>
        <g className={'w-p' + hi('power')} transform="translate(266,84)">
          <g className="wheel">
            <circle r={14} />
            {[0, 45, 90, 135].map((a) => <line key={a} x1={-14} y1={0} x2={14} y2={0} transform={`rotate(${a})`} />)}
          </g>
          <text x={0} y={-20} textAnchor="middle" className="wl">P</text>
        </g>
      </svg>
      <figcaption>
        <span>{fmt(m.V, 'V')}</span><span>{fmt(m.R, 'Ω')}</span><span>{fmt(m.I, 'A')}</span><span>{fmt(m.P, 'W')}</span>
        <em>{m.knob ? `Turn ${m.knob.label.replace(/\s*\(.*\)$/, '')} and watch. Toy numbers, not measured.` : 'Toy numbers, not measured.'}</em>
      </figcaption>
    </figure>
  )
}
