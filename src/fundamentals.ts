/** Fundamentals: the words behind every part, poetic first, technical under "more", each tied to the live circuit. */
import type { Circuit, Part, PartKind } from './types'
import type { Sel } from './selection'

export type TermId = 'voltage' | 'current' | 'resistance' | 'power' | 'ground' | 'signal' | 'acdc' | 'frequency' | 'capacitance' | 'impedance'

export type Term = {
  id: TermId
  name: string
  sym: string
  unit: string
  /** the poem: one line, an everyday picture */
  eli5: string
  /** how it links to the others, in plain words */
  links: { eq?: string; read: string; to: TermId[] }[]
  detail: string
}

export const TERMS: Term[] = [
  {
    id: 'voltage', name: 'Voltage', sym: 'V', unit: 'volts (V)',
    eli5: 'Voltage is height: how far uphill the battery lifts the water, so it wants to rush back down.',
    links: [
      { eq: 'V = I × R', read: 'Height equals flow times squeeze. Push the same river through a tighter faucet and you need more height.', to: ['current', 'resistance'] },
      { eq: 'P = V × I', read: 'Height times flow is the work you get out, like a taller waterfall turning a mill harder.', to: ['power'] },
    ],
    detail: 'Voltage is the difference in electrical pressure between two points. You always measure it between two places, usually against ground. A 9 V battery holds its + side 9 volts above its − side.',
  },
  {
    id: 'current', name: 'Current', sym: 'I', unit: 'amps (A), milliamps (mA)',
    eli5: 'Current is the river itself: how much electricity actually flows past one spot each second.',
    links: [
      { eq: 'I = V ÷ R', read: 'Flow equals height divided by squeeze. More height, more flow. Tighter faucet, thinner river.', to: ['voltage', 'resistance'] },
      { read: 'Current has to go out and come back, so every river ends at ground.', to: ['ground'] },
    ],
    detail: 'Current is charge per second. One amp is a lot for a pedal; most of these circuits sip a few milliamps (thousandths of an amp). Current is the same all the way along a single path, like water in one pipe.',
  },
  {
    id: 'resistance', name: 'Resistance', sym: 'R', unit: 'ohms (Ω), kΩ, MΩ',
    eli5: 'Resistance is the squeeze: a narrow faucet that holds the river back and lets height build up behind it.',
    links: [
      { eq: 'R = V ÷ I', read: 'Squeeze is how much height it takes to push each bit of flow through.', to: ['voltage', 'current'] },
      { read: 'With a capacitor it sets timing: a tight faucet fills the bucket slowly.', to: ['capacitance', 'frequency'] },
    ],
    detail: 'A resistor turns current into a voltage drop across itself and turns a little energy into heat. Pots and trimmers are adjustable resistors; a photocell is a resistor whose squeeze loosens in light.',
  },
  {
    id: 'power', name: 'Power', sym: 'P', unit: 'watts (W), milliwatts (mW)',
    eli5: 'Power is work being done: height times flow, a waterfall turning a mill wheel.',
    links: [
      { eq: 'P = V × I', read: 'Work equals height times flow. A tall trickle and a short flood can do the same work.', to: ['voltage', 'current'] },
      { eq: 'P = I² × R', read: 'Push a lot of flow through a squeeze and the squeeze warms up.', to: ['resistance'] },
    ],
    detail: 'Watts measure energy per second. A small amp chip like the LM386 puts out under a watt; a pedal circuit spends a few hundredths of a watt. Parts have power ratings so they do not cook.',
  },
  {
    id: 'ground', name: 'Ground', sym: '⏚', unit: '0 V reference',
    eli5: 'Ground is sea level: the floor every height is measured from, and the place every river returns home.',
    links: [
      { read: 'Every voltage is a height above (or below) ground.', to: ['voltage'] },
      { read: 'Every current loop finishes at ground.', to: ['current'] },
    ],
    detail: 'Ground is simply the point you call 0 V. Usually it is the battery − side and the metal box. On a positive-ground Fuzz Face, the + side is ground instead, so the rest of the circuit sits 9 V below it.',
  },
  {
    id: 'signal', name: 'Signal vs supply', sym: '∿', unit: 'audio vs DC rails',
    eli5: 'Supply is the still lake; the signal is the ripple on its surface that carries the song.',
    links: [
      { read: 'The supply is steady (DC). The signal is a wiggle riding on top (AC).', to: ['acdc'] },
      { read: 'A stage borrows power from the supply to make a bigger copy of the ripple.', to: ['power'] },
    ],
    detail: 'The red and blue rails hold steady voltages that power every chip and transistor. The white wires carry the sound: small voltages that change hundreds of times per second.',
  },
  {
    id: 'acdc', name: 'AC vs DC', sym: '≈ / ─', unit: 'alternating vs direct',
    eli5: 'DC is a steady push, like a tilted table. AC is a wiggle, like water sloshing back and forth in a tub.',
    links: [
      { read: 'Capacitors let the wiggle through and block the steady push.', to: ['capacitance'] },
      { read: 'How fast it sloshes is its frequency.', to: ['frequency'] },
    ],
    detail: 'Direct current flows one way at a steady level, like a battery. Alternating current swings back and forth. Audio is AC riding on a DC resting level (the bias); coupling capacitors strip the DC off between stages.',
  },
  {
    id: 'frequency', name: 'Frequency', sym: 'f', unit: 'hertz (Hz), kHz',
    eli5: 'Frequency is how many wiggles fit in one second: fast wiggles sing high, slow ones hum low.',
    links: [
      { read: 'A squeeze and a bucket together set the beat: tight faucet or big bucket, slower wiggles, lower pitch.', to: ['resistance', 'capacitance'] },
      { read: 'Wiggles are AC, so frequency only means something for AC.', to: ['acdc'] },
    ],
    detail: 'One hertz is one cycle per second. The low E on a bass is about 41 Hz; A above middle C is 440 Hz. The spectrum under the scope spreads a sound out by frequency.',
  },
  {
    id: 'capacitance', name: 'Capacitance', sym: 'C', unit: 'farads (F), µF, nF',
    eli5: 'Capacitance is the size of the bucket: a bigger bucket takes longer to fill, so everything around it slows down.',
    links: [
      { read: 'Bucket size times faucet squeeze sets the time it takes to fill (the RC time).', to: ['resistance', 'frequency'] },
      { read: 'A bucket passes quick sloshes and stops a steady push.', to: ['acdc'] },
    ],
    detail: 'A capacitor stores charge on two plates. In oscillators it is the timing bucket; between stages it passes the audio wiggle and blocks DC; across the supply it is a little reservoir that smooths the rails.',
  },
  {
    id: 'impedance', name: 'Impedance', sym: 'Z', unit: 'ohms (Ω), for wiggles',
    eli5: 'Impedance is resistance for wiggles, and a transformer is a gearbox for electricity: few turns in, many turns out, so the voltage goes up and the current goes down.',
    links: [
      { read: 'Like resistance, but it can change with frequency, because buckets and coils treat fast and slow wiggles differently.', to: ['resistance', 'frequency'] },
      { read: 'A gearbox trades height for flow and keeps the work about the same.', to: ['voltage', 'current', 'power'] },
    ],
    detail: 'A speaker is about 8 Ω: easy to push, but it only makes a tiny voltage. An amp input expects a high impedance (thousands of ohms) and a bigger voltage. A step-up transformer matches the two, raising voltage by the turns ratio and dividing current by the same amount.',
  },
]

export const termById = (id: TermId) => TERMS.find((t) => t.id === id)!

/** Which words matter for a part of this kind. */
export function termsForPart(p: Part): TermId[] {
  const k: Partial<Record<PartKind, TermId[]>> = {
    R: ['resistance', 'current'], POT: ['resistance'], TRIM: ['resistance', 'voltage'], LDR: ['resistance', 'frequency'],
    C: ['capacitance', 'acdc'], CP: ['capacitance', 'acdc'], XFMR: ['impedance'], SPK: ['impedance', 'power'], BAT: ['voltage', 'ground'],
    LED: ['current'], BOX: ['frequency', 'impedance'], IC: ['signal', 'power'], D: ['current', 'voltage'], DD: ['current', 'voltage'], Q: ['current', 'signal'], QP: ['current', 'ground'], JFET: ['impedance'], OPAMP: ['signal'], OSC: ['frequency'], JACK: ['impedance', 'signal'],
  }
  const out = [...(k[p.kind] ?? [])]
  const id = `${p.ref} ${p.label}`
  if (/XR2206|40106|555|556|PT2399|oscillat|timer/i.test(id)) return (['frequency', ...out.filter((t) => t !== 'frequency')] as TermId[]).slice(0, 2)
  if (/LM386|amp/i.test(id)) return (['power', ...out.filter((t) => t !== 'power')] as TermId[]).slice(0, 2)
  return out.slice(0, 2)
}

/** "See it here": a live pointer into the current circuit for each word. */
export function hookFor(id: TermId, c: Circuit): { text: string; sel?: Sel } {
  const find = (re: RegExp, kinds?: PartKind[]) => c.parts.find((p) => (!kinds || kinds.includes(p.kind)) && re.test(`${p.ref} ${p.label}`))
  const ofKind = (...kinds: PartKind[]) => c.parts.find((p) => kinds.includes(p.kind))
  const plus = c.rails.top.sign === '+' ? c.rails.top : c.rails.bottom.sign === '+' ? c.rails.bottom : null
  const minus = c.rails.top.sign === '-' ? c.rails.top : c.rails.bottom.sign === '-' ? c.rails.bottom : null
  const plusId = c.rails.top.sign === '+' ? 'top' : 'bottom'
  const groundId = c.rails.top.ground ? 'top' : 'bottom'
  const part = (p: Part | undefined, text: string) => ({ text, sel: p ? ({ kind: 'part', id: p.id } as Sel) : undefined })
  switch (id) {
    case 'voltage':
      return plus && minus
        ? { text: `The red rail (${plus.label}) sits above the blue one (${minus.label}). That gap is the battery's whole height.`, sel: { kind: 'rail', id: plusId } }
        : part(ofKind('SPK'), 'No battery here: your heel makes a tiny voltage in the speaker coil, a few thousandths of a volt.')
    case 'current': {
      const led = ofKind('LED')
      if (led) return part(led, `${led.ref} glows only while current flows through it. Its resistor sets how wide the river is.`)
      const r = ofKind('R')
      return part(r, r ? `Current is how hard the signal pushes through ${r.ref}. Tap it and see which wires carry that river.` : 'Current runs around every loop and back to ground.')
    }
    case 'resistance': {
      const ldr = ofKind('LDR')
      if (ldr) return part(ldr, `Ohms is how tight the faucet is on ${ldr.ref}'s timing path. More light opens the faucet and the pitch climbs.`)
      const pot = c.knobs.find((k) => k.part && !k.options)
      const pp = pot && c.parts.find((x) => x.id === pot.part)
      if (pp) return part(pp, `${pot!.label} is a faucet you can turn. Turn it and the squeeze on that path changes.`)
      return part(ofKind('R'), 'Every resistor on the board is a fixed faucet.')
    }
    case 'power': {
      const amp = find(/LM386/i) ?? find(/amp/i, ['IC', 'OPAMP'])
      if (amp) return part(amp, `Watts is how hard ${amp.ref.includes('386') ? 'the LM386' : amp.ref} works to push the speaker cone back and forth.`)
      const spk = ofKind('SPK')
      if (spk) return part(spk, 'Your heel supplies the power here. The speaker turns a stomp into a tiny electrical wave.')
      return { text: 'This circuit spends a few hundredths of a watt: most of it warms the resistors a tiny bit.', sel: { kind: 'rail', id: plusId } }
    }
    case 'ground':
      return { text: c.rails.top.ground && c.rails.top.sign === '+' ? 'Here the + rail IS ground, and so is the metal box. The rest of the circuit hangs 9 volts below it.' : `The ${c.rails[groundId].label} rail is sea level for this circuit. Every loop comes home to it.`, sel: { kind: 'rail', id: groundId } }
    case 'signal':
      return { text: 'White wires carry the song. Red and blue carry the still lake that powers it.', sel: { kind: 'legend', id: 'audio' } }
    case 'acdc': {
      const cap = c.parts.find((p) => (p.kind === 'C' || p.kind === 'CP') && p.place === 'series')
      return part(cap, cap ? `${cap.ref} lets the wiggle through and blocks the steady push, so each stage keeps its own resting level.` : 'The rails are DC; the white wires are AC.')
    }
    case 'frequency': {
      const osc = find(/XR2206|555|556|40106|oscillat/i)
      if (osc) return part(osc, `${osc.ref} sets the pitch: how many times per second it flips. Watch the spectrum under the Out scope move.`)
      return { text: 'Pick a different sound in the In | Out scopes and watch the spectrum: low notes sit left, high notes sit right.' }
    }
    case 'capacitance': {
      const timing = find(/timing|range/i, ['C', 'CP'])
      if (timing) return part(timing, `${timing.ref} is the timing bucket. Flip RANGE to swap buckets: the small one fills fast and the pitch jumps up.`)
      const cap = ofKind('C', 'CP')
      return part(cap, cap ? `${cap.ref} is a bucket. Tap it to see if it times something, passes the wiggle, or smooths the supply.` : 'No capacitors here.')
    }
    case 'impedance': {
      const x = ofKind('XFMR')
      if (x) return part(x, `${x.ref} is the gearbox: few turns on the speaker side, many on the amp side, so the voltage goes up and the current goes down.`)
      const j = ofKind('JACK')
      return part(j, j ? 'A guitar pickup is a weak, high-impedance source, so the first stage has to listen gently or it dulls the tone.' : 'Impedance matters wherever two things connect.')
    }
  }
}

/** Toy numbers for the little water diagram, driven by a real knob. */
export function toyModel(c: Circuit, values: Record<string, number>) {
  const plus = c.rails.top.sign === '+' ? c.rails.top : c.rails.bottom.sign === '+' ? c.rails.bottom : null
  const m = plus?.label.match(/(\d+(?:\.\d+)?)/)
  const V = m ? parseFloat(m[1]) : 0.05
  const k = c.knobs.find((x) => x.pad) ?? c.knobs.find((x) => !x.options)
  const v = k ? values[k.id] ?? k.default : 0.5
  // photocell: dark 1 MΩ → bright 1 kΩ; any other pot: 100 kΩ → 1 kΩ as you turn it up
  const [rHi, rLo] = k?.pad ? [1e6, 1e3] : [1e5, 1e3]
  const R = rHi * Math.pow(rLo / rHi, v)
  const I = V / R
  const P = V * I
  return { V, R, I, P, knob: k, v, open: v }
}

export function fmt(x: number, unit: string) {
  const a = Math.abs(x)
  const [s, d] = a >= 1e6 ? [1e6, 'M'] : a >= 1e3 ? [1e3, 'k'] : a >= 1 || a === 0 ? [1, ''] : a >= 1e-3 ? [1e-3, 'm'] : [1e-6, 'µ']
  const n = x / (s as number)
  return `${n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)} ${d}${unit}`
}
