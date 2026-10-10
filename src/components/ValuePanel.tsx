/** v4 Value tab: a stepped slider over standard values (or a type swap), Go higher / Go lower, and an honest note. */
import type { Part } from '../types'
import type { TermId } from '../fundamentals'
import { termById } from '../fundamentals'
import { fmtValue, isAudible, readout, stepsFor } from '../v4'

type Props = { part: Part; value: number | string | undefined; onChange: (v: number | string | undefined) => void; onFund: (t: TermId) => void }

export function ValuePanel({ part, value, onChange, onFund }: Props) {
  const t = part.tune!
  const audible = isAudible(t)
  const fund = t.fund ? termById(t.fund as TermId) : null
  const badge = (
    <p className={'vbadge ' + (audible ? (t.real ? 'part' : 'yes') : 'no')}>
      <b>{audible ? (t.real ? '🔈 partly in the sketch' : '🔊 you hear this') : '🔇 explain only'}</b>
      {t.real && <span> {t.real}</span>}
    </p>
  )

  if (t.choices) {
    const cur = typeof value === 'string' ? value : t.default
    const ch = t.choices.find((c) => c.id === cur)
    return (
      <div className="vpanel">
        <div className="vchoices" role="radiogroup" aria-label={`${part.label} type`}>
          {t.choices.map((c) => (
            <button key={c.id} role="radio" aria-checked={c.id === cur} className={'vchoice' + (c.id === cur ? ' on' : '')} onClick={() => onChange(c.id === t.default ? undefined : c.id)}>
              {c.label}{c.id === t.default && <i className="defdot" aria-label="original" />}
            </button>
          ))}
        </div>
        {ch && <p className="eli5">{ch.eli5}</p>}
        <p className="toofar"><b>Too far:</b> {t.tooFar}</p>
        {badge}
        <div className="vfoot">
          {cur !== t.default && <button className="btn ghost" onClick={() => onChange(undefined)}>↺ Back to original</button>}
          {fund && <button className="wchip" onClick={() => onFund(fund.id)} data-tip={fund.eli5}><b>{fund.sym}</b> {fund.name} ›</button>}
        </div>
      </div>
    )
  }

  const steps = stepsFor(t)
  const nom = t.nominal!
  const v = typeof value === 'number' ? value : nom
  const idx = Math.max(0, steps.findIndex((s) => Math.abs(s - v) / v < 0.002))
  const nIdx = steps.findIndex((s) => Math.abs(s - nom) / nom < 0.002)
  const ro = readout(t, v)
  const dir = idx > nIdx ? 'up' : idx < nIdx ? 'down' : null
  return (
    <div className="vpanel">
      <div className="vhead">
        <output className="vread" aria-live="polite">{fmtValue(v, t.unit)}</output>
        <span className="muted small">{dir ? `was ${fmtValue(nom, t.unit)}` : t.typical ? 'starting value: typical for this design' : 'the original value'}</span>
      </div>
      <input type="range" className="vslider" min={0} max={steps.length - 1} step={1} value={idx}
        aria-label={`${part.label} value`} aria-valuetext={fmtValue(v, t.unit)}
        style={{ ['--nom' as string]: `${(nIdx / Math.max(1, steps.length - 1)) * 100}%` }}
        onChange={(e) => { const s = steps[Number(e.target.value)]; onChange(Math.abs(s - nom) / nom < 0.002 ? undefined : s) }} />
      <div className="vscale muted small"><span>{fmtValue(steps[0], t.unit)}</span><span>{t.series === 'pot' ? 'common pot sizes' : t.series === 'E6' ? 'common cap values' : 'E12 values'}</span><span>{fmtValue(steps[steps.length - 1], t.unit)}</span></div>
      {ro && (
        <div className={'vcalc' + (ro.warn ? ' warn' : '')}>
          <code>{ro.eq}</code> <b>{ro.result}</b>
          <span className="muted small"> · real-board math{ro.note ? `, ${ro.note}` : ''}</span>
        </div>
      )}
      <div className="hilo">
        <p className={dir === 'up' ? 'on' : ''}><b>▲ Go higher</b> {t.higher}</p>
        <p className={dir === 'down' ? 'on' : ''}><b>▼ Go lower</b> {t.lower}</p>
      </div>
      <p className="toofar"><b>Too far:</b> {t.tooFar}</p>
      {badge}
      <div className="vfoot">
        {dir && <button className="btn ghost" onClick={() => onChange(undefined)}>↺ Back to {fmtValue(nom, t.unit)}</button>}
        {fund && <button className="wchip" onClick={() => onFund(fund.id)} data-tip={fund.eli5}><b>{fund.sym}</b> {fund.name} ›</button>}
      </div>
    </div>
  )
}
