import { DialRoot, DialStore, useDialKit } from 'dialkit'
import 'dialkit/styles.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { Engine, INPUT_ID } from './audio/engine'
import { resolve, type PartValues } from './audio/resolve'
import { layerView } from './layers'
import { fmtValue } from './v4'
import { probeCrest, probePitch, probeLevels, startScopeLoop } from './audio/scopeLoop'
import { chainToCircuit, type ChainItem } from './build/palette'
import { circuits } from './circuits'
import { About } from './components/About'
import { Board } from './components/Board'
import { BuildBar, newItem } from './components/BuildBar'
import { CircuitDials } from './components/CircuitDials'
import { CircuitPicker, type PickItem } from './components/CircuitPicker'
import { Controls } from './components/Controls'
import { Inspector } from './components/Inspector'
import { KeyOverlay } from './components/Legend'
import { Schematic } from './components/Schematic'
import { TooltipLayer } from './components/Tooltip'
import { Fundamentals } from './components/Fundamentals'
import type { TermId } from './fundamentals'
import { SectionMap } from './components/SectionMap'
import { boardOf, linksOf, sectionOfPart, sectionsOf } from './circuitUtil'
import type { Sel } from './selection'
import type { Circuit, InputKind } from './types'

const rigConfig = {
  inputLevel: [0.8, 0, 1.5, 0.01] as [number, number, number, number],
  master: [0.6, 0, 1, 0.01] as [number, number, number, number],
  listenAtProbe: false,
  scopeZoom: [0.4, 0, 1, 0.01] as [number, number, number, number],
  miniScopes: true,
}

declare global {
  interface Window {
    __circuitWhy?: { debug: () => unknown; levels: () => Record<string, number>; crest: () => Record<string, number>; pitch: () => Record<string, number> }
    __cwSelect?: (id: string) => void
    __cwRung?: (id: string | null) => void
    __cwParts?: () => string[]
  }
}

const DESC: Record<string, string> = {
  'fuzz-face': 'Two-transistor fuzz, positive ground',
  thingamagoop: 'Light-played synth critter',
  'bass-stomp': 'Passive heel-stomp kick box',
  'ring-mod': 'Multiplies your guitar by a tone',
  'tube-screamer': 'Soft-clipping overdrive',
  'atari-punk': 'Two timers make a stepped synth',
  pt2399: 'Echo from a delay chip',
}
const BUILD_ID = '__build'
type Fund = { term: TermId | null; from?: string | null } | null

type View = 'board' | 'map' | 'path'

export default function App() {
  const engine = useRef<Engine>(null as unknown as Engine)
  engine.current ??= new Engine()
  const rig = useDialKit('fiddl3 · rig', rigConfig)
  const [started, setStarted] = useState(false)
  const [mode, setMode] = useState<'circuit' | 'build'>('circuit')
  const [circuitId, setCircuitId] = useState(circuits[0].id)
  const [view, setView] = useState<View>('board')
  const [fund, setFund] = useState<Fund>(null)
  const [chain, setChain] = useState<ChainItem[]>(() => [newItem('gain'), newItem('hardclip'), newItem('lp')])

  useEffect(() => {
    window.__circuitWhy = { debug: () => engine.current.debug(), levels: () => probeLevels(engine.current), crest: () => probeCrest(engine.current), pitch: () => probePitch(engine.current) }
  }, [])

  const buildCircuit = useMemo(() => chainToCircuit(chain), [chain])
  const circuit: Circuit = mode === 'build' ? buildCircuit : circuits.find((c) => c.id === circuitId)!

  useEffect(() => {
    if (started) engine.current.setInputLevel(rig.inputLevel)
  }, [rig.inputLevel, started])
  useEffect(() => {
    if (started) engine.current.setMaster(rig.master)
  }, [rig.master, started])

  const startingRef = useRef(false)
  const start = useCallback(async () => {
    if (startingRef.current) return
    startingRef.current = true
    await engine.current.start()
    setStarted(true)
  }, [])
  // the first tap or key anywhere starts sound (browsers need a gesture)
  useEffect(() => {
    if (started) return
    const go = () => void start()
    document.addEventListener('click', go, { once: true })
    document.addEventListener('keydown', go, { once: true })
    return () => {
      document.removeEventListener('click', go)
      document.removeEventListener('keydown', go)
    }
  }, [started, start])

  const items: PickItem[] = [
    ...circuits.filter((c) => c.mine).map((c) => ({ id: c.id, name: c.name, desc: DESC[c.id] ?? '', group: 'Your builds' })),
    ...circuits.filter((c) => !c.mine).map((c) => ({ id: c.id, name: c.name, desc: DESC[c.id] ?? '', group: 'Classics' })),
    { id: BUILD_ID, name: 'Build mode', desc: 'Chain blocks, hear why order matters', group: 'Make your own' },
  ]
  const pick = (id: string) => {
    if (id === BUILD_ID) {
      setMode('build')
      setView('path')
    } else {
      setMode('circuit')
      setCircuitId(id)
    }
  }

  const dialKey = mode === 'build' ? `build-${chain.map((c) => c.uid).join('-')}` : circuit.id

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand" aria-label="fiddl3">fiddl3</span>
        <CircuitPicker items={items} value={mode === 'build' ? BUILD_ID : circuitId} onChange={pick} />
        <button className={'fund-btn' + (fund ? ' on' : '')} onClick={() => setFund(fund ? null : { term: null })} aria-expanded={!!fund}
          data-tip="Fundamentals: volts, amps, ohms, watts and friends, tied to this circuit">
          <span aria-hidden="true">V·I·R</span> Fundamentals
        </button>
        <div className="viewswitch" role="tablist" aria-label="View">
          {([['board', 'Board'], ['map', 'Map'], ['path', 'Path']] as const).map(([v, label]) => (
            <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}
              data-tip={v === 'board' ? 'Board: what you solder' : v === 'map' ? 'Map: the sections and what flows between them' : 'Path: one section, left to right'}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {!started && (
        <button className="startpill" onClick={() => void start()}>▶ Start sound <span>tap anywhere · headphones help</span></button>
      )}

      <CircuitDials key={dialKey} circuit={circuit}>
        {(values, setValue) => (
          <Workbench
            key={dialKey}
            circuit={circuit}
            values={values}
            setValue={setValue}
            engine={engine.current}
            started={started}
            rig={rig}
            view={view}
            setView={setView}
            fund={fund}
            setFund={setFund}
            buildBar={mode === 'build' ? <BuildBar chain={chain} setChain={setChain} /> : null}
          />
        )}
      </CircuitDials>

      <TooltipLayer />
      <DialRoot position="top-right" defaultOpen={false} theme="dark" productionEnabled />
    </div>
  )
}

type Rig = ReturnType<typeof useDialKit<typeof rigConfig>>

function Workbench({ circuit: fullCircuit, values, setValue, engine, started, rig, buildBar, view, setView, fund, setFund }: {
  circuit: Circuit
  values: Record<string, number>
  setValue: (id: string, v: number) => void
  engine: Engine
  started: boolean
  rig: Rig
  buildBar: React.ReactNode
  view: View
  setView: (v: View) => void
  fund: Fund
  setFund: (f: Fund) => void
}) {
  // v5 Layers: which rung of the ladder is showing. Views get the filtered circuit; the engine keeps every block.
  const [rung, setRung] = useState<string | null>(fullCircuit.layers?.default ?? null)
  const lv = useMemo(() => layerView(fullCircuit, rung), [fullCircuit, rung])
  const circuit = lv.circuit
  const layered = !!lv.rung
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [partVals, setPartVals] = useState<PartValues>({})
  const [hi, setHi] = useState<{ key: string; net: string } | null>(null)
  const [bypassed, setBypassed] = useState<Set<string>>(new Set())
  const [sel, setSel] = useState<Sel>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const [fswOn, setFswOn] = useState(true)
  const [input, setInput] = useState<InputKind>(circuit.defaultInput)
  const inCanvas = useRef<HTMLCanvasElement>(null)
  const lastMain = [...fullCircuit.blocks].reverse().find((b) => b.stage && !b.side)
  const [probe, setProbe] = useState<string>(lastMain?.id ?? INPUT_ID)
  const canvas = useRef<HTMLCanvasElement>(null)
  const minis = useRef(new Map<string, SVGPolylineElement>())
  const leds = useRef(new Map<string, SVGElement>())
  const probeRef = useRef(probe)
  probeRef.current = probe
  const rigRef = useRef(rig)
  rigRef.current = rig
  const board = useMemo(() => boardOf(circuit), [circuit])
  const sections = sectionsOf(circuit)
  const focusSection = sections.find((s) => s.id === focus)
  const fswBp = board.parts.find((b) => b.fp === 'FSW3' || b.fp === 'PUSH')
  const fswPart = fswBp?.part

  // footswitch off = bypass: every sound stage drops out, except buffers that stay in the path (buffered bypass, TS808 style)
  const effBypass = useMemo(() => {
    if (!fswPart || fswOn) return bypassed
    return new Set([...bypassed, ...fullCircuit.blocks.filter((b) => b.stage && !b.side && !b.buffered).map((b) => b.id)])
  }, [bypassed, fswOn, fswPart, fullCircuit.blocks])

  const structure = fullCircuit.blocks.map((b) => `${b.id}:${b.stage?.kind ?? '-'}`).join('|')

  useEffect(() => {
    if (!started) return
    const chain = fullCircuit.blocks.filter((b) => b.stage && !b.side).map((b) => ({ id: b.id, spec: b.stage! }))
    const taps = fullCircuit.blocks.filter((b) => b.probeTap).map((b) => ({ id: `tap:${b.id}`, stage: b.probeTap!.stage, node: b.probeTap!.node }))
    engine.load(chain, taps)
    engine.setProbe(probeRef.current)
    engine.apply(resolve(lv.audio, values, removed, effBypass, partVals, lv.effects))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, structure])

  useEffect(() => {
    if (!started) return
    void engine.setInput(input)
  }, [started, input, engine])

  useEffect(() => {
    if (started) engine.apply(resolve(lv.audio, values, removed, effBypass, partVals, lv.effects))
  }, [started, lv, values, removed, effBypass, partVals, engine])

  useEffect(() => {
    if (!started) return
    engine.setProbe(probe)
    engine.setListenAtProbe(rig.listenAtProbe)
  }, [started, probe, rig.listenAtProbe, engine])

  useEffect(() => {
    if (!started) return
    const buf = new Float32Array(256)
    return startScopeLoop({
      engine,
      getProbe: () => probeRef.current,
      canvas: () => canvas.current,
      minis: minis.current,
      miniOn: () => rigRef.current.miniScopes,
      zoom: () => rigRef.current.scopeZoom,
      inCanvas: () => inCanvas.current,
      inputId: INPUT_ID,
      onFrame: () => {
        for (const el of leds.current.values()) {
          const an = el.isConnected ? engine.analyser(el.dataset.src ?? '') : null
          if (!an) continue
          an.getFloatTimeDomainData(buf)
          el.style.opacity = buf[buf.length - 1] > 0 ? '1' : '0.08'
        }
      },
    })
  }, [started, engine])

  const registerMini = useCallback((id: string, el: SVGPolylineElement | null) => {
    if (el) minis.current.set(id, el)
    else minis.current.delete(id)
  }, [])
  const registerLed = useCallback((id: string, el: SVGElement | null) => {
    if (el) leds.current.set(id, el)
    else leds.current.delete(id)
  }, [])

  const toggle = (set: Set<string>, id: string) => {
    const n = new Set(set)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  }

  // test hook: select a part by id (headless checks drive the inspector with it)
  useEffect(() => {
    window.__cwSelect = (id: string) => setSel({ kind: 'part', id })
    window.__cwRung = (id: string | null) => setRung(id)
  }, [])
  useEffect(() => {
    window.__cwParts = () => circuit.parts.map((x) => x.id)
  }, [circuit])
  // a part that doesn't exist on this rung can't stay selected
  useEffect(() => {
    if (sel?.kind === 'part' && lv.present && !lv.present.has(sel.id)) setSel(null)
  }, [lv.present, sel])
  const selKey = sel ? `${sel.kind}:${sel.id}` : ''
  const hiNet = hi && hi.key === selKey ? hi.net : null
  const onHiNet = (net: string | null) => {
    setHi(net ? { key: selKey, net } : null)
    if (net && view !== 'board') setView('board')
  }
  const setPartVal = (id: string, v: number | string | undefined) => setPartVals((m) => {
    const n = { ...m }
    if (v === undefined) delete n[id]
    else n[id] = v
    return n
  })
  const changed = useMemo(() => new Set(Object.keys(partVals)), [partVals])
  // changed resistor and cap values show up on the parts themselves (bands, printed values)
  const shownBoard = useMemo(() => {
    const ids = Object.keys(partVals).filter((id) => typeof partVals[id] === 'number')
    if (!ids.length) return board
    const unit = new Map(circuit.parts.map((x) => [x.id, x.tune?.unit]))
    return { ...board, parts: board.parts.map((bp) => (bp.part && ids.includes(bp.part) && ['R', 'CC', 'CF', 'CP'].includes(bp.fp) && bp.value
      ? { ...bp, value: fmtValue(partVals[bp.part] as number, unit.get(bp.part)) } : bp)) }
  }, [board, partVals, circuit.parts])
  const selPart = sel?.kind === 'part' ? sel.id : null
  const selPartObj = circuit.parts.find((x) => x.id === selPart)
  const neighbors = useMemo(
    () => new Set(selPartObj ? [...selPartObj.connects, ...circuit.parts.filter((x) => x.connects.includes(selPartObj.id)).map((x) => x.id)] : []),
    [selPartObj, circuit.parts],
  )
  const selSection = sel?.kind === 'section' ? sel.id : null

  const probeName =
    probe === INPUT_ID ? 'input' : probe.startsWith('tap:') ? `${fullCircuit.blocks.find((b) => `tap:${b.id}` === probe)?.title} (side tap)` : `after ${fullCircuit.blocks.find((b) => b.id === probe)?.title}`

  const onNet = (id: string) => {
    setSel({ kind: 'net', id })
    const n = board.nets.find((x) => x.id === id)
    if (n?.probe) setProbe(n.probe)
  }
  const onLink = (id: string) => {
    setSel({ kind: 'link', id })
    const l = linksOf(circuit).find((x) => x.id === id)
    if (l?.probe) setProbe(l.probe)
  }
  const drill = (id: string) => {
    setFocus(id)
    setView('path')
    setSel({ kind: 'section', id })
  }
  const show = (v: 'board' | 'path') => {
    if (v === 'path' && selPart) {
      const s = sectionOfPart(circuit, selPart)
      setFocus(s && s.blocks.length > 1 ? s.id : null)
    }
    if (v === 'board') setFocus(null)
    setView(v)
  }
  const key = <KeyOverlay circuit={circuit} sel={sel} onSel={setSel} map={view === 'map'} onFund={() => setFund({ term: null })} />

  return (
    <main className="bench">
      <section className="stage-col">
        <About circuit={circuit} board={board} />
        {buildBar}
        <div className={'stage stage-' + view}>
          {view === 'board' && (
            <Board circuit={circuit} board={shownBoard} selPart={selPart} selNet={sel?.kind === 'net' ? sel.id : hiNet} selSection={selSection} neighbors={neighbors} changed={changed} onResetVals={() => setPartVals({})}
              fresh={lv.fresh} layered={layered}
              removed={removed} probe={probe} values={values} setValue={setValue} fswOn={fswOn} onFsw={() => setFswOn((x) => !x)} registerLed={registerLed}
              onPart={(pid, bpId) => setSel(pid ? { kind: 'part', id: pid } : { kind: 'bpart', id: bpId })} onNet={onNet} onSection={(id) => setSel({ kind: 'section', id })} overlay={key} />
          )}
          {view === 'map' && (
            <SectionMap circuit={circuit} selSection={selSection ?? (selPart ? sectionOfPart(circuit, selPart)?.id ?? null : null)} selLink={sel?.kind === 'link' ? sel.id : null}
              onSection={(id) => setSel({ kind: 'section', id })} onDrill={drill} onLink={onLink} overlay={key} />
          )}
          {view === 'path' && (
            <div className="path-wrap">
              <div className="crumb">
                {focusSection ? (
                  <>
                    <button onClick={() => setView('map')}>Map</button><span aria-hidden="true">›</span><b style={{ color: focusSection.tint }}>{focusSection.title}</b>
                    <button className="ghost" onClick={() => setFocus(null)}>Whole path</button>
                  </>
                ) : (
                  <span className="muted">The whole signal path, left to right. Open a section from the Map to zoom in.</span>
                )}
              </div>
              <div className="schem-wrap">
                <Schematic
                  circuit={circuit}
                  removed={removed}
                  bypassed={effBypass}
                  selected={selPart}
                  probe={probe}
                  focus={focusSection?.blocks ?? null}
                  onSelectPart={(id) => setSel({ kind: 'part', id })}
                  onSelectBlock={(id) => setSel({ kind: 'block', id })}
                  onProbe={setProbe}
                  onToggleBlock={(id) => setBypassed((s) => toggle(s, id))}
                  registerMini={registerMini}
                  onRail={(id) => setSel({ kind: 'rail', id })}
                  onWire={(id, pid) => { setSel({ kind: 'wire', id }); if (pid) setProbe(pid) }}
                  selWire={sel?.kind === 'wire' ? sel.id : null}
                  fresh={lv.fresh}
                  layered={layered}
                />
              </div>
              {key}
            </div>
          )}
        </div>
        <Controls circuit={circuit} values={values} setValue={setValue} onSelectPart={(id) => setSel({ kind: 'part', id })} selPart={selPart}
          fsw={fswPart ? { on: fswOn, toggle: () => setFswOn((x) => !x), part: fswPart, label: fswBp?.fp === 'PUSH' ? 'soft button + JFET switching' : undefined } : undefined}
          layer={lv.rung && rung ? { rung, setRung } : undefined} />
      </section>
      <Inspector
        circuit={circuit}
        board={board}
        sel={sel}
        removed={removed}
        bypassed={bypassed}
        probe={probe}
        probeName={probeName}
        onSel={setSel}
        onTogglePart={(id) => setRemoved((s) => toggle(s, id))}
        onToggleBlock={(id) => setBypassed((s) => toggle(s, id))}
        onDrill={drill}
        onShow={show}
        onRestore={() => { setRemoved(new Set()); setBypassed(new Set()); setFswOn(true) }}
        canvas={canvas}
        inCanvas={inCanvas}
        input={input}
        defaultInput={circuit.defaultInput}
        onInput={setInput}
        listen={rig.listenAtProbe}
        onListen={setListen}
        onFund={(term, from) => setFund({ term, from })}
        partVals={partVals}
        onPartVal={setPartVal}
        onResetVals={() => setPartVals({})}
        fswOn={fswOn}
        onFsw={() => setFswOn((x) => !x)}
        knobValues={values}
        setKnob={setValue}
        hiNet={hiNet}
        onHiNet={onHiNet}
      />
      {fund && (
        <Fundamentals circuit={circuit} values={values} term={fund.term} from={fund.from} onTerm={(term) => setFund({ ...fund, term })} onClose={() => setFund(null)}
          onSee={(s) => { setSel(s); if (s?.kind === 'part' && view === 'map') setView('board'); setFund(null) }} />
      )}
    </main>
  )
}

function setListen(v: boolean) {
  const panel = DialStore.getPanels().find((p) => p.name === 'fiddl3 · rig')
  if (panel) DialStore.updateValue(panel.id, 'listenAtProbe', v)
}
