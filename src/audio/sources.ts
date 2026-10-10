/** Test inputs synthesized in code (no sample files). */

/** Karplus-Strong plucked riff, looped: E2 . A2 . D3 . A2 */
export function makePluckLoop(ctx: BaseAudioContext): AudioBuffer {
  const sr = ctx.sampleRate
  const beat = 0.5
  const notes = [82.41, 110, 146.83, 110]
  const len = Math.floor(sr * beat * notes.length)
  const buf = ctx.createBuffer(1, len, sr)
  const out = buf.getChannelData(0)
  let seed = 12345
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296 - 0.5
  }
  notes.forEach((f, ni) => {
    const start = Math.floor(ni * beat * sr)
    const period = Math.max(2, Math.round(sr / f))
    const line = new Float32Array(period)
    for (let i = 0; i < period; i++) line[i] = rnd() * 1.6
    let idx = 0
    const n = Math.floor(beat * sr * 1.6)
    for (let i = 0; i < n && start + i < len; i++) {
      const a = line[idx]
      const b = line[(idx + 1) % period]
      line[idx] = 0.4985 * (a + b)
      out[start + i] += a * 0.9
      idx = (idx + 1) % period
    }
  })
  // gentle low-pass + normalize
  let prev = 0
  let peak = 1e-6
  for (let i = 0; i < len; i++) {
    prev = prev + 0.45 * (out[i] - prev)
    out[i] = prev
    peak = Math.max(peak, Math.abs(prev))
  }
  for (let i = 0; i < len; i++) out[i] = (out[i] / peak) * 0.8
  return buf
}

/** Heel strikes on a wooden box: short broadband knocks, ~100 bpm. */
export function makeStompLoop(ctx: BaseAudioContext): AudioBuffer {
  const sr = ctx.sampleRate
  const beat = 0.6
  const len = Math.floor(sr * beat * 4)
  const buf = ctx.createBuffer(1, len, sr)
  const out = buf.getChannelData(0)
  let seed = 999
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296 - 0.5
  }
  const hits = [0, 1, 2, 2.5, 3]
  hits.forEach((h, k) => {
    const start = Math.floor(h * beat * sr)
    const amp = k === 3 ? 0.5 : 1
    const n = Math.floor(0.03 * sr)
    for (let i = 0; i < n && start + i < len; i++) {
      const env = Math.exp(-i / (0.004 * sr))
      out[start + i] += (rnd() * 0.8 + (i < 30 ? 0.6 : 0)) * env * amp
    }
  })
  return buf
}

type Note = [freq: number, at: number, dur: number, amp?: number]

/** Generic Karplus-Strong plucks on a beat grid. `bright` 0..1 opens the string's tone. */
function makePlucks(ctx: BaseAudioContext, notes: Note[], beat: number, beats: number, bright: number, seed0: number): AudioBuffer {
  const sr = ctx.sampleRate
  const len = Math.floor(sr * beat * beats)
  const buf = ctx.createBuffer(1, len, sr)
  const out = buf.getChannelData(0)
  let seed = seed0
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296 - 0.5
  }
  const damp = 0.497 + bright * 0.0025
  for (const [f, at, dur, amp = 1] of notes) {
    const start = Math.floor(at * beat * sr)
    const period = Math.max(2, Math.round(sr / f))
    const line = new Float32Array(period)
    for (let i = 0; i < period; i++) line[i] = rnd() * 1.6
    let idx = 0
    const n = Math.floor(dur * beat * sr)
    for (let i = 0; i < n; i++) {
      const a = line[idx]
      const b = line[(idx + 1) % period]
      line[idx] = damp * (a + b)
      const fade = i > n - 400 ? (n - i) / 400 : 1
      out[(start + i) % len] += a * 0.9 * amp * fade
      idx = (idx + 1) % period
    }
  }
  let prev = 0
  let peak = 1e-6
  const k = 0.3 + bright * 0.5
  for (let i = 0; i < len; i++) {
    prev = prev + k * (out[i] - prev)
    out[i] = prev
    peak = Math.max(peak, Math.abs(prev))
  }
  for (let i = 0; i < len; i++) out[i] = (out[i] / peak) * 0.8
  return buf
}

/** A short guitar riff in A minor pentatonic, mid register. */
export function makeRiffLoop(ctx: BaseAudioContext): AudioBuffer {
  const A2 = 110, C3 = 130.81, D3 = 146.83, E3 = 164.81, G3 = 196, A3 = 220
  const notes: Note[] = [
    [A2, 0, 1], [A2, 1, 0.5], [C3, 1.5, 0.5], [D3, 2, 1], [E3, 3, 0.5], [D3, 3.5, 0.5],
    [C3, 4, 1], [A2, 5, 1], [G3, 6, 0.5], [A3, 6.5, 1.5, 0.9],
  ]
  return makePlucks(ctx, notes, 0.25, 8, 0.8, 4242)
}

/** Am, F, C, G broken into rising arpeggios. */
export function makeArpLoop(ctx: BaseAudioContext): AudioBuffer {
  const chords = [[220, 261.63, 329.63, 440], [174.61, 220, 261.63, 349.23], [130.81, 196, 261.63, 329.63], [196, 246.94, 293.66, 392]]
  const notes: Note[] = []
  chords.forEach((c, ci) => c.forEach((f, i) => notes.push([f, ci * 4 + i, 1.4, 0.8])))
  return makePlucks(ctx, notes, 0.18, 16, 1, 777)
}

/** A sustained A2 + E3 drone that slowly swells, so you can hear a steady tone get shaped. */
export function makeDroneLoop(ctx: BaseAudioContext): AudioBuffer {
  const sr = ctx.sampleRate
  const secs = 4
  const len = Math.floor(sr * secs)
  const buf = ctx.createBuffer(1, len, sr)
  const out = buf.getChannelData(0)
  // whole cycles of each partial so the loop is seamless
  const parts: [number, number][] = [[110, 0.5], [165, 0.3], [220, 0.15], [330, 0.08]]
  let peak = 1e-6
  for (let i = 0; i < len; i++) {
    const t = i / sr
    let v = 0
    for (const [f, a] of parts) {
      const ff = Math.round(f * secs) / secs
      // band-limited saw-ish: fundamental plus a couple of harmonics
      v += a * (Math.sin(2 * Math.PI * ff * t) + 0.5 * Math.sin(4 * Math.PI * ff * t) + 0.25 * Math.sin(6 * Math.PI * ff * t))
    }
    v *= 0.65 + 0.35 * Math.sin((2 * Math.PI * t) / secs - Math.PI / 2) * -1
    out[i] = v
    peak = Math.max(peak, Math.abs(v))
  }
  for (let i = 0; i < len; i++) out[i] = (out[i] / peak) * 0.7
  return buf
}
