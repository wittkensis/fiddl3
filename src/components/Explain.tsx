import type { Text } from '../types'

/** ELI5 line first; the plain follow-up waits under "more". */
export function Explain({ t, term }: { t: Text | undefined; term?: string }) {
  if (!t) return null
  return (
    <div className="explain">
      <p className="eli5">{t.eli5}</p>
      {term && <span className="term">vocab: {term}</span>}
      {t.detail && (
        <details>
          <summary>more</summary>
          <p>{t.detail}</p>
        </details>
      )}
    </div>
  )
}
