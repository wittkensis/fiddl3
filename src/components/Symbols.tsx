/** Minimal schematic symbols. Drawn horizontally, centered at 0,0, leads at x = ±L/2. */
import type { PartKind } from '../types'

export const L = 46

function Lead({ a, b }: { a: number; b: number }) {
  return <line x1={a} y1={0} x2={b} y2={0} />
}

export function PartGlyph({ kind }: { kind: PartKind }) {
  const h = L / 2
  switch (kind) {
    case 'R':
    case 'POT':
    case 'TRIM':
    case 'LDR': {
      const zz = 'M-14,0 L-11,-6 L-6,6 L-1,-6 L4,6 L9,-6 L14,0'
      return (
        <g>
          <Lead a={-h} b={-14} />
          <path d={zz} fill="none" />
          <Lead a={14} b={h} />
          {kind === 'POT' && <path d="M0,-17 L0,-8 M-3,-11 L0,-7 L3,-11" fill="none" />}
          {kind === 'TRIM' && <path d="M-4,-13 L4,-13 M0,-13 L0,-8" fill="none" />}
          {kind === 'LDR' && (
            <g>
              <circle r={15} fill="none" />
              <path d="M-14,-24 L-6,-15 M-8,-19 L-6,-15 L-10,-15 M-4,-26 L4,-17 M2,-21 L4,-17 L0,-17" fill="none" className="light" />
            </g>
          )}
        </g>
      )
    }
    case 'C':
    case 'CP':
      return (
        <g>
          <Lead a={-h} b={-4} />
          <line x1={-4} y1={-10} x2={-4} y2={10} />
          {kind === 'CP' ? <path d="M5,-10 Q2,0 5,10" fill="none" /> : <line x1={4} y1={-10} x2={4} y2={10} />}
          <Lead a={kind === 'CP' ? 3 : 4} b={h} />
          {kind === 'CP' && <text x={-12} y={-12} className="sym-mini">+</text>}
        </g>
      )
    case 'D':
    case 'LED':
      return (
        <g>
          <Lead a={-h} b={-7} />
          <path d="M-7,-8 L-7,8 L6,0 Z" />
          <line x1={7} y1={-8} x2={7} y2={8} />
          <Lead a={7} b={h} />
          {kind === 'LED' && <path d="M0,-12 L6,-20 M3,-20 L6,-20 L6,-17 M6,-10 L12,-18 M9,-18 L12,-18 L12,-15" fill="none" className="light" />}
        </g>
      )
    case 'DD':
      return (
        <g>
          <Lead a={-h} b={-10} />
          <line x1={-10} y1={-9} x2={-10} y2={9} />
          <line x1={10} y1={-9} x2={10} y2={9} />
          <path d="M-10,-9 L10,-9 M-10,9 L10,9" fill="none" />
          <path d="M-5,-14 L-5,-4 L4,-9 Z M4,-14 L4,-4" />
          <path d="M5,4 L5,14 L-4,9 Z M-5,4 L-5,14" />
          <Lead a={10} b={h} />
        </g>
      )
    case 'Q':
    case 'QP':
    case 'JFET':
      return (
        <g>
          <circle r={15} fill="none" />
          <Lead a={-h} b={-6} />
          <line x1={-6} y1={-9} x2={-6} y2={9} />
          <path d="M-6,-4 L8,-14 M-6,4 L8,14" fill="none" />
          {kind === 'Q' && <path d="M3,8 L8,14 L1,13" fill="none" />}
          {kind === 'QP' && <path d="M-1,1 L-6,4 L0,7" fill="none" />}
          <line x1={8} y1={-14} x2={8} y2={-22} />
          <line x1={8} y1={14} x2={8} y2={22} />
          <Lead a={15} b={h} />
        </g>
      )
    case 'OPAMP':
      return (
        <g>
          <Lead a={-h} b={-14} />
          <path d="M-14,-16 L-14,16 L16,0 Z" fill="none" />
          <text x={-11} y={-4} className="sym-mini">−</text>
          <text x={-11} y={10} className="sym-mini">+</text>
          <Lead a={16} b={h} />
        </g>
      )
    case 'IC':
      return (
        <g>
          <Lead a={-h} b={-15} />
          <rect x={-15} y={-14} width={30} height={28} rx={2} fill="none" />
          <path d="M-9,-14 L-9,-19 M-3,-14 L-3,-19 M3,-14 L3,-19 M9,-14 L9,-19 M-9,14 L-9,19 M-3,14 L-3,19 M3,14 L3,19 M9,14 L9,19" fill="none" />
          <Lead a={15} b={h} />
        </g>
      )
    case 'OSC':
      return (
        <g>
          <Lead a={-h} b={-14} />
          <circle r={14} fill="none" />
          <path d="M-8,0 Q-4,-9 0,0 T8,0" fill="none" />
          <Lead a={14} b={h} />
        </g>
      )
    case 'MULT':
      return (
        <g>
          <Lead a={-h} b={-14} />
          <circle r={14} fill="none" />
          <path d="M-7,-7 L7,7 M-7,7 L7,-7" fill="none" />
          <Lead a={14} b={h} />
        </g>
      )
    case 'L':
      return (
        <g>
          <Lead a={-h} b={-15} />
          <path d="M-15,0 a5,5 0 0 1 10,0 a5,5 0 0 1 10,0 a5,5 0 0 1 10,0" fill="none" />
          <Lead a={15} b={h} />
        </g>
      )
    case 'XFMR':
      return (
        <g>
          <Lead a={-h} b={-14} />
          <path d="M-14,-12 a4,4 0 0 1 0,8 a4,4 0 0 1 0,8 a4,4 0 0 1 0,8" fill="none" transform="translate(4,0)" />
          <path d="M-2,-14 L-2,14 M2,-14 L2,14" fill="none" />
          <path d="M14,-14 a3,3 0 0 0 0,6 a3,3 0 0 0 0,6 a3,3 0 0 0 0,6 a3,3 0 0 0 0,6" fill="none" transform="translate(-6,0)" />
          <Lead a={10} b={h} />
          <text x={-18} y={-17} className="sym-mini">8Ω</text>
          <text x={6} y={-17} className="sym-mini">hi-Z</text>
        </g>
      )
    case 'SPK':
      return (
        <g>
          <Lead a={-h} b={-10} />
          <rect x={-10} y={-7} width={8} height={14} fill="none" />
          <path d="M-2,-7 L10,-16 L10,16 L-2,7" fill="none" />
        </g>
      )
    case 'SW':
      return (
        <g>
          <Lead a={-h} b={-10} />
          <circle cx={-10} cy={0} r={2.5} />
          <line x1={-10} y1={0} x2={10} y2={-10} />
          <circle cx={11} cy={0} r={2.5} />
          <Lead a={11} b={h} />
        </g>
      )
    case 'JACK':
      return (
        <g>
          <Lead a={-h} b={-6} />
          <path d="M-6,-10 L-6,10 L6,10 L6,-4 L0,-10 Z" fill="none" />
          <Lead a={6} b={h} />
        </g>
      )
    case 'BOX':
      return (
        <g>
          <Lead a={-h} b={-17} />
          <rect x={-17} y={-11} width={34} height={22} fill="none" />
          <path d="M-17,-11 L-11,-17 L23,-17 L17,-11 M23,-17 L23,5 L17,11" fill="none" />
          <path d="M-8,-1 Q-4,-6 0,-1 T8,-1" fill="none" className="light" />
          <Lead a={17} b={h} />
        </g>
      )
    case 'BAT':
      return (
        <g>
          <Lead a={-h} b={-4} />
          <line x1={-4} y1={-12} x2={-4} y2={12} />
          <line x1={4} y1={-6} x2={4} y2={6} />
          <Lead a={4} b={h} />
        </g>
      )
    case 'WIRE':
      return (
        <g>
          <Lead a={-h} b={h} />
          <circle r={4} />
        </g>
      )
  }
}
