/** Build-mode block palette: each block is a tiny circuit with its own "why". */
import type { Circuit, Part, PartKind, StageSpec, Text } from '../types'

export type PaletteId = 'gain' | 'hardclip' | 'softclip' | 'fuzz' | 'lp' | 'hp' | 'osc' | 'vca' | 'ring' | 'delay'

type PalPart = { kind: PartKind; label: string; term: string; place: Part['place']; job: Text; breaks: Text }
type PaletteDef = {
  id: PaletteId
  title: string
  short: string
  spec: StageSpec
  knob: { label: string; param: string; from: number; to: number; curve?: 'lin' | 'exp'; default: number }
  parts: PalPart[]
  /** ELI5 line on why the spot in the chain matters. */
  order: string
}

export const palette: PaletteDef[] = [
  {
    id: 'gain', title: 'Gain stage', short: 'GAIN', spec: { kind: 'shaper', params: { curve: 'clean', drive: 4, level: 0.35 } },
    knob: { label: 'Gain', param: 'drive', from: 1, to: 20, curve: 'exp', default: 0.4 },
    parts: [{ kind: 'Q', label: 'Transistor', term: 'BJT gain stage', place: 'active', job: { eli5: 'A tiny push in makes a big push out, like a lever.', detail: 'The transistor copies the small input wiggle onto the battery power, so the copy comes out bigger.' }, breaks: { eli5: 'Nothing gets louder.' } }],
    order: 'Put it before a clipper and it decides how hard the clipper gets hit. Put it after and it only turns things up.',
  },
  {
    id: 'hardclip', title: 'Diode clipper (to ground)', short: 'HARD CLIP', spec: { kind: 'shaper', params: { curve: 'hard', drive: 6, level: 0.6 } },
    knob: { label: 'Drive', param: 'drive', from: 1, to: 40, curve: 'exp', default: 0.4 },
    parts: [
      { kind: 'R', label: 'Series resistor', term: 'series R', place: 'series', job: { eli5: 'A narrow pipe that slows the flow so the diodes can hold the level.', detail: 'Without it, the diodes would try to soak up everything the stage before can push.' }, breaks: { eli5: 'The diodes yank too hard and it gets very harsh.' } },
      { kind: 'DD', label: 'Diodes to ground', term: 'shunt diodes', place: 'shunt', job: { eli5: 'A low ceiling: the wave bumps its head and goes flat on top.', detail: 'Flat tops add lots of extra buzzy tones (odd harmonics, meaning the 3rd, 5th, 7th multiples of the note).' }, breaks: { eli5: 'No ceiling, so no clipping.' } },
    ],
    order: 'Clip first, filter after: the filter sweeps up the fizz. Filter first: less gets clipped, but it still buzzes.',
  },
  {
    id: 'softclip', title: 'Diodes in feedback (soft)', short: 'SOFT CLIP', spec: { kind: 'shaper', params: { curve: 'soft', drive: 5, level: 0.6 } },
    knob: { label: 'Drive', param: 'drive', from: 1, to: 40, curve: 'exp', default: 0.4 },
    parts: [
      { kind: 'OPAMP', label: 'Op-amp', term: 'op-amp (operational amplifier)', place: 'active', job: { eli5: 'A loudness machine that listens to its own output to stay in check.', detail: 'The parts in its feedback loop (the path from output back to input) set how much it boosts.' }, breaks: { eli5: 'No boost at all.' } },
      { kind: 'DD', label: 'Diodes in the loop', term: 'feedback diodes', place: 'fb', job: { eli5: 'A soft cushion: loud peaks get squished, not chopped.', detail: 'The diodes turn the boost down only when the signal gets big, so the tops come out rounded.' }, breaks: { eli5: 'A clean boost with no grit.' } },
    ],
    order: 'Same order lesson as the hard clipper, just gentler.',
  },
  {
    id: 'fuzz', title: 'Misbiased transistor (fuzz)', short: 'FUZZ', spec: { kind: 'shaper', params: { curve: 'fuzz', drive: 12, bias: 0.3, level: 0.5 } },
    knob: { label: 'Bias', param: 'bias', from: -0.95, to: 0.95, default: 0.6 },
    parts: [{ kind: 'QP', label: 'Transistor + bias trim', term: 'bias (resting point)', place: 'active', job: { eli5: 'A seesaw that rests tilted, so one side slams the ground first.', detail: 'The bias sets where the transistor sits when nothing plays. Off-center means lopsided, sputtery fuzz.' }, breaks: { eli5: 'No fuzz.' } }],
    order: 'Fuzz likes the raw guitar straight in. A filter in front makes it sputter and fart out.',
  },
  {
    id: 'lp', title: 'RC low-pass', short: 'LOW-PASS', spec: { kind: 'lp', params: { freq: 1200, q: 0.7 } },
    knob: { label: 'Cutoff', param: 'freq', from: 150, to: 9000, curve: 'exp', default: 0.5 },
    parts: [
      { kind: 'R', label: 'Series resistor', term: 'series R', place: 'series', job: { eli5: 'A narrow hallway that feeds the cap slowly.', detail: 'Together with the cap it sets where the treble starts to drop.' }, breaks: { eli5: 'No filtering.' } },
      { kind: 'C', label: 'Cap to ground', term: 'shunt capacitor', place: 'shunt', job: { eli5: 'A side door that fast wiggles (treble) slip out of.', detail: 'A capacitor lets quick changes through easily, so high notes leak to ground and the rest stays.' }, breaks: { eli5: 'Full treble comes through.' } },
    ],
    order: 'After a clipper it sweeps up fizz. Before a clipper it changes what gets clipped (darker, but still buzzy).',
  },
  {
    id: 'hp', title: 'RC high-pass', short: 'HIGH-PASS', spec: { kind: 'hp', params: { freq: 300 } },
    knob: { label: 'Cutoff', param: 'freq', from: 30, to: 3000, curve: 'exp', default: 0.5 },
    parts: [
      { kind: 'C', label: 'Series cap', term: 'coupling capacitor', place: 'series', job: { eli5: 'A gate that only swings for quick pushes, so slow rumble (bass) stays out.', detail: 'It also blocks steady battery voltage (DC, the flat part) from leaking between stages.' }, breaks: { eli5: 'Bass comes through.' } },
      { kind: 'R', label: 'Resistor to ground', term: 'pulldown R', place: 'shunt', job: { eli5: 'An anchor that keeps the far side of the cap from drifting.', detail: 'It gives the cap a fixed reference so the level stays steady.' }, breaks: { eli5: 'The level floats and pops.' } },
    ],
    order: 'Before a clipper it keeps the bass tight (the Tube Screamer trick). After, it just thins things out.',
  },
  {
    id: 'osc', title: 'Oscillator (R·C sets pitch)', short: 'OSC', spec: { kind: 'osc', params: { freq: 220, wave: 'sawtooth', level: 0.4 } },
    knob: { label: 'Pitch (R)', param: 'freq', from: 40, to: 2000, curve: 'exp', default: 0.4 },
    parts: [
      { kind: 'IC', label: 'Schmitt chip', term: 'Schmitt trigger inverter', place: 'active', job: { eli5: 'A light switch that flips every time a bucket gets full or empty.', detail: 'Each flip starts the cap filling the other way, so it keeps flipping and makes a tone.' }, breaks: { eli5: 'No tone.' } },
      { kind: 'C', label: 'Timing cap', term: 'timing capacitor', place: 'shunt', job: { eli5: 'The bucket. A bigger bucket fills slower, so the note drops.', detail: 'The resistor is the hose; together they set the pitch.' }, breaks: { eli5: 'Nothing oscillates.' } },
    ],
    order: 'It makes its own sound and ignores what came before, so put it first.',
  },
  {
    id: 'vca', title: 'VCA (LFO on gain)', short: 'VCA/TREM', spec: { kind: 'trem', params: { rate: 5, depth: 0.9, wave: 'square' } },
    knob: { label: 'Rate', param: 'rate', from: 0.5, to: 30, curve: 'exp', default: 0.4 },
    parts: [{ kind: 'OPAMP', label: 'Volume chip', term: 'VCA (voltage controlled amplifier)', place: 'active', job: { eli5: 'A hand on the volume knob, turned by a slow wobble.', detail: 'An LFO (low frequency oscillator, a wobble too slow to hear as a note) moves the volume up and down.' }, breaks: { eli5: 'Steady volume.' } }],
    order: 'Before distortion the chop gets squashed flat. After, it chops cleanly.',
  },
  {
    id: 'ring', title: 'Ring mod (×)', short: 'RING ×', spec: { kind: 'ringmod', params: { carrier: 440, wet: 1.4, dry: 0, balance: 1 } },
    knob: { label: 'Carrier', param: 'carrier', from: 30, to: 2500, curve: 'exp', default: 0.5 },
    parts: [{ kind: 'MULT', label: 'Multiplier', term: 'four-quadrant multiplier', place: 'active', job: { eli5: 'Two songs shaken together: you hear new notes that neither one played.', detail: 'Multiplying makes the sum and the difference of the two pitches, which sound clangy and bell-like.' }, breaks: { eli5: 'You hear the dry signal only.' } }],
    order: 'Before distortion it gets grindy and thick. After distortion the extra tones ring out like bells.',
  },
  {
    id: 'delay', title: 'Delay (PT2399)', short: 'DELAY', spec: { kind: 'delay', params: { time: 0.3, feedback: 0.45, wet: 0.6, dry: 1, tone: 3500 } },
    knob: { label: 'Time', param: 'time', from: 0.03, to: 0.6, curve: 'exp', default: 0.5 },
    parts: [{ kind: 'IC', label: 'Delay chip', term: 'PT2399 echo chip', place: 'active', job: { eli5: 'A tape recorder that plays back a moment later.', detail: 'It stores the sound in memory and plays it back, then feeds some back in for more repeats.' }, breaks: { eli5: 'No echo.' } }],
    order: 'Delay before distortion: the repeats get crushed together. After: clean echoes of a distorted note.',
  },
]

export type ChainItem = { uid: string; type: PaletteId; value: number; bypass: boolean }

/** Turn a build-mode chain into a Circuit so the same schematic, probe and audio code runs it. */
export function chainToCircuit(chain: ChainItem[]): Circuit {
  const blocks: Circuit['blocks'] = []
  const parts: Part[] = []
  const knobs: Circuit['knobs'] = []
  chain.forEach((item, i) => {
    const def = palette.find((p) => p.id === item.type)!
    const prev = chain[i - 1]
    const next = chain[i + 1]
    const prevName = prev ? palette.find((p) => p.id === prev.type)!.title : 'the input'
    const nextName = next ? palette.find((p) => p.id === next.type)!.title : 'the output'
    blocks.push({ id: item.uid, title: `${i + 1}. ${def.short}`, job: { eli5: def.parts[0].job.eli5, detail: def.title }, wire: { eli5: `This wire carries the sound from ${def.title} to ${nextName}.` }, stage: { kind: def.spec.kind, params: { ...def.spec.params } } })
    def.parts.forEach((pp, j) => {
      parts.push({
        id: `${item.uid}-p${j}`,
        ref: pp.kind,
        kind: pp.kind,
        label: `${pp.label} · ${def.title}`,
        block: item.uid,
        term: pp.term,
        place: pp.place,
        job: pp.job,
        connects: def.parts.map((_, k) => `${item.uid}-p${k}`).filter((_, k) => k !== j),
        order: { eli5: `It gets sound from ${prevName} and hands it to ${nextName}.`, detail: def.order },
        breaks: pp.breaks,
        onRemove: [{ stage: item.uid, bypass: true }],
      })
    })
    knobs.push({ id: item.uid, label: `${i + 1}. ${def.knob.label}`, default: item.value, targets: [{ stage: item.uid, param: def.knob.param, from: def.knob.from, to: def.knob.to, curve: def.knob.curve }] })
  })
  return {
    id: 'build',
    name: 'Build mode',
    subtitle: 'your chain · reorder blocks to hear why order matters',
    kind: 'effect',
    defaultInput: 'pluck',
    keyIdea: { eli5: 'Same parts, different order, different sound, like adding salt before or after you cook.', detail: 'Clip then filter: the filter sweeps up the fizz the clipper made. Filter then clip: you only change what gets clipped, so it stays buzzy.' },
    summary: 'Drag blocks from the palette, reorder with drag or arrows, probe between blocks.',
    rails: {
      top: { label: '+V', sign: '+', ground: false, eli5: 'The full side of the battery, like the top of a water tower.', detail: 'Every block draws its power from here.' },
      bottom: { label: '0 V (ground)', sign: '-', ground: true, eli5: 'The floor everyone measures from.', detail: 'Ground is the shared reference point. Every voltage is "how far above the floor".' },
    },
    groundNote: { eli5: 'Ground is the floor of the circuit: the spot every voltage gets measured from.', detail: 'In build mode the minus side of the battery is ground, which is the usual way.' },
    source: { label: 'circuit-why build mode', url: 'https://www.falstad.com/circuit/' },
    sim: { label: 'Falstad CircuitJS (blank canvas)', url: 'https://www.falstad.com/circuit/circuitjs.html' },
    blocks,
    parts,
    knobs,
  }
}
