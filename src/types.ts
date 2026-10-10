/** circuit-why data model. One JSON file per circuit lives in src/circuits/. */

export type ParamValue = number | string

/** Every explanation: a one-line ELI5 first, an optional plain follow-up under "more". */
export type Text = { eli5: string; detail?: string }

/** Wire colors shared by the path view, the section map and the board. */
export type WireKind = 'audio' | 'control' | 'plus' | 'minus' | 'bias'

/** A change applied to an audio stage's params (by a knob, a removed part, or a bypassed block). */
export type Effect =
  | { stage: string; param: string; value: ParamValue }
  | { stage: string; param: string; scale: number }
  | { stage: string; bypass: true }

export type StageKind =
  | 'gain'
  | 'hp'
  | 'lp'
  | 'peak'
  | 'shaper'
  | 'tsclip'
  | 'osc'
  | 'apc'
  | 'ringmod'
  | 'delay'
  | 'resonator'
  | 'speaker'
  | 'trem'

export type StageSpec = { kind: StageKind; params: Record<string, ParamValue> }

export type Block = {
  id: string
  title: string
  /** What this block does to the sound. */
  job: Text
  /** What travels on the wire leaving this block (tap the wire to read it). */
  wire?: Text
  /** null = no audio stage of its own (its parts act on other stages). */
  stage: StageSpec | null
  /** Side-chain blocks (modulators, LED oscillators) sit off the main path. */
  side?: boolean
  /** Probe a named internal node of another stage (e.g. carrier oscillator). */
  probeTap?: { stage: string; node: string }
  /** What bypassing this block does if it has no stage of its own. */
  onBypass?: Effect[]
  /** v5: stays in the path when the footswitch is off (buffered bypass, e.g. TS808 input/output buffers). */
  buffered?: boolean
}

export type PartKind =
  | 'R' | 'C' | 'CP' | 'D' | 'DD' | 'LED' | 'Q' | 'QP' | 'JFET' | 'OPAMP' | 'IC' | 'POT' | 'TRIM'
  | 'LDR' | 'L' | 'XFMR' | 'SPK' | 'SW' | 'JACK' | 'OSC' | 'MULT' | 'BOX' | 'BAT' | 'WIRE'

/** Where the part sits relative to the signal line. */
export type Place = 'series' | 'shunt' | 'up' | 'fb' | 'active'

export type Part = {
  id: string
  ref: string
  kind: PartKind
  label: string
  /** The real technical name, shown small so the vocabulary sticks. */
  term: string
  block: string
  place: Place
  job: Text
  connects: string[]
  order: Text
  breaks: Text
  /** What the audio model does when this part is pulled out. */
  onRemove?: Effect[]
  /** Shown when removing it changes nothing you can hear in the model. */
  silentNote?: string
  /** v4: a value you can change (E-series slider or a type swap). */
  tune?: Tune
  /** v4: lug map for multi-terminal parts (footswitch, jacks, pots, toggles, transistors). */
  lugs?: LugMap
  /** v4: which chip this IC part is, for the pinout view. */
  chip?: ChipUse
}

/** How a part value reaches the audio model: param *= (v / nominal) ^ exp, or param += add × log2(v / nominal). */
export type TuneTarget = { stage: string; param: string; exp?: number; add?: number; min?: number; max?: number }

export type TuneCalc =
  | { kind: 'rc' | 'xr' | 'mono'; with: number; label: string }
  | { kind: 'ohm'; volts: number; label: string }
  | { kind: 'pt2399'; label: string }

export type Tune = {
  unit?: 'Ω' | 'F'
  nominal?: number
  series?: 'E12' | 'E6' | 'pot'
  min?: number
  max?: number
  /** The starting value is typical for this design, not read off a specific board. */
  typical?: boolean
  targets?: TuneTarget[]
  choices?: { id: string; label: string; eli5: string; effects: Effect[] }[]
  default?: string
  higher?: string
  lower?: string
  tooFar: string
  /** What you would hear on the real board when the model can't. */
  real?: string
  calc?: TuneCalc
  fund?: string
}

export type LugRole = 'audio' | 'led' | 'power' | 'ground' | 'control' | 'unused' | 'end' | 'wiper'

export type LugMap = {
  kind: 'fsw3' | 'jack3' | 'dcj' | 'pot' | 'trim' | 'swpot' | 'toggle' | 'transistor'
  bp?: string
  eli5: string
  detail?: string
  standard: string
  alts?: string[]
  why?: { q: string; a: string }[]
  poles?: { name: string; pins: string[] }[]
  rows?: string[]
  states?: { id: string; label: string; joins: [string, string][]; eli5?: string }[]
  /** 'fsw' = the footswitch state, else a knob id whose option index picks the state. */
  stateFrom?: string
  knob?: string
  lugs: { pin: string; name: string; role: LugRole; eli5: string }[]
}

export type ChipUse = { chip: string; bp?: string; pins?: number[]; use?: Record<string, string>; note?: string; alt?: string }

export type PinRole = 'power' | 'ground' | 'in' | 'out' | 'timing' | 'control' | 'feedback' | 'ref' | 'nc'

export type Chip = {
  name: string
  full: string
  kind: 'analog' | 'logic' | 'mixed'
  dip: number
  pins: { n: number; name: string; role: PinRole; eli5: string }[]
  inside: { eli5: string; detail?: string; blocks: { id: string; label: string; x: number; y: number; w: number; h: number; shape: 'box' | 'amp' | 'inv' }[]; links: [string, string][] }
  logic: string
  standard: string
  lineage: string
  buying: string
  buyingLink?: { label: string; url: string }
  datasheet: { label: string; url: string }
}

export type KnobTarget = {
  stage: string
  param: string
  from: number
  to: number
  curve?: 'lin' | 'exp'
  /** 'set' (default) writes the param, 'mul' multiplies it after all sets. */
  mode?: 'set' | 'mul'
}

export type Knob = {
  id: string
  label: string
  /** Part id of the real pot / switch / photocell this knob stands for. */
  part?: string
  default: number
  targets?: KnobTarget[]
  /** Discrete switch: each option writes param values. */
  options?: { label: string; effects: Effect[] }[]
  /** Show as a drag-to-light pad (photocells). */
  pad?: boolean
  readout?: { label: string; from: number; to: number; unit: string; digits?: number; curve?: 'lin' | 'exp' }
}

export type Circuit = {
  id: string
  name: string
  subtitle: string
  kind: 'effect' | 'generator'
  mine?: boolean
  defaultInput: InputKind
  keyIdea: Text
  summary: string
  rails: { top: Rail; bottom: Rail }
  /** Circuit-specific line for the "what is ground?" explainer. */
  groundNote: Text
  source: { label: string; url: string }
  sim?: { label: string; url: string } | null
  notes?: string[]
  blocks: Block[]
  parts: Part[]
  knobs: Knob[]
  /** Sub-circuits + typed links between them (the section map). Absent = one section per block. */
  sections?: Section[]
  links?: Link[]
  /** Physical build mockup. Absent = auto perfboard sketch. */
  board?: Board
  /** v5: a progressive-complexity ladder, from the minimal working circuit to the full real one. */
  layers?: Layers
  /** Overall honesty line for the circuit. */
  honestyNote?: Text
}

export type Rail = {
  label: string
  /** Which battery terminal this rail is. 'none' = passive circuit. */
  sign: '+' | '-' | 'none'
  /** True when this rail is also the circuit's ground (0 V reference). */
  ground: boolean
  eli5: string
  detail?: string
}

export type HonestyLevel = 'behavioral' | 'approx' | 'none'

export type Section = {
  id: string
  title: string
  term: string
  eli5: string
  detail?: string
  /** Block ids: drilling into this section shows these in the path view. */
  blocks: string[]
  tint: string
  /** Box on the section map: x, y, w, h in map units (1000 × 560). */
  map: [number, number, number, number]
  /** Small endpoint (jack, speaker, photocell, LED) rather than a sub-circuit. */
  io?: boolean
  honesty?: { level: HonestyLevel; eli5: string; detail?: string }
}

export type Link = {
  id: string
  from: string
  to: string
  kind: 'audio' | 'control' | 'power'
  label: string
  eli5: string
  detail?: string
  /** Only active for some switch settings / when you aim an LED. Drawn dashed. */
  optional?: boolean
  /** Probe id to scope when tapped. */
  probe?: string
  /** Curve the arrow sideways by this many map units (to dodge boxes). */
  bend?: number
  /** v5: only on these layer rungs. */
  layers?: string[]
}

export type Footprint =
  | 'R' | 'D' | 'CC' | 'CF' | 'CP' | 'TO92' | 'QCAN' | 'DIP' | 'POT' | 'SWPOT' | 'TRIM' | 'LDR' | 'LED'
  | 'JACK' | 'JACK3' | 'DCJ' | 'BAT' | 'FSW3' | 'PUSH' | 'TOG' | 'JMP3' | 'SPK' | 'XFMR' | 'PAD' | 'AMP' | 'FELT' | 'WOODBOX'

export type BoardPart = {
  id: string
  /** Circuit part this physical part belongs to (selection + why-panel). */
  part?: string
  fp: Footprint
  x: number
  y: number
  rot?: 0 | 90 | 180 | 270
  /** Value printed on / encoded in the part (resistor bands come from this). */
  value?: string
  /** Silkscreen label. */
  label?: string
  /** Lives off the board, wired to a pad. */
  off?: boolean
  /** Lead spacing for axial parts / pin count for DIPs / size for boxes. */
  span?: number
  w?: number
  h?: number
  color?: string
  /** LED drive: a probe id to blink with, "breathe" (not modeled, slow glow) or "fsw" (lit when the footswitch is on). */
  blink?: string
  /** TO-92 / can pin order, e.g. "EBC". */
  pinout?: string
}

export type Net = {
  id: string
  name: string
  kind: WireKind
  /** "boardPartId.pin" */
  pins: string[]
  probe?: string
  /** Ground net: drawn as a copper pour with thermal pads instead of traces. */
  pour?: boolean
  eli5: string
  detail?: string
  /** v5: only exists on these layer rungs (absent = every rung). */
  layers?: string[]
}

export type Board = {
  style: 'pcb' | 'perf' | 'p2p'
  color: 'white' | 'green' | 'perf' | 'wood'
  /** Board outline in board units (0.1 inch = 20). */
  w: number
  h: number
  /** Whole drawing area (board + off-board parts). */
  view: [number, number, number, number]
  fidelity: 'kit' | 'schematic' | 'generic'
  fidelityNote: string
  reference?: { label: string; url: string }
  parts: BoardPart[]
  nets: Net[]
}

export type InputKind = 'pluck' | 'riff' | 'arp' | 'stomp' | 'drone' | 'tone' | 'mic' | 'off'

/** v5 Layers: a ladder of rungs. Each rung adds parts (by id) on top of the one before. Reusable for any circuit. */
export type LayerPedal = { name: string; note: string; link: { label: string; url: string }; year?: number }

export type Rung = {
  id: string
  label: string
  title: string
  /** Part ids that arrive at this rung. */
  adds: string[]
  /** Part ids that stay but change role or wiring here (they glow too). */
  moves?: string[]
  /** One ELI5 line: what this layer fixes and what you'd hear or lose without it; detail under 'more'. */
  why: Text
  /** Does the behavioral model change the sound at this rung? */
  hear: 'yes' | 'some' | 'no'
  hearNote: string
  /** Real pedals that stop near this rung. */
  pedals: LayerPedal[]
  /** Audio-model changes applied at this rung (after knobs and part values, before pulled parts). */
  effects: Effect[]
  /** Physical part count at this rung (computed by the generator). */
  count: number
  /** Branch rungs hang off another rung instead of extending the ladder. */
  branch?: string
  /** Branch: printed value changes on board parts, by part id. */
  set?: Record<string, string>
  explainOnly?: boolean
}

export type Layers = {
  full: string
  minimal: string
  default: string
  fullLabel: string
  minimalLabel?: string
  /** Off-board hardware (jacks, battery): shown, never counted. */
  hardware: string[]
  note?: string
  fullCount: number
  rungs: Rung[]
}
