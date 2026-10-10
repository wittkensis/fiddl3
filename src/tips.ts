/** Hover/long-press tooltip text: "<component type> · <name>". */
import type { BoardPart, Part, PartKind } from './types'

const KIND: Record<PartKind, string> = {
  R: 'Resistor', C: 'Capacitor', CP: 'Capacitor (electrolytic)', D: 'Diode', DD: 'Diode pair', LED: 'LED', Q: 'Transistor (NPN)', QP: 'Transistor (PNP)',
  JFET: 'Transistor (JFET)', OPAMP: 'Chip (op-amp)', IC: 'Chip', POT: 'Dial (potentiometer)', TRIM: 'Trimmer (small dial)', LDR: 'Photocell',
  L: 'Coil', XFMR: 'Transformer', SPK: 'Speaker', SW: 'Switch', JACK: 'Jack', OSC: 'Oscillator', MULT: 'Multiplier', BOX: 'Box', BAT: 'Battery', WIRE: 'Wire',
}

const FP: Partial<Record<BoardPart['fp'], string>> = {
  R: 'Resistor', D: 'Diode', CC: 'Capacitor (ceramic)', CF: 'Capacitor (film)', CP: 'Capacitor (electrolytic)', DIP: 'Chip', POT: 'Dial (potentiometer)',
  SWPOT: 'Dial + power switch', TRIM: 'Trimmer (small dial)', LDR: 'Photocell', LED: 'LED', JACK: 'Jack', JACK3: 'Jack (stereo)', DCJ: 'Power jack',
  BAT: 'Battery', FSW3: 'Footswitch (3PDT)', TOG: 'Switch', JMP3: 'Jumper', SPK: 'Speaker', XFMR: 'Transformer', PAD: 'Wire pad', AMP: 'Amplifier',
  FELT: 'Felt damper', WOODBOX: 'Wooden box',
}

export function partType(p: Part) {
  return KIND[p.kind] ?? 'Part'
}

export function boardTip(bp: BoardPart, part?: Part, extra?: string) {
  let type = FP[bp.fp] ?? 'Part'
  if ((bp.fp === 'TO92' || bp.fp === 'QCAN') && part) type = KIND[part.kind] ?? 'Transistor'
  else if (bp.fp === 'TO92' || bp.fp === 'QCAN') type = 'Transistor'
  const name = bp.fp === 'DIP' ? bp.value ?? bp.label : bp.label ?? part?.ref ?? bp.value
  const val = bp.fp !== 'DIP' && bp.value && bp.value !== name ? ` (${bp.value})` : ''
  return [type, name ? `${name}${val}` : bp.value, extra].filter(Boolean).join(' · ')
}

export function partTip(p: Part) {
  return `${partType(p)} · ${p.ref}`
}

