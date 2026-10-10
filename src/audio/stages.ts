/**
 * Behavioral Web Audio stand-ins for circuit blocks. Not SPICE: each stage is the
 * smallest audio graph that makes the block's *sound job* audible.
 */
import type { ParamValue, StageSpec } from '../types'
import { makeCurve, pulseWave, type CurveKind } from './curves'

export type Params = Record<string, ParamValue>

export type Stage = {
  input: GainNode
  output: GainNode
  taps: Record<string, AudioNode>
  update: (p: Params) => void
  setBypass: (b: boolean) => void
  dispose: () => void
}

const T = 0.02 // param smoothing time constant (s)

function num(p: Params, k: string, d: number): number {
  const v = p[k]
  return typeof v === 'number' && Number.isFinite(v) ? v : d
}
function str(p: Params, k: string, d: string): string {
  const v = p[k]
  return typeof v === 'string' ? v : d
}
function setP(ctx: BaseAudioContext, ap: AudioParam, v: number) {
  ap.setTargetAtTime(v, ctx.currentTime, T)
}

type Inner = {
  first: AudioNode | null // null = generator (ignores input)
  last: AudioNode
  taps?: Record<string, AudioNode>
  update: (p: Params) => void
  stop?: () => void
}

export function createStage(ctx: AudioContext, spec: StageSpec): Stage {
  const input = ctx.createGain()
  const output = ctx.createGain()
  const wet = ctx.createGain()
  const dry = ctx.createGain()
  dry.gain.value = 0
  input.connect(dry).connect(output)

  const inner = buildInner(ctx, spec)
  if (inner.first) input.connect(inner.first)
  inner.last.connect(wet).connect(output)
  inner.update(spec.params)

  return {
    input,
    output,
    taps: inner.taps ?? {},
    update: inner.update,
    setBypass(b) {
      setP(ctx, wet.gain, b ? 0 : 1)
      setP(ctx, dry.gain, b ? 1 : 0)
    },
    dispose() {
      inner.stop?.()
      try {
        input.disconnect()
        output.disconnect()
        wet.disconnect()
        dry.disconnect()
        inner.last.disconnect()
      } catch {
        /* already disconnected */
      }
    },
  }
}

function buildInner(ctx: AudioContext, spec: StageSpec): Inner {
  switch (spec.kind) {
    case 'gain': {
      const g = ctx.createGain()
      return { first: g, last: g, update: (p) => setP(ctx, g.gain, num(p, 'gain', 1)) }
    }
    case 'hp':
    case 'lp': {
      const f = ctx.createBiquadFilter()
      f.type = spec.kind === 'hp' ? 'highpass' : 'lowpass'
      return {
        first: f,
        last: f,
        update: (p) => {
          setP(ctx, f.frequency, num(p, 'freq', 1000))
          setP(ctx, f.Q, num(p, 'q', 0.707))
        },
      }
    }
    case 'peak': {
      const f = ctx.createBiquadFilter()
      f.type = 'peaking'
      return {
        first: f,
        last: f,
        update: (p) => {
          setP(ctx, f.frequency, num(p, 'freq', 800))
          setP(ctx, f.Q, num(p, 'q', 1))
          setP(ctx, f.gain, num(p, 'gain', 6))
        },
      }
    }
    case 'resonator': {
      // a box / cone rings at its own frequency: resonant low-pass + level
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      const f2 = ctx.createBiquadFilter()
      f2.type = 'highpass'
      f2.frequency.value = 30
      const g = ctx.createGain()
      f.connect(f2).connect(g)
      return {
        first: f,
        last: g,
        update: (p) => {
          setP(ctx, f.frequency, num(p, 'freq', 100))
          setP(ctx, f.Q, num(p, 'q', 6))
          setP(ctx, g.gain, num(p, 'gain', 1))
        },
      }
    }
    case 'speaker': {
      // small amp + small speaker: no deep bass, no air, mild breakup
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      const sh = ctx.createWaveShaper()
      sh.curve = makeCurve('soft', 0)
      const g = ctx.createGain()
      hp.connect(lp).connect(sh).connect(g)
      return {
        first: hp,
        last: g,
        update: (p) => {
          setP(ctx, hp.frequency, num(p, 'low', 150))
          setP(ctx, lp.frequency, num(p, 'high', 6000))
          setP(ctx, g.gain, num(p, 'gain', 0.8))
        },
      }
    }
    case 'shaper': {
      const pre = ctx.createGain()
      const sh = ctx.createWaveShaper()
      sh.oversample = '2x'
      const dc = ctx.createBiquadFilter()
      dc.type = 'highpass'
      dc.frequency.value = 12
      const post = ctx.createGain()
      pre.connect(sh).connect(dc).connect(post)
      let lastKey = ''
      return {
        first: pre,
        last: post,
        update: (p) => {
          const kind = str(p, 'curve', 'soft') as CurveKind
          const bias = num(p, 'bias', 0)
          const key = `${kind}:${bias.toFixed(3)}`
          if (key !== lastKey) {
            sh.curve = makeCurve(kind, bias)
            lastKey = key
          }
          setP(ctx, pre.gain, num(p, 'drive', 1))
          setP(ctx, post.gain, num(p, 'level', 0.5))
        },
      }
    }
    case 'tsclip': {
      // Tube Screamer: out = clean + softclip(drive * highpassed(in)).
      // The op-amp never drops below unity gain, so bass passes clean while mids clip.
      const split = ctx.createGain()
      const clean = ctx.createGain()
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      const pre = ctx.createGain()
      const sh = ctx.createWaveShaper()
      sh.curve = makeCurve('soft', 0)
      sh.oversample = '2x'
      const clipLvl = ctx.createGain()
      const sum = ctx.createGain()
      split.connect(clean).connect(sum)
      split.connect(hp).connect(pre).connect(sh).connect(clipLvl).connect(sum)
      // v5 Layers: 'soft' = diodes in the feedback (TS), 'hard' = op-amp then diodes to ground (Distortion+), 'diodeGround' = bare diodes
      let curveKind = 'soft'
      return {
        first: split,
        last: sum,
        taps: { clip: sh },
        update: (p) => {
          const ck = typeof p.curve === 'string' ? p.curve : 'soft'
          if (ck !== curveKind) {
            curveKind = ck
            sh.curve = makeCurve(ck as CurveKind, 0)
          }
          setP(ctx, hp.frequency, num(p, 'hpFreq', 720))
          setP(ctx, pre.gain, num(p, 'drive', 8))
          setP(ctx, clipLvl.gain, num(p, 'clipLevel', 0.45))
          setP(ctx, clean.gain, num(p, 'clean', 0.6))
          setP(ctx, sum.gain, num(p, 'level', 0.8))
        },
      }
    }
    case 'osc': {
      const osc = ctx.createOscillator()
      const fm = ctx.createGain()
      const lvl = ctx.createGain()
      const gate = ctx.createGain()
      const lfo = ctx.createOscillator()
      lfo.type = 'square'
      const lfoDepth = ctx.createGain()
      const lfoFm = ctx.createGain()
      lfo.connect(lfoDepth).connect(gate.gain)
      lfo.connect(lfoFm).connect(fm)
      fm.connect(osc.frequency)
      osc.connect(lvl).connect(gate)
      osc.start()
      lfo.start()
      const lfoTap = ctx.createGain()
      lfoTap.gain.value = 0.5
      lfo.connect(lfoTap)
      let lastWave = ''
      return {
        first: null,
        last: gate,
        taps: { lfo: lfoTap },
        update: (p) => {
          const freq = num(p, 'freq', 220)
          const wave = str(p, 'wave', 'triangle')
          if (wave !== lastWave) {
            if (wave === 'pulse') osc.setPeriodicWave(pulseWave(ctx, num(p, 'duty', 0.25)))
            else osc.type = wave as OscillatorType
            lastWave = wave
          }
          setP(ctx, osc.frequency, freq)
          const squareDead = wave === 'square' && num(p, 'squareOk', 1) === 0
          setP(ctx, lvl.gain, squareDead ? 0 : num(p, 'level', 0.5))
          const depth = Math.min(1, Math.max(0, num(p, 'gateDepth', 0)))
          // square LFO swings +-1: gain toggles between 1 and 1-depth
          setP(ctx, gate.gain, 1 - depth / 2)
          setP(ctx, lfoDepth.gain, depth / 2)
          setP(ctx, lfo.frequency, num(p, 'gateRate', 4))
          setP(ctx, lfoFm.gain, num(p, 'fmDepth', 0) * freq)
        },
        stop: () => {
          osc.stop()
          lfo.stop()
        },
      }
    }
    case 'apc': {
      // Atari Punk Console: astable at f1 triggers a one-shot of width w.
      // The one-shot ignores triggers while high -> it fires every n-th trigger.
      const osc = ctx.createOscillator()
      const lvl = ctx.createGain()
      osc.connect(lvl)
      osc.start()
      let lastKey = ''
      return {
        first: null,
        last: lvl,
        update: (p) => {
          const f1 = num(p, 'f1', 400)
          const w = num(p, 'width', 0.004)
          const n = Math.max(1, Math.ceil(w * f1 - 1e-9))
          const f = f1 / n
          const duty = Math.min(0.97, (w * f1) / n)
          const key = `${duty.toFixed(2)}`
          if (key !== lastKey) {
            osc.setPeriodicWave(pulseWave(ctx, duty))
            lastKey = key
          }
          setP(ctx, osc.frequency, f)
          setP(ctx, lvl.gain, num(p, 'level', 0.35))
        },
        stop: () => osc.stop(),
      }
    }
    case 'ringmod': {
      const split = ctx.createGain()
      const dryG = ctx.createGain()
      const mult = ctx.createGain()
      mult.gain.value = 0
      const wetG = ctx.createGain()
      const sum = ctx.createGain()
      const carrier = ctx.createOscillator()
      const carrierAmt = ctx.createGain()
      carrier.connect(carrierAmt).connect(mult.gain)
      carrier.start()
      const leak = ctx.createGain()
      carrier.connect(leak).connect(sum)
      split.connect(dryG).connect(sum)
      split.connect(mult).connect(wetG).connect(sum)
      const carrierTap = ctx.createGain()
      carrierTap.gain.value = 0.5
      carrier.connect(carrierTap)
      return {
        first: split,
        last: sum,
        taps: { carrier: carrierTap },
        update: (p) => {
          setP(ctx, carrier.frequency, num(p, 'carrier', 440))
          setP(ctx, carrierAmt.gain, num(p, 'balance', 1))
          setP(ctx, leak.gain, num(p, 'leak', 0))
          setP(ctx, wetG.gain, num(p, 'wet', 1))
          setP(ctx, dryG.gain, num(p, 'dry', 0))
        },
        stop: () => carrier.stop(),
      }
    }
    case 'delay': {
      const split = ctx.createGain()
      const dryG = ctx.createGain()
      const sumIn = ctx.createGain()
      const d = ctx.createDelay(2)
      const tone = ctx.createBiquadFilter()
      tone.type = 'lowpass'
      const grit = ctx.createWaveShaper()
      grit.curve = makeCurve('soft', 0)
      const fb = ctx.createGain()
      const wetG = ctx.createGain()
      const sum = ctx.createGain()
      split.connect(dryG).connect(sum)
      split.connect(sumIn).connect(d).connect(tone).connect(grit)
      grit.connect(fb).connect(sumIn)
      grit.connect(wetG).connect(sum)
      return {
        first: split,
        last: sum,
        taps: { wet: grit },
        update: (p) => {
          setP(ctx, d.delayTime, num(p, 'time', 0.3))
          setP(ctx, fb.gain, Math.min(1.05, num(p, 'feedback', 0.4)))
          setP(ctx, tone.frequency, num(p, 'tone', 4000))
          setP(ctx, wetG.gain, num(p, 'wet', 0.6))
          setP(ctx, dryG.gain, num(p, 'dry', 1))
        },
      }
    }
    case 'trem': {
      const g = ctx.createGain()
      const lfo = ctx.createOscillator()
      const depth = ctx.createGain()
      lfo.connect(depth).connect(g.gain)
      lfo.start()
      return {
        first: g,
        last: g,
        update: (p) => {
          const dpt = num(p, 'depth', 0.8)
          lfo.type = str(p, 'wave', 'sine') as OscillatorType
          setP(ctx, lfo.frequency, num(p, 'rate', 5))
          setP(ctx, g.gain, 1 - dpt / 2)
          setP(ctx, depth.gain, dpt / 2)
        },
        stop: () => lfo.stop(),
      }
    }
  }
}
