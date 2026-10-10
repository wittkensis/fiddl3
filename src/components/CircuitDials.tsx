/** Mirrors a circuit's real pots/switches into a Dialkit panel (two-way). */
import { useDialKitController, type DialConfig } from 'dialkit'
import { useMemo, type ReactNode } from 'react'
import type { Circuit } from '../types'

export function CircuitDials({ circuit, children }: { circuit: Circuit; children: (values: Record<string, number>, set: (id: string, v: number) => void) => ReactNode }) {
  const config = useMemo(() => {
    const c: DialConfig = {}
    for (const k of circuit.knobs) {
      if (k.options) c[k.id] = { type: 'select', options: k.options.map((o, i) => ({ value: String(i), label: o.label })), default: String(Math.round(k.default)) }
      else c[k.id] = [k.default, 0, 1, 0.005]
    }
    return c
  }, [circuit])
  const ctl = useDialKitController(`${circuit.name} · pots`, config, { id: `cw-${circuit.id}` })
  const raw = ctl.values as Record<string, unknown>
  const values: Record<string, number> = {}
  for (const k of circuit.knobs) {
    const v = raw[k.id]
    values[k.id] = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : k.default
  }
  const set = (id: string, v: number) => {
    const k = circuit.knobs.find((x) => x.id === id)
    ctl.setValue(id, k?.options ? String(Math.round(v)) : v)
  }
  return <>{children(values, set)}</>
}
