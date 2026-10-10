/** Left-to-right signal path drawn from circuit data: blocks → parts → rails → probe points. */
import { Fragment } from 'react'
import type { Block, Circuit, Part } from '../types'
import { INPUT_ID } from '../audio/engine'
import { L, PartGlyph } from './Symbols'
import { WIRE_COLOR, railColor } from '../circuitUtil'
import { partTip } from '../tips'

const SLOT = 84
const PAD = 26
const H = 340
const RAIL_Y = 54
const FB_Y = 112
const SIG_Y = 170
const GND_Y = 282
const MINI_Y = 296
const MINI_H = 30
const LEFT = 64

type Props = {
  circuit: Circuit
  removed: Set<string>
  bypassed: Set<string>
  selected: string | null
  probe: string
  onSelectPart: (id: string) => void
  onSelectBlock: (id: string) => void
  onProbe: (id: string) => void
  onToggleBlock: (id: string) => void
  registerMini: (id: string, el: SVGPolylineElement | null) => void
  /** Only draw these blocks (drilled in from the section map). */
  focus?: string[] | null
  onRail: (which: 'top' | 'bottom') => void
  onWire: (blockId: string, probeId: string | null) => void
  selWire?: string | null
  /** v5 Layers: new parts glow, earlier ones dim a little. */
  fresh?: Set<string>
  layered?: boolean
}

type Placed = { part: Part; cx: number }
type BlockLayout = { block: Block; x: number; w: number; parts: Placed[] }

export function layout(circuit: Circuit, focus?: string[] | null): { blocks: BlockLayout[]; width: number; mainEnd: number } {
  const keep = (b: Block) => !focus || focus.includes(b.id)
  const main = circuit.blocks.filter((b) => !b.side && keep(b))
  const side = circuit.blocks.filter((b) => b.side && keep(b))
  let x = LEFT
  const out: BlockLayout[] = []
  let mainEnd = x
  for (const [i, b] of [...main, ...side].entries()) {
    if (b.side && i === main.length) x += 30
    const parts = circuit.parts.filter((p) => p.block === b.id)
    const w = Math.max(150, parts.length * SLOT + PAD * 2)
    out.push({ block: b, x, w, parts: parts.map((part, k) => ({ part, cx: x + PAD + SLOT / 2 + k * SLOT + (w - PAD * 2 - parts.length * SLOT) / 2 })) })
    x += w + 8
    if (!b.side) mainEnd = x - 8
  }
  return { blocks: out, width: x + 30, mainEnd }
}

export function Schematic(p: Props) {
  const { circuit, removed, bypassed, selected, probe } = p
  const { blocks, width, mainEnd } = layout(circuit, p.focus)
  const showInput = !p.focus || p.focus.includes(circuit.blocks.find((b) => !b.side)?.id ?? '')
  const topC = railColor(circuit.rails.top.sign)
  const botC = railColor(circuit.rails.bottom.sign)
  const sel = circuit.parts.find((x) => x.id === selected)
  const neighbors = new Set(sel ? [...sel.connects, ...circuit.parts.filter((x) => x.connects.includes(sel.id)).map((x) => x.id)] : [])

  const partClass = (id: string) =>
    ['part', removed.has(id) && 'removed', selected === id && 'selected', neighbors.has(id) && 'neighbor', p.layered && (p.fresh?.has(id) ? 'fresh' : 'older')].filter(Boolean).join(' ')

  return (
    <svg className="schematic" viewBox={`0 0 ${width} ${H}`} width={width} height={H} role="img" aria-label={`${circuit.name} signal path`}>
      {/* rails: tap for why */}
      <g className="rail-g" onClick={() => p.onRail('top')} role="button" aria-label={`top rail: ${circuit.rails.top.label}`} data-tip={`Rail · ${circuit.rails.top.label}`}>
        <line className="rail" style={{ stroke: topC }} strokeDasharray={circuit.rails.top.sign === 'none' ? '6 6' : undefined} x1={LEFT - 30} y1={RAIL_Y} x2={width - 20} y2={RAIL_Y} />
        <line className="rail-hit" x1={0} y1={RAIL_Y} x2={width} y2={RAIL_Y} />
        <text className="rail-tag" style={{ fill: topC }} x={8} y={RAIL_Y + 5}>{circuit.rails.top.sign === '+' ? '+' : circuit.rails.top.sign === '-' ? '−' : '·'}</text>
        {circuit.rails.top.ground && <text className="rail-gnd-tag" x={20} y={RAIL_Y - 6}>⏚ ground</text>}
      </g>
      <g className="rail-g" onClick={() => p.onRail('bottom')} role="button" aria-label={`bottom rail: ${circuit.rails.bottom.label}`} data-tip={`Rail · ${circuit.rails.bottom.label}`}>
        <line className="rail" style={{ stroke: botC }} x1={LEFT - 30} y1={GND_Y} x2={width - 20} y2={GND_Y} />
        <line className="rail-hit" x1={0} y1={GND_Y} x2={width} y2={GND_Y} />
        <text className="rail-tag" style={{ fill: botC }} x={8} y={GND_Y + 5}>{circuit.rails.bottom.sign === '+' ? '+' : circuit.rails.bottom.sign === '-' ? '−' : '·'}</text>
        {circuit.rails.bottom.ground && <text className="rail-gnd-tag" x={20} y={GND_Y - 6}>⏚ ground</text>}
      </g>

      {/* input stub + probe */}
      {showInput && (
        <g>
          <line className="wire" style={{ stroke: WIRE_COLOR.audio }} x1={18} y1={SIG_Y} x2={LEFT} y2={SIG_Y} />
          <line className="wire-hit" x1={8} y1={SIG_Y} x2={LEFT} y2={SIG_Y} onClick={() => p.onProbe(INPUT_ID)} />
          <ProbeDot x={22} active={probe === INPUT_ID} label="IN" onClick={() => p.onProbe(INPUT_ID)} />
          <MiniScope x={6} w={50} id={INPUT_ID} register={p.registerMini} />
        </g>
      )}

      {blocks.map(({ block, x, w, parts }) => {
        const isBypassed = bypassed.has(block.id)
        const probeId = block.stage ? block.id : block.probeTap ? `tap:${block.id}` : null
        const end = x + w
        return (
          <g key={block.id} className={['block', block.side && 'side', isBypassed && 'bypassed'].filter(Boolean).join(' ')}>
            <rect className="block-bg" x={x} y={22} width={w} height={H - 28} rx={10} onClick={() => p.onSelectBlock(block.id)} />
            <text className="block-title" x={x + 10} y={40} onClick={() => p.onSelectBlock(block.id)} data-tip={`Block · ${block.title}`}>{block.title}</text>
            <g className="bypass-btn" onClick={() => p.onToggleBlock(block.id)} role="button" aria-label={`bypass ${block.title}`} data-tip="Bypass this block">
              <rect x={end - 44} y={27} width={38} height={20} rx={5} />
              <text x={end - 25} y={41} textAnchor="middle">{isBypassed ? 'OFF' : 'BYP'}</text>
            </g>
            {/* the signal wire through this block */}
            <line className={(block.side ? 'wire side-wire' : 'wire') + (p.selWire === block.id ? ' selwire' : '')} style={{ stroke: block.side ? WIRE_COLOR.control : WIRE_COLOR.audio }} x1={x - (block.side ? 0 : 8)} y1={SIG_Y} x2={end} y2={SIG_Y} />
            <line className="wire-hit" x1={x} y1={SIG_Y} x2={end} y2={SIG_Y} onClick={() => p.onWire(block.id, probeId)} data-tip={`${block.side ? 'Control' : 'Audio'} wire · after ${block.title}`} />
            {isBypassed && block.stage && <path className="bypass-arc" d={`M${x + 6},${SIG_Y} C${x + 30},${SIG_Y - 70} ${end - 30},${SIG_Y - 70} ${end - 6},${SIG_Y}`} />}
            {parts.map(({ part, cx }) => (
              <Fragment key={part.id}>
                <PartView part={part} cx={cx} className={partClass(part.id)} onClick={() => p.onSelectPart(part.id)} />
              </Fragment>
            ))}
            {probeId && <ProbeDot x={end - 2} active={probe === probeId} label={block.side ? 'TAP' : ''} onClick={() => p.onWire(block.id, probeId)} />}
            {probeId && <MiniScope x={x + 10} w={w - 20} id={probeId} register={p.registerMini} />}
          </g>
        )
      })}
      {mainEnd && <text className="out-label" x={mainEnd + 6} y={SIG_Y - 10}>OUT</text>}
    </svg>
  )
}

function ProbeDot({ x, active, label, onClick }: { x: number; active: boolean; label: string; onClick: () => void }) {
  return (
    <g className={active ? 'probe active' : 'probe'} onClick={onClick} role="button" aria-label="probe here">
      <circle cx={x} cy={SIG_Y} r={14} className="probe-hit" />
      <circle cx={x} cy={SIG_Y} r={6.5} />
      {label && <text x={x} y={SIG_Y + 26} textAnchor="middle">{label}</text>}
    </g>
  )
}

function MiniScope({ x, w, id, register }: { x: number; w: number; id: string; register: Props['registerMini'] }) {
  return (
    <g className="mini">
      <rect x={x} y={MINI_Y} width={w} height={MINI_H} rx={4} />
      <polyline data-w={w} transform={`translate(${x},${MINI_Y + MINI_H / 2})`} ref={(el) => register(id, el)} points="" />
    </g>
  )
}

function PartView({ part, cx, className, onClick }: { part: Part; cx: number; className: string; onClick: () => void }) {
  const h = L / 2
  let body
  switch (part.place) {
    case 'series':
      body = (
        <g transform={`translate(${cx},${SIG_Y})`}>
          <rect className="mask" x={-h} y={-12} width={L} height={24} />
          <PartGlyph kind={part.kind} />
        </g>
      )
      break
    case 'active':
      body = (
        <g>
          <line className="pwr" x1={cx} y1={RAIL_Y} x2={cx} y2={SIG_Y - 22} />
          <line className="pwr" x1={cx} y1={SIG_Y + 22} x2={cx} y2={GND_Y} />
          <g transform={`translate(${cx},${SIG_Y})`}>
            <rect className="mask" x={-h} y={-18} width={L} height={36} />
            <PartGlyph kind={part.kind} />
          </g>
        </g>
      )
      break
    case 'shunt': {
      const my = (SIG_Y + GND_Y) / 2 + 6
      body = (
        <g>
          <circle className="junction" cx={cx} cy={SIG_Y} r={3.2} />
          <line x1={cx} y1={SIG_Y} x2={cx} y2={my - h} />
          <line x1={cx} y1={my + h} x2={cx} y2={GND_Y} />
          <g transform={`translate(${cx},${my}) rotate(90)`}>
            <PartGlyph kind={part.kind} />
          </g>
        </g>
      )
      break
    }
    case 'up': {
      const my = (RAIL_Y + SIG_Y) / 2 + 4
      body = (
        <g>
          <circle className="junction" cx={cx} cy={SIG_Y} r={3.2} />
          <line x1={cx} y1={RAIL_Y} x2={cx} y2={my - h} />
          <line x1={cx} y1={my + h} x2={cx} y2={SIG_Y} />
          <g transform={`translate(${cx},${my}) rotate(90)`}>
            <PartGlyph kind={part.kind} />
          </g>
        </g>
      )
      break
    }
    case 'fb': {
      const a = cx - SLOT / 2 + 6
      const b = cx + SLOT / 2 - 6
      body = (
        <g>
          <path className="fbwire" d={`M${a},${SIG_Y} L${a},${FB_Y} L${cx - h},${FB_Y} M${cx + h},${FB_Y} L${b},${FB_Y} L${b},${SIG_Y}`} fill="none" />
          <g transform={`translate(${cx},${FB_Y})`}>
            <PartGlyph kind={part.kind} />
          </g>
        </g>
      )
      break
    }
  }
  const labelY = part.place === 'shunt' ? GND_Y - 12 : part.place === 'up' ? RAIL_Y + 16 : part.place === 'fb' ? FB_Y - 22 : SIG_Y + 40
  return (
    <g className={className} onClick={onClick} role="button" aria-label={part.label} data-tip={partTip(part)}>
      <rect className="part-hit" x={cx - SLOT / 2 + 2} y={part.place === 'up' ? RAIL_Y : part.place === 'fb' ? FB_Y - 34 : SIG_Y - 30} width={SLOT - 4} height={part.place === 'shunt' ? GND_Y - SIG_Y + 20 : part.place === 'up' ? SIG_Y - RAIL_Y + 6 : 72} rx={6} />
      {body}
      <text className="part-ref" x={part.place === 'shunt' || part.place === 'up' ? cx + 9 : cx} y={labelY} textAnchor={part.place === 'shunt' || part.place === 'up' ? 'start' : 'middle'}>
        {part.ref.length > 12 ? part.ref.slice(0, 11) + '…' : part.ref}
      </text>
      {className.includes('removed') && (
        <g className="x-mark" transform={`translate(${cx},${part.place === 'shunt' ? (SIG_Y + GND_Y) / 2 : part.place === 'up' ? (RAIL_Y + SIG_Y) / 2 : part.place === 'fb' ? FB_Y : SIG_Y})`}>
          <path d="M-12,-12 L12,12 M-12,12 L12,-12" />
        </g>
      )}
    </g>
  )
}
