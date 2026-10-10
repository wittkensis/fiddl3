import { useState } from 'react'
import { palette, type ChainItem, type PaletteId } from '../build/palette'

let uidN = 0
export const newItem = (type: PaletteId): ChainItem => {
  const def = palette.find((p) => p.id === type)!
  return { uid: `b${++uidN}`, type, value: def.knob.default, bypass: false }
}

export function BuildBar({ chain, setChain }: { chain: ChainItem[]; setChain: (c: ChainItem[]) => void }) {
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= chain.length) return
    const c = [...chain]
    ;[c[i], c[j]] = [c[j], c[i]]
    setChain(c)
  }
  const dropAt = (i: number, e: React.DragEvent) => {
    e.preventDefault()
    const pid = e.dataTransfer.getData('text/palette') as PaletteId
    const c = [...chain]
    if (pid) c.splice(i, 0, newItem(pid))
    else if (dragIdx !== null) {
      const [m] = c.splice(dragIdx, 1)
      c.splice(i > dragIdx ? i - 1 : i, 0, m)
    }
    setDragIdx(null)
    setChain(c)
  }
  return (
    <div className="buildbar">
      <div className="palette" aria-label="block palette">
        {palette.map((p) => (
          <button key={p.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/palette', p.id)} onClick={() => setChain([...chain, newItem(p.id)])} title={p.order}>
            + {p.title}
          </button>
        ))}
      </div>
      <div className="presets">
        <span>Order lesson:</span>
        <button onClick={() => setChain([newItem('gain'), newItem('hardclip'), newItem('lp')])}>clip → filter</button>
        <button onClick={() => setChain([newItem('gain'), newItem('lp'), newItem('hardclip')])}>filter → clip</button>
        <button onClick={() => setChain([newItem('delay'), newItem('fuzz')])}>delay → fuzz</button>
        <button onClick={() => setChain([newItem('fuzz'), newItem('delay')])}>fuzz → delay</button>
        <button onClick={() => setChain([newItem('osc'), newItem('vca'), newItem('lp')])}>synth voice</button>
        <button onClick={() => setChain([])}>clear</button>
      </div>
      <ol className="chain" onDragOver={(e) => e.preventDefault()} onDrop={(e) => dropAt(chain.length, e)}>
        {chain.length === 0 && <li className="empty">Drag or tap blocks above to build a chain</li>}
        {chain.map((c, i) => (
          <li key={c.uid} draggable onDragStart={() => setDragIdx(i)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.stopPropagation(); dropAt(i, e) }}>
            <span className="grip">⋮⋮</span>
            {i + 1}. {palette.find((p) => p.id === c.type)!.short}
            <button onClick={() => move(i, -1)} aria-label="move left">←</button>
            <button onClick={() => move(i, 1)} aria-label="move right">→</button>
            <button onClick={() => setChain(chain.filter((x) => x.uid !== c.uid))} aria-label="remove">✕</button>
          </li>
        ))}
      </ol>
    </div>
  )
}
