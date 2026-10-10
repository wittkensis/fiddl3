/** Owns the AudioContext, the input source, the stage chain, probes and listening. */
import type { InputKind, StageSpec } from '../types'
import { makeArpLoop, makeDroneLoop, makePluckLoop, makeRiffLoop, makeStompLoop } from './sources'
import { createStage, type Stage } from './stages'
import type { Resolved } from './resolve'

export const INPUT_ID = '__input'

type ProbePoint = { node: AudioNode; analyser: AnalyserNode; listen: GainNode }

export class Engine {
  ctx: AudioContext | null = null
  private inputGain!: GainNode
  private sourceNode: AudioScheduledSourceNode | null = null
  private sourceGain: GainNode | null = null
  private micStream: MediaStream | null = null
  private micNode: MediaStreamAudioSourceNode | null = null
  private listenBus!: GainNode
  private master!: GainNode
  private stages = new Map<string, Stage>()
  private order: string[] = []
  private points = new Map<string, ProbePoint>()
  private buffers: Partial<Record<InputKind, AudioBuffer>> = {}
  private inputKind: InputKind = 'off'
  probe = INPUT_ID
  listenAtProbe = false
  lastError = ''

  get running() {
    return this.ctx?.state === 'running'
  }

  /** Must be called from a user gesture (iOS unlock). */
  async start(): Promise<void> {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'interactive' })
      const ctx = this.ctx
      this.inputGain = ctx.createGain()
      this.inputGain.gain.value = 0.8
      this.listenBus = ctx.createGain()
      this.master = ctx.createGain()
      this.master.gain.value = 0.6
      const limiter = ctx.createDynamicsCompressor()
      limiter.threshold.value = -6
      limiter.knee.value = 0
      limiter.ratio.value = 20
      limiter.attack.value = 0.002
      limiter.release.value = 0.1
      this.listenBus.connect(this.master).connect(limiter).connect(ctx.destination)
      this.addPoint(INPUT_ID, this.inputGain)
      // iOS: play a silent buffer inside the gesture to unlock output
      const silent = ctx.createBufferSource()
      silent.buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
      silent.connect(ctx.destination)
      silent.start()
    }
    if (this.ctx.state !== 'running') await this.ctx.resume()
  }

  private addPoint(id: string, node: AudioNode) {
    const ctx = this.ctx!
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.55
    const listen = ctx.createGain()
    listen.gain.value = 0
    node.connect(analyser)
    node.connect(listen).connect(this.listenBus)
    this.points.set(id, { node, analyser, listen })
  }

  private removePoint(id: string) {
    const p = this.points.get(id)
    if (!p) return
    try {
      p.node.disconnect(p.analyser)
      p.node.disconnect(p.listen)
    } catch {
      /* noop */
    }
    p.listen.disconnect()
    this.points.delete(id)
  }

  /** Swap the test signal. The old source fades out over ~20 ms and the new one fades in, so switching never clicks. */
  async setInput(kind: InputKind) {
    if (!this.ctx) return
    this.inputKind = kind
    const ctx = this.ctx
    const now = ctx.currentTime
    if (this.sourceNode) {
      const old = this.sourceNode
      const oldGain = this.sourceGain
      oldGain?.gain.setTargetAtTime(0, now, 0.006)
      try {
        old.stop(now + 0.04)
      } catch {
        /* noop */
      }
      window.setTimeout(() => {
        old.disconnect()
        oldGain?.disconnect()
      }, 80)
      this.sourceNode = null
      this.sourceGain = null
    }
    if (this.micNode) {
      this.micNode.disconnect()
      this.micNode = null
    }
    if (kind !== 'mic' && this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop())
      this.micStream = null
    }
    if (kind === 'off') return
    if (kind === 'mic') {
      try {
        this.micStream ??= await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        })
        if (this.inputKind !== 'mic') return
        this.micNode = ctx.createMediaStreamSource(this.micStream)
        this.micNode.connect(this.inputGain)
      } catch (e) {
        this.lastError = `Mic unavailable: ${(e as Error).message}`
      }
      return
    }
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, now)
    g.gain.setTargetAtTime(kind === 'tone' ? 0.45 : 1, now + 0.01, 0.008)
    g.connect(this.inputGain)
    let src: AudioScheduledSourceNode
    if (kind === 'tone') {
      const o = ctx.createOscillator()
      o.frequency.value = 110
      src = o
    } else {
      const make = { pluck: makePluckLoop, riff: makeRiffLoop, arp: makeArpLoop, stomp: makeStompLoop, drone: makeDroneLoop }[kind]
      const s = ctx.createBufferSource()
      s.buffer = this.buffers[kind] ??= make(ctx)
      s.loop = true
      src = s
    }
    src.connect(g)
    src.start(now + 0.01)
    this.sourceNode = src
    this.sourceGain = g
  }

  setInputLevel(v: number) {
    if (this.ctx) this.inputGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02)
  }
  setMaster(v: number) {
    if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02)
  }

  /** Rebuild the chain for a circuit (or a build-mode chain). */
  load(chain: { id: string; spec: StageSpec }[], taps: { id: string; stage: string; node: string }[]) {
    if (!this.ctx) return
    for (const id of Array.from(this.points.keys())) if (id !== INPUT_ID) this.removePoint(id)
    this.inputGain.disconnect()
    this.addPointConnections()
    for (const s of this.stages.values()) s.dispose()
    this.stages.clear()
    this.order = []
    let prev: AudioNode = this.inputGain
    for (const { id, spec } of chain) {
      const st = createStage(this.ctx, spec)
      prev.connect(st.input)
      prev = st.output
      this.stages.set(id, st)
      this.order.push(id)
      this.addPoint(id, st.output)
    }
    for (const t of taps) {
      const node = this.stages.get(t.stage)?.taps[t.node]
      if (node) this.addPoint(t.id, node)
    }
    if (!this.points.has(this.probe)) this.probe = this.order[this.order.length - 1] ?? INPUT_ID
    this.routeListen()
  }

  private addPointConnections() {
    const p = this.points.get(INPUT_ID)
    if (p) {
      this.inputGain.connect(p.analyser)
      this.inputGain.connect(p.listen)
    }
  }

  apply(r: Resolved) {
    for (const [id, st] of this.stages) {
      st.update(r.params[id] ?? {})
      st.setBypass(r.bypass.has(id))
    }
  }

  setProbe(id: string) {
    if (this.points.has(id)) this.probe = id
    this.routeListen()
  }
  setListenAtProbe(b: boolean) {
    this.listenAtProbe = b
    this.routeListen()
  }

  private routeListen() {
    if (!this.ctx) return
    const finalId = this.order[this.order.length - 1] ?? INPUT_ID
    const target = this.listenAtProbe ? this.probe : finalId
    for (const [id, p] of this.points) p.listen.gain.setTargetAtTime(id === target ? 1 : 0, this.ctx.currentTime, 0.01)
  }

  analyser(id: string): AnalyserNode | null {
    return this.points.get(id)?.analyser ?? null
  }

  debug() {
    return {
      state: this.ctx?.state ?? 'none',
      stages: [...this.order],
      points: [...this.points.keys()],
      probe: this.probe,
      listenAtProbe: this.listenAtProbe,
      input: this.inputKind,
      error: this.lastError,
    }
  }
}
