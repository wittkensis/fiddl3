/** Transfer curves for WaveShaperNode stand-ins of diode / transistor clipping. */

const N = 2048

export type CurveKind = 'soft' | 'hard' | 'fuzz' | 'diodeGround' | 'clean'

function shape(kind: CurveKind, x: number, bias: number): number {
  switch (kind) {
    case 'clean':
      return x
    case 'soft': {
      // diodes in a feedback loop: gain flattens gradually -> rounded tops
      const xb = x + bias * 0.3
      return Math.tanh(1.6 * xb)
    }
    case 'hard': {
      // diodes to ground: voltage pinned at the diode drop -> squared tops
      const xb = x + bias * 0.3
      const k = 6
      return xb / Math.pow(1 + Math.pow(Math.abs(xb * 1.8), k), 1 / k)
    }
    case 'diodeGround': {
      const k = 4
      return x / Math.pow(1 + Math.pow(Math.abs(x * 2.4), k), 1 / k)
    }
    case 'fuzz': {
      // transistor stage biased off-center: one side hits the rail earlier (asymmetric),
      // and a badly misbiased stage starves small signals (sputter / gating).
      const b = Math.max(-1, Math.min(1, bias))
      const xp = x + b * 0.45
      let y = Math.tanh(2.8 * xp)
      const posLim = 1 - Math.max(0, b) * 0.8
      const negLim = 1 - Math.max(0, -b) * 0.8
      y = y > 0 ? Math.min(y, posLim) : Math.max(y, -negLim)
      const gate = Math.max(0, Math.abs(b) - 0.25) * 0.55
      if (gate > 0 && Math.abs(x) < gate) y *= Math.pow(Math.abs(x) / gate, 3)
      return y
    }
  }
}

export function makeCurve(kind: CurveKind, bias = 0): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(N * 4))
  const offset = shape(kind, 0, bias)
  let peak = 1e-6
  const raw = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * 2 - 1
    raw[i] = shape(kind, x, bias) - offset
    peak = Math.max(peak, Math.abs(raw[i]))
  }
  for (let i = 0; i < N; i++) curve[i] = raw[i] / peak
  return curve
}

/** Pulse wave as a PeriodicWave (used for 555 / APC outputs). */
export function pulseWave(ctx: BaseAudioContext, duty: number, harmonics = 48): PeriodicWave {
  const d = Math.min(0.98, Math.max(0.02, duty))
  const real = new Float32Array(harmonics + 1)
  const imag = new Float32Array(harmonics + 1)
  for (let n = 1; n <= harmonics; n++) {
    // Fourier series of a pulse train with duty d
    real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * d) * Math.cos(n * Math.PI * d)
    imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * d) * Math.sin(n * Math.PI * d)
  }
  return ctx.createPeriodicWave(real, imag)
}
