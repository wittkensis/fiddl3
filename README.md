# fiddl3 · hear why every part is there (living sketch, v5)

**Live preview: [fiddl3.ericwittke.com](https://fiddl3.ericwittke.com)** (tap anywhere to start the sound; headphones help).

**fiddl3** (renamed from circuit-why in v3; the folders stay `circuit-why/` and `circuit-why-versions/` so paths don't break) is a Vite + React + TypeScript lab that shows real analog audio circuits three ways (**the board you solder**, **a section map**, and **a left-to-right signal path**) and lets you **turn the knobs, flip the switches, stomp the footswitch, pull any part, bypass any block, and probe any wire** while you listen. Every explanation leads with a one-line everyday picture, with the real term kept as a small vocab label. Sound comes from Web Audio *behavioral* models, not SPICE.

## Versions

Frozen, runnable copies of each version are kept locally beside the working copy in `circuit-why-versions/` (not in this repo); this repo tracks the current version. Convention: the working copy stays here at `circuit-why/`; each significant iteration gets frozen as `circuit-why-versions/vN-name/` (source without node_modules, a built `dist/`, screenshots). `vite.config.ts` uses `base: './'`, so any built `dist/` runs from a plain static server:

```bash
npm run build && python3 -m http.server 5180 -d dist
```

- v1 `v1-mvp`: single signal path per circuit.
- v2 `v2-board-sections-eli5`: board view, section map, honesty panel, tappable legend and rails, ELI5 copy everywhere.
- v3 `v3-fiddl3-redesign`: renamed to fiddl3, calm progressive-disclosure layout, picklist switcher, distinct inspector, playable board controls, tooltips, built-in melodies with an In | Out scope, and Fundamentals.
- v4 `v4-values-lugs-pinouts`: change part values (Value tab), multi-lug maps (Lugs tab: 3PDT footswitch, jacks, pots, toggles, transistors), chip pinouts and inside diagrams (Pinout and Inside tabs).
- v5 `v5-layers-tube-screamer` (this copy): Layers, a progressive-complexity ladder for the Tube Screamer (bare diode clipper L0 to the full 74-part TS808 at L6, each rung anchored to a real pedal), and a schematic-faithful TS808 board.

## Run

```bash
git clone https://github.com/wittkensis/fiddl3.git && cd fiddl3
npm install
npm run dev
```

Open the printed `http://localhost:5173`, then tap anywhere (or **▶ Start sound**) to wake the audio (required on iOS and Chrome). Headphones help.

```bash
npm run build    # tsc -b && vite build
npm run preview
npm run lint     # oxlint
```

## What changed in v5 (Layers + a real TS808)

Someone told Eric the Tube Screamer has many more parts than fiddl3 showed. True: v4 drew 15 parts. ElectroSmash's TS808 schematic has **74 physical board parts** (counting the three pots, the LED and the soft button; not the jacks or the battery) in six stages: input buffer, clipping amp, tone/volume, output buffer, power supply, and JFET bypass switching. Only about 23 of them make the sound. v4 left out the 4.5 V tank cap, the 9 V tank cap and the reverse-polarity diode, most of the bias and coupling parts, both transistor buffers, and all 36 switching parts (two JFET switches, a Q5/Q6 flip-flop, a momentary-switch trigger, and Q7 driving the LED).

### Layers (Controls tray, circuits with a ladder)

A compact stepper: **Minimal | Full TS808**, then **L0 … L6**, then two side branches (**TS9**, **Klon**). Each rung shows only the parts that exist at that level on the board and the path; the new ones glow and the earlier ones dim a little. The stepper shows the rung's part count against the full pedal (with a small meter), one ELI5 line for what the layer fixes and what you'd lose without it, a *you can hear it / a little / explain-only* badge, and the real pedal(s) that stop near there, with links. Detail, what the sketch does, and pedal notes wait under **more**. Arrow keys step through the rungs. Switching rungs never rebuilds the audio graph, so you can switch while playing.

| Rung | Adds | Parts | Stops near here | Hear it? |
|---|---|---|---|---|
| L0 Bare diode clipper | 2 diodes from the guitar wire to ground | 2 / 74 | No production pedal ([Falstad diode clipper](https://www.falstad.com/circuit/circuitjs.html?startCircuit=diodeclip.txt)) | Yes: quiet, thin, fizzy only on hard picks |
| L1 Op-amp + diodes to ground | battery, 4.5 V divider, op-amp A, 4.7k + 47 nF gain leg, Drive, output cap, series R, Level | 15 / 74 | [MXR Distortion+](https://electrosmash.mas-effects.com/mxr-distortion-plus-analysis.html), [DOD 250](http://drdfx.hu/en/250/) | Yes: loud, harsh, squared |
| L2 Diodes in the feedback | the diodes move; C4 51 pF | 16 / 74 | [Boss OD-1](https://aionfx.com/app/files/docs/corona_legacy_documentation.pdf) (Aion FX Corona doc) | Yes: smoother, clean bass underneath |
| L3 Tone + volume | R7/C5 sieve, op-amp B, Tone pot, R8/C6, R9, R11 | 23 / 74 | No pedal stops exactly here: this is the TS808's whole sound path ([ElectroSmash](https://electrosmash.mas-effects.com/tube-screamer-analysis.html)) | Yes: the Tone knob |
| L4 Tank caps + guard diode | C16 47 µF, C17 100 µF, D8 | 26 / 74 | Every pedal from here on | Explain-only (hum, ripple, squeal, a backwards supply) |
| L5 Input + output buffers | Q1 and Q3 emitter followers with their C/R parts, RB, C9, RC | 38 / 74 | True-bypass TS808 clones (ElectroSmash's true-bypass BOM: the same 38) | Explain-only (tone suck with long cables) |
| L6 JFET bypass + soft button | 36 switching parts | 74 / 74 | [Ibanez TS808](https://electrosmash.mas-effects.com/tube-screamer-analysis.html) | A little: bypass stays buffered (try the footswitch) |
| TS9 branch | RB 100 Ω → 470 Ω, RC 10k → 100k | 74 / 74 | Ibanez TS9 ([Singlecoil 808 mod](https://www.singlecoil.com/docs/tubescreamer.pdf)) | A little (level and brightness nudge) |
| Klon branch | nothing drawn | n/a | [Klon Centaur](https://electrosmash.mas-effects.com/klon-centaur-analysis.html): clean blend through feedforward paths + summing op-amp, TC1044 charge pump to 18 V, germanium diodes to ground | Explain-only |

Adjusted from the suggested ladder: the 4.5 V divider arrives at L1, not L4, because a single-supply op-amp can't swing without its middle (the Distortion+ has one too); L4 is the tank caps and the guard diode. The 4.7k + 47 nF gain leg also arrives at L1, because the Distortion+ already has the exact same pair (ElectroSmash: 720 Hz); what L2 adds is moving the diodes into the feedback. The Distortion+ and DOD 250 put the gain pot in the gain leg; the ladder keeps the TS layout and turns the Drive pot in the feedback. Branch rungs are verified: Singlecoil's 808 mod swaps the TS9's R55 470 Ω for 100 Ω and R58 100k for 10k; ElectroSmash's Klon page names the TC1044 (+18 V, −9 V) and 1N34A diodes.

Every part at every rung keeps the v4 inspector tabs (Job, Value, Lugs, Pinout, Inside, Wires, If pulled). Selecting a part that doesn't exist on the new rung clears the selection.

### A real TS808 board

The Tube Screamer now has a drawn PCB instead of an auto perfboard: 74 parts (the soft button sits off-board) plus 6 wire pads, 2 jacks and the battery, with 66 nets. **Schematic-faithful, not traced**: every part, value and connection follows ElectroSmash's TS808 schematic; the placement is mine (signal row left to right, then power and JFET switches, then the toggle, trigger and LED driver). I couldn't find a verified photo or trace of the original Ibanez/Maxon board to copy. Nets carry a `layers` list, so the same pins can be wired differently per rung (on L0 and L1 the diodes go to ground; from L2 they sit between pin 1 and pin 2). The JRC4558 Pinout tab now lists the real wires on all 8 pins (tap one to light the trace), and Q1, Q3, Q5, Q6, Q7 (2SC1815: E C B per the Toshiba datasheet) and Q2, Q4 (2SK44: S G D from a pinout listing) have Lugs that light their traces.

### Reusable pattern

```json
"layers": { "full": "L6", "minimal": "L0", "default": "L6", "fullLabel": "Full TS808", "hardware": ["jin", "jout", "bat"], "fullCount": 74,
  "rungs": [{ "id": "L1", "label": "L1", "title": "...", "adds": ["u1a", "r4", "..."], "moves": [], "why": {"eli5": "...", "detail": "..."},
              "hear": "yes", "hearNote": "...", "pedals": [{"name": "MXR Distortion+", "note": "...", "link": {"label": "...", "url": "..."}}],
              "effects": [{"stage": "clip", "param": "curve", "value": "hard"}], "count": 15 }, { "id": "ts9", "branch": "L6", "set": {"rb": "470"} }] }
```

`src/layers.ts` turns a circuit plus a rung id into two views: the drawn circuit (parts, knobs, blocks, sections, links and board nets filtered to the rung) and the audio circuit (every block, so the engine never reloads; only present parts and knobs; plus the rung's `effects`, applied after knobs and values, before pulled parts). Rung effects are self-contained, not cumulative. Counts come from the generator (`cw-authoring/tubescreamer.py`), which asserts 74 and 38 against ElectroSmash. `tsclip` gained a `curve` param (`soft`, `hard`, `diodeGround`), and blocks can be `buffered` so a footswitch off keeps them in the path.

**Could get a ladder next** (not built): Fuzz Face → Tone Bender → Big Muff (one transistor, two, then clipping diodes and a tone stack); the Atari Punk Console → a full synth voice (two timers, then a filter, a VCA and an envelope); a passive RC filter → Sallen-Key → ladder VCF; a bare PT2399 → full echo with feedback and mix; a single LM386 → Ruby amp → Little Gem.

## What changed in v4

Eric asked to change part values and hear what going higher vs lower does, to understand the 9-lug footswitch, and to see how chips and their legs work and whether they are standard parts. Everything lives inside the inspector as tabs (Job · Value · Lugs · Pinout · Inside · Wires · If pulled); no new page sections. Chips open on Pinout and the footswitch opens on Lugs.

### Value tab (52 parts, 7 circuits)
- A stepped slider over standard values: E12 for resistors, E6 for caps, pot travel for pots and trims, inside each part's sane range. Diodes swap type (germanium / silicon / LED / none) and transistors swap gain (low / med / high). A reset arrow puts it back.
- Go higher / Go lower in one ELI5 line each (the one you just moved toward lights up), a **Too far** warning, and a live **real-board math** line: RC corner f = 1 ÷ (2π R C), XR2206 pitch f = 1 ÷ (R C), 555 pulse 1.1 R C, LED current I = V ÷ R (warns past 20 mA), and the PT2399 pin 6 resistor read off the datasheet's delay table.
- A badge says honestly whether **you hear this** (the model is wired to it) or **explain only** ("on the real board you would hear X; this sketch does not model it").
- A Fundamentals chip (Resistance, Capacitance, Current, ...) opens the matching word.
- Changed parts get a Δ badge on the board, resistor bands recolor, and a **Δ Changed parts (n) · reset all** chip sits on the board; the inspector lists each change with a link back to it.
- Model wiring (`resolve.ts`): each tune has targets (`stage.param` scaled by (new ÷ nominal)^exp, or nudged per octave, clamped). 33 parts are heard, 19 are explain-only.

### Lugs tab
- **3PDT footswitch** (Fuzz Face): a zoomed 3 × 3 lug map labeled by pole (audio in, audio out, LED) and position (common in the middle, two throws). Tapping Stomp animates which lugs join (effect on: 1-2-3 side; bypassed: 7-8-9 side). "Three light switches glued together that flip at once", why three poles, what true bypass means, a standard part, and the alternatives (DPDT without LED, soft-touch relay bypass, buffered bypass).
- The same pattern for the stereo input jack used as a battery switch (the ring-lug trick), the DC jack (sleeve / tip / switch), pots and trims (two ends + wiper, wiper moves with the knob), the Thingamagoop switch-pot, toggles (which lugs join in each position, follows the switch) and transistors (E / B / C). Tap any lug to highlight its net on the board.

### Pinout and Inside tabs
- XR2206, CD40106B, TL072, RC4558 (Tube Screamer), LM386, NE555, NE556 (Atari Punk), PT2399, and LM565 (the CA-9 ring mod's chip). A big DIP drawing with every pin numbered and named, colored by role (power, ground, in, out, timing, control, feedback, reference, NC), a one-line ELI5 per pin, what it connects to on this board, and a tap to highlight that net.
- Inside: an ELI5 block diagram (40106 = six Schmitt doormen, TL072 = two op-amps, LM386 = small power amp, XR2206 = VCO + sine shaper + buffer, 555 = two comparators + flip-flop + discharge, PT2399 = ADC → RAM → DAC with a VCO clock), logic vs analog, standard or bespoke, lineage, buying watch-outs, and a datasheet link.
- Pin data was copied from the datasheets saved in the authoring workspace's `datasheets/` folder (text extracted with pdftotext and checked line by line). Every datasheet link was fetched before it went in.

## What changed in v3

### Before / after: boxed sections on screen

| v2 (about 12 boxes, plus one box per knob) | v3 (5 surfaces) |
|---|---|
| 1. Circuit tab row with stars and a "your build" label | **1. Top bar**: fiddl3, the circuit picklist, Fundamentals, Board / Map / Path |
| 2. Key idea box | **2. About this circuit**: one collapsed line (key idea + "how real" dots); opens to key idea, how real is this, sources, notes, coming next |
| 3. Links row (real sim, sources) | (inside About) |
| 4. Legend bar | **3. Stage**: the board, map or path, with the key as a small overlay in the corner and the board tools floating top right |
| 5. View tabs | (in the top bar) |
| 6. Board panel | (the stage) |
| 7. Controls: one box per knob (4 to 9 boxes) | **4. Controls tray**: one row with footswitch, dials, switches and the photocell light pad |
| 8. How real is this panel | (inside About) |
| 9. Notes | (inside About) |
| 10. Scope panel | **5. Inspector**: sticky header (type · name), the ELI5 line, compact tabs, and a probe box at the bottom with melodies and the In | Out scopes |
| 11. "Listen at probe" button | (inside the probe box) |
| 12. Info panel | (the inspector) |
| 13. Footer ("coming next") | (inside About) |

Thingamagoop went from 21 boxes (12 + 9 knob boxes) to 5. On a fresh load you see the picklist, the view switch, the board, the Controls tray and an inspector that just says **Tap anything**.

### The pieces

- **Rename**: fiddl3 in the header, the browser tab, the Dialkit panel name and this README. The tagline is gone.
- **Circuit picklist** (`CircuitPicker.tsx`): a custom listbox, not a native select. Quiet group headings (**Your builds**, **Classics**, **Make your own** for Build mode), a one-line descriptor under each name, a tick on the current one. Keyboard: Enter/Space/↓ opens, arrows/Home/End move, typeahead jumps, Enter picks, Esc or Tab closes; it closes on an outside tap.
- **Inspector** (`Inspector.tsx`): a raised surface with its own tone and a divider, a sticky header showing `type · name` and the title, and × to clear. Content leads with the ELI5 line, then compact tabs (**Job**, **Wires**, **Why here**, **If pulled**), then actions (Pull it and listen, On board, In path). "Why this word matters here" chips at the end jump into Fundamentals.
- **Progressive disclosure**: the key, About and "more" all start as one line. Detail lives one tap down.
- **Board controls** (`Board.tsx` → `BoardControls`): pot knob caps with a pointer and name, trimmers with a slot, toggles showing which way the bat points, the 3PDT footswitch (ON / BYPASS), the photocell with a light readout, and LED halos. Drag a knob up or down, use the arrow keys, or tap to select. Everything stays two-way linked with the Controls tray, the Dialkit pots panel and the sound. LEDs light for real: Thingamagoop LEDacle 1 blinks with the modeled MOD square, LEDacle 2 breathes (decorative: the TL072 isn't modeled), the Fuzz Face status LED follows the footswitch.
- **Footswitch** (Fuzz Face): off means true bypass. The whole effect drops out of the path and the LED goes dark.
- **Faded non-functional bits**: board substrate, enclosures and section tints sit back. Tints show only on hover (of a part or a section chip), when a section is selected, or with the **Sections** toggle.
- **Tooltips** (`Tooltip.tsx`): one delegated layer reads `data-tip` from any element. Mouse hover after 380 ms ("Resistor · R4 (10k)", "Dial (potentiometer) · FUZZ", "Chip · U1 XR2206"), keyboard focus after 300 ms, long-press on touch after 450 ms. On touch the inspector header also shows `type · name`.
- **Melodies**: six built-in synthesized test sounds as plain chips in the probe box: **bass pluck**, **riff in A**, **arpeggio**, **heel stomps**, **drone**, **clean sine** (plus mic and none). Each circuit's default carries a dot (Fuzz Face, Tube Screamer, ring mod, echo: bass pluck; bass stomp: heel stomps; Thingamagoop and Atari Punk Console: none, because they make their own sound). Switching crossfades the old source out and the new one in over a few milliseconds, so there's no click, and the input level knob still applies. Reduced motion still plays audio.
- **In | Out scopes**: the selected melody's waveform sits right next to the probe's output in the same probe box, same trigger and zoom, so you see what goes in and what comes out side by side. ⤢ grows the pair (it also grows on its own when you pick a wire worth probing). 🎧 **hear the probe** replaces the old "Listen at probe" button.
- **Fundamentals** (`fundamentals.ts`, `Fundamentals.tsx`): one click away from the top bar, from the key overlay ("What do volts, amps and ohms mean?"), and from every inspector's "Why this word matters here" chips. It opens on a short primer ("Think of electricity as water on a hill...") and a list of ten words: **voltage**, **current**, **resistance**, **power**, **ground**, **signal vs supply**, **AC vs DC**, **frequency**, **capacitance**, **impedance**. Each word has a poetic one-liner ("Impedance is resistance for wiggles, and a transformer is a gearbox for electricity: few turns in, many turns out, so the voltage goes up and the current goes down."), a **How it links** part with the formula chips `V = I × R` ("height equals flow times squeeze"), `P = V × I` ("work equals height times flow") and friends, chips to hop between related words, a **See it here** hook into the live circuit ("Ohms is how tight the faucet is on PC1's timing path", "Watts is how hard the LM386 works to push the speaker cone") with a **Show me** button that selects that part or rail, and the technical version under **more**. At the top sits a small living water diagram: tank height is the battery voltage, the faucet gap follows a real knob (the photocell light on the Thingamagoop, the first dial elsewhere), the stream speed is the current and the mill wheel is the power. It is labeled "toy numbers, not measured", the focused word lights up, and reduced motion freezes the flow and wheel.
- **Polish**: one set of spacing, type, radius and motion tokens (`index.css`); visible focus rings everywhere; subtle motion that switches off under `prefers-reduced-motion`; 44 px tap targets on phones; on phones the inspector becomes a bottom sheet (peeks 132 px, slides up when you select something, handle to lower it) and Fundamentals becomes a bottom sheet too.
- **Kept from v2**: three views with one shared selection, probe anywhere, pull a part / bypass a block, Build mode, the eli5/detail split, the honesty ratings, the positive-ground callout, Dialkit.

## The three views

| View | What it shows | Tap |
|---|---|---|
| **Board** (default) | Top-down SVG mockup of what you'd solder: banded resistors, ceramic and electrolytic caps, TO-92 and metal-can transistors, DIP chips with notch and pin numbers, photocells, LEDs, jacks, battery snap. The playable controls (knobs, trimmers, toggles, footswitch, photocell, LEDs) stand out; the substrate and tints fade back. Copper traces and pads, **Off-board** wiring toggle, **Sections** toggle, pan (drag), pinch/wheel zoom, +/−/Fit. | A part opens the inspector and lights its neighbors. A trace, pad or hook-up wire opens that wire and moves the probe there. Knobs turn by dragging. |
| **Map** | Sub-circuits as boxes with typed links: white = audio, amber = control, red+blue = power. Parallel paths drawn explicitly. Dashed = only in some settings. | A box drills into the path view; a link reads what travels on it and probes it. |
| **Path** | One section's parts left to right between the rails, with mini scopes, BYP and probe dots. A breadcrumb returns to the map or shows the whole path. Build mode lives here. | Rails, wires, blocks and parts all open in the inspector. |

## The key (corner overlay)

Collapsed, it is one line: **Key** plus five color swatches (and a red "+ is ground" chip on the Fuzz Face). Open it for tappable chips: white audio, red +, blue −, amber control, grey bias, what ground is, the positive-ground warning, a note on bias and decoupling, and the link into Fundamentals.

## ELI5 copy

Every part, wire, link, section, rail, key idea, honesty note and fundamental is stored as `{ eli5, detail }`. The app shows the ELI5 line (one sentence with an everyday picture) and tucks the plain follow-up under **more**. Active voice, no em dashes, acronyms spelled out, the technical term kept as a small `vocab:` label.

## How real is this?

Each circuit's **About this circuit** line opens to a **How real is this?** list that rates each section (the colored dots on the collapsed line count them):

- **modeled**: a behavioral Web Audio stand-in that responds to the real knobs and to pulled parts.
- **approximated**: present, but the sound is a rough stand-in (for example the LM386 is a soft clipper plus speaker EQ, the Fuzz Face transistors are waveshapers whose bias moves the curve).
- **not modeled**: drawn and explained but silent in the model (power, decoupling, the Thingamagoop TL072 TRI shaper).

| Circuit | Sections |
|---|---|
| Fuzz Face | Input, Output, footswitch (true bypass + LED, new in v3) modeled. Q1, Q2, feedback approximated. Power not modeled. |
| Thingamagoop | XR2206 sound oscillator modeled. 40106 LED/MOD oscillators, LM386 amp approximated. TL072 TRI shaper, power not modeled. |
| Bass stomp | Box resonance, cable/amp modeled. Speaker-as-generator, transformer approximated. |
| Ring mod | Buffer, carrier, multiplier, mix modeled (as ideal math). Power not modeled. |
| Tube Screamer | Buffer, tone, output modeled. Clipping amp approximated. Power and 4.5 V reference not modeled. |
| Atari Punk Console | Both timers and output modeled. Power not modeled. |
| PT2399 echo | Split, repeats loop, mix modeled. Echo engine approximated. 5 V regulator not modeled. |

The audio engine is still a single chain plus side taps: branches are drawn in the map and board, not simulated as separate paths.

**ngspice / eecircuit-engine render: skipped.** Not genuinely feasible tonight: no ngspice on the box, eecircuit-engine adds a multi-MB WASM payload, and an honest render needs device models the circuits depend on (germanium AC128s, the XR2206) that I couldn't source and validate. A render with guessed models would be less honest than the labeled behavioral model. Falstad CircuitJS links stay the "real sim" escape hatch.

## Board fidelity

| Circuit | Board | Fidelity |
|---|---|---|
| ★ Thingamagoop | White kit PCB, 71 board items (52 parts + 19 wire pads), 42 nets | **Kit placement**: follows the Bleep Labs Thingamakit assembly guide (pp. 2 and 4): toggles on top, DIPs in the middle, resistor banks, cap columns, three board-mounted pots, wire pads on the right edge. Traces are redrawn from the v1.1 schematic, not traced from the kit. |
| ★ Fuzz Face | Green kit PCB, 36 items, 18 nets | **Kit placement**: positions measured from Synthrotek's "Da FF Clone" PCB photo (silkscreen R0-R5, C1-C3, TRIM, D1, 3PDT, IN/OUT, DC, battery). Values from Synthrotek forum replies plus the classic Arbiter circuit (BOM PDF didn't load). Transistor pin order and DC-jack wiring are assumptions. |
| ★ Bass stomp | Point-to-point inside a wooden box, 9 items, 4 nets | **From the schematic/description**: no PCB exists; the amp is drawn off-board. |
| ★ Ring mod | Perfboard, 28 items, 15 nets | **Generic**: IC1 is a real TL072 pinout; IC2/IC3 are placeholders because the CA-9 schematic wouldn't load. Electrically follows my reading, not the PAiA board. |
| Tube Screamer (TS808) | Green PCB, 83 items (74 parts including the off-board soft button, 6 wire pads, 2 jacks, the battery), 66 nets, per-rung wiring | **Schematic-faithful** (v5): ElectroSmash's TS808 schematic, my placement. No verified photo or trace of the original board found. |
| APC, PT2399 | Auto perfboard sketch | **Generic**: one row per section, generated from the parts list. |

Routing is automatic: a minimum spanning tree per net with chamfered L traces; ground is a copper pour; off-board parts get curved hook-up wires to the nearest pad of the same net. Traces may cross parts; it's a readable mockup, not a manufacturable layout.

## Circuits

| Circuit | Source | What it teaches |
|---|---|---|
| ★ **Fuzz Face** (Synthrotek clone) | [Synthrotek schematic](https://www.synthrotek.com/products/effect-pedal-circuits/fuzz-face-clone/fuzz-face-schematic/) plus ElectroSmash topology | Two PNP stages and DC feedback. The **20k bias trim** moves Q2's collector (readout ≈ V); mis-bias gives sputter or gating. Positive-ground note. The emitter cap is the gain. |
| ★ **Thingamagoop / Thingamakit** | [Bleep Labs schematic v1.1](https://bleeplabs.com/wp/wp-content/uploads/2015/02/Thingamakit-sch11.gif), read part by part | Photocell = XR2206 timing resistor (light pad sets pitch). Pitch-range caps, pull-up on the open-collector square, 750/750 divider, 220 µF speaker cap, 40106 MOD square keying FSK pin 9, LEDacle → photocell optical feedback. XR2206 = behavioral stand-in |
| ★ **Bass stomp box** (Peterman-style) | Derived from [Peterman's kit](https://www.peterman.shop/products/diy-professional-stomp-box-bass-sound) description | Box resonance (~60–170 Hz, resonant filter on heel knocks). A speaker run backwards is a generator, and the 8 Ω → hi-Z transformer is the impedance-matching idea: pull it and hear the signal collapse. Passive. |
| ★ **Ring modulator** (PAiA CA-9-style) | [Effects Database CA-9](https://www.effectsdatabase.com/diy/anderton/epfm/ringmod) (controls verified; schematic not loadable) | Input × carrier gives sum and difference tones. The balance trim matters (pull it and the carrier leaks). Effect/Normal is a parallel dry path. |
| **Tube Screamer (TS808)** | [ElectroSmash](https://electrosmash.mas-effects.com/tube-screamer-analysis.html) (archive copy) | v5: all 74 parts and **Layers** from a bare diode clipper to the full pedal. Diodes to ground (hard) vs in the feedback (soft), the gain-leg cap and the mid hump, why the tank caps and buffers exist, and JFET soft switching. |
| **Atari Punk Console** | [Jameco APC](https://www.jameco.com/Jameco/workshop/diy/atari-punk-console.html) | Astable triggers a one-shot that ignores triggers while high, which gives stepped pitch |
| **PT2399 echo** | [ElectroSmash PT2399](https://electrosmash.com/pt2399-analysis) | A pin-6 resistor sets the clock (longer = darker), anti-alias and reconstruction filters, feedback loop |

Each circuit links **"Open a real sim"** to a verified Falstad CircuitJS built-in example where one exists (`ceamp`, `schmitt`, `ota-ringmod`, `diodeclip`, `555square`). Bass stomp and PT2399 have no ready model.

**Coming next** (listed at the bottom of "About this circuit" + research file): Big Muff, RAT, Pico Paso, spring reverb driver, Sallen-Key/ladder/diode VCF, OTA VCA, AR envelope, 40106 drones, VCO core, piezo preamp, Gieskes VCO Fan / Asterisk, HSS3jb photocell LPF.

## Data model (add a circuit = add one JSON)

`src/circuits/<id>.json`:
- `blocks[]` (audio `stage` per block), `parts[]` (`term`, `place`, `job/order/breaks` as `{eli5, detail}`, `connects`, `onRemove`), `knobs[]`: unchanged in spirit from v1.
- `board.parts[].blink` (v3): `tap:modosc` (LED follows the modeled MOD square), `breathe` (decorative), `fsw` (lit while the footswitch is on).
- `rails { top, bottom }`: label, sign (+/−/none), ground flag, eli5/detail. `groundNote`, `keyIdea`, `honestyNote` as `{eli5, detail}`.
- `sections[]`: id, title, term, eli5/detail, `blocks` (for drilling into the path view), tint, `map: [x,y,w,h]`, `io` for endpoints, `honesty { level, eli5, detail }`.
- `links[]`: from/to section, `kind: audio | control | power`, label, eli5/detail, `optional`, `probe`, `bend`.
- `board`: style (pcb/perf/p2p), color, size, view box, fidelity + note + reference, `parts[]` (footprint, x/y in 0.1" = 20 units, rot, value, `off` for off-board) and `nets[]` (`pins: ["bpId.pin"]`, kind, probe, pour, eli5/detail).

- v5: `layers` (see What changed in v5), `blocks[].buffered`, `board.nets[].layers` and `links[].layers` (only on those rungs), footprint `PUSH` (momentary switch).
- v4: `parts[].tune` (unit, nominal, series, min/max, targets, choices, higher, lower, tooFar, real, calc, fund), `parts[].lugs` (kind, board part, poles, rows, states with joined lugs, lugs with role and ELI5), `parts[].chip` (chip id, board part, pin use on this board). `src/circuits/chips.json` holds the chip database (pins, inside blocks, lineage, buying, datasheet).

Authoring scripts (Python, outside the app) live in a separate authoring workspace (not in this repo): one generator per circuit (v5: `tubescreamer.py` with `ts_parts.py`, `ts_parts2.py`, `ts_board.py`, `ts_layers.py`, `ts_v4.py`; `archetypes.py` now skips the TS), `v4data.py` (values, lugs, chip use; merged in by `lib.save`), `chips.py` (writes chips.json), `enrich_all.py` (re-applies v4data to every JSON), `datasheets/` (the source PDFs and their text) and `validate.py` (ids, pins, duplicate pins, link endpoints, empty text, no em dashes, chip and lug pins exist).

## Dialkit

Two panels ([dialkit.dev](https://www.dialkit.dev/)), mounted with `productionEnabled`, top right (the round button):
- **fiddl3 · rig**: `inputLevel`, `master`, `listenAtProbe`, `scopeZoom`, `miniScopes`. The input choice moved out of Dialkit into the melody chips.
- **<Circuit> · pots**: one dial per real pot or switch, two-way synced with the board controls and the Controls tray (`useDialKitController`).

## Deploy

The live preview is a static build: `npm run build`, then the contents of `dist/` are uploaded to Hostinger static hosting at [fiddl3.ericwittke.com](https://fiddl3.ericwittke.com). `vite.config.ts` uses `base: './'`, so `dist/` works from any static host or subfolder.

## Stack

`vite` · `react` · `typescript` · `dialkit` + `motion` · Web Audio (no worklets, no WASM) · SVG board, map, path and water diagram · Canvas 2D scopes · `oxlint`.

## Verified (2026-10-09 CT, headless Chrome on the box)

### v5 checks

- `npm run build` and `npm run lint` pass. `cw-authoring/validate.py` passes for all circuits (now layer-aware: no pin on two nets within one rung, no net touching a part that doesn't exist yet on that rung).
- Headless run (`cw-authoring/tests/test8.mjs`): all 7 circuits plus Build mode through Board, Map and Path, then every Tube Screamer rung and branch. **No console errors or warnings.**
- Every present part on every rung opened every inspector tab: L0 3 parts / 11 tabs, L1 17 / 62, L2 18 / 66, L3 26 / 96, L4 29 / 105, L5 41 / 146, L6 77 / 259 (counts include the off-board jacks and battery), none missing tabs.
- Board per rung (board items incl. off-board / glowing / dimmed / traces): L0 4 / 4 / 0 / 3, L1 18 / 14 / 4 / 20, L2 19 / 3 / 16 / 24, L3 26 / 7 / 19 / 35, L4 29 / 3 / 26 / 38, L5 41 / 12 / 29 / 54, L6 77 / 36 / 41 / 105. The stepper reads 2, 15, 16, 23, 26, 38, 74 of 74.
- Switching rungs changes the output where modeled (pluck, Drive 60 %, Level 65 %; RMS level at the output, crest = peak ÷ RMS at the clipper, lower = more squared): L0 out 0.10, clipper crest 1.86 · L1 out 0.34, crest 1.25 (hardest) · L2 out 0.31, crest 1.68 (softer) · L3 Tone dark vs bright: zero-crossing rate 840 vs 1852 /s, level 0.17 vs 0.32 · L4, L5, L6 out 0.30, 0.29, 0.28 (pluck-to-pluck noise; explain-only as labeled) · TS9 out 0.33 vs L6 0.28.
- L6 footswitch off: output 0.17, matching the input buffer's 0.18 (buffered bypass); all four engine stages stay loaded.
- Pinout tab on U1 lists 8 real wires (pin 1 clipping out, 2 minus in, 3 plus in, 4 ground, 5, 6, 7 tone, 8 +9 V); Q1's Lugs list emitter, collector, base with their nets, and tapping one lights 3 traces.
- Mobile (390 × 844): every Layers button is at least 44 px.
- Screenshots: `screenshot-v5-L0-board.png`, `screenshot-v5-L2-board.png`, `screenshot-v5-L6-board-full.png`, `screenshot-v5-rung-stepper.png`, `screenshot-v5-L2-path.png`, `screenshot-v5-mobile-stepper.png`.
- Not verified on a real phone or with a real guitar. Audio was measured numerically, not listened to.

### v4 checks (2026-10-09 CT)

- `npm run build` and `npm run lint` pass. Headless runs of all 7 circuits plus Build mode (`/tmp/cwtest/test6.mjs`, then `/tmp/cwtest/test7.mjs` for v4): **no console errors or warnings**.
- Values change the sound, measured: Atari Punk timing cap 10 nF → 3.3 nF, pitch 431 → 646 Hz; Thingamagoop timing cap to 220 nF, pitch 280 → 129 Hz, 3 Δ badges and the Changed parts (1) chip appear; Fuzz Face R1 33k → 68k lowers the output level 0.48 → 0.43; Tube Screamer clipping diodes silicon → LED raise the level 0.35 → 0.67; bass stomp input impedance to 4.7k drops level 0.13 → 0.02; LED resistor 33k → 220 Ω reads 32.7 mA with the burn-out warning; PT2399 pin 6 resistor reads 87 ms at minimum and "past the table" at 50k.
- Footswitch lug map: effect on joins lugs 1-6 with the LED lit (level 0.48); bypassed joins 4-9, LED dark (0.18).
- XR2206 pinout: tapping pin 7 highlights the timing net on the board (5 parts lit, the rest dimmed).
- Mobile (390 × 844): bottom sheet, every button in Value, Lugs, footswitch and Pinout tabs ≥ 44 px.
- v4 screenshots: `screenshot-v4-value-slider.png`, `screenshot-v4-footswitch-on.png`, `screenshot-v4-footswitch-bypassed.png`, `screenshot-v4-xr2206-pinout.png`, `screenshot-v4-40106-inside.png`, `screenshot-v4-mobile-pinout.png`. Older shots are kept.
- Not verified on a real phone or with a real mic. Audio was measured numerically, not listened to.

### v3 checks (2026-10-08 CT), still passing

- `npm run build` (tsc + vite) and `npm run lint` (oxlint) pass.
- Headless run (`/tmp/cwtest/test6.mjs`) over all 7 circuits plus Build mode, picked through the picklist: the board renders with its controls, tapping a part fills the inspector header and the why-word chips, the map and path render, every melody reaches the output, and **no console errors or warnings**.
- Picklist: opens, shows the three groups, closes on Esc, picks with the keyboard (↓ ↓ Enter).
- Tooltip: hovering a board part shows "Capacitor (ceramic) · C3 (10n)" and hides on leave.
- Board ↔ tray: dragging the Fuzz Face BIAS TRIM cap on the board moves the tray dial 50 → 90; arrow keys on the tray FUZZ dial move the board knob 75 → 65.
- Footswitch: bypass drops the effect (output level 0.26 → 0.20 with the riff, clean signal), the board label reads BYPASS and the status LED goes dark (opacity 0.04), then lights again.
- LEDs: the Thingamagoop LEDacle 1 halo flips between 1.0 and 0.08 with the MOD square; LEDacle 2 breathes.
- Fundamentals: ten words, Resistance → See it here ("FUZZ is a faucet you can turn..."), chip hop to Voltage, Show me selects the + rail and closes the drawer, an inspector why-word chip opens the drawer with "from <part>", Esc closes. The water diagram follows the photocell light (44.7 kΩ → 2.82 kΩ, 201 µA → 3.19 mA).
- Mobile (390 × 844): picking a part opens the inspector as a bottom sheet; all HTML buttons ≥ 44 px.
- Screenshots: `screenshot-v3-default.png` (calm desktop), `screenshot-v3-inspector.png` (XR2206 selected), `screenshot-v3-tooltip.png`, `screenshot-v3-picklist.png`, `screenshot-v3-board-controls.png` (close-up), `screenshot-v3-mobile-sheet.png`, `screenshot-v3-fundamentals.png`. The v1/v2 shots are kept for comparison.
- Not verified on a real phone or with a real mic. Audio was measured numerically, not listened to.

## Known gaps

- v5 Layers: the TS808 board is schematic-faithful, not traced from a real Ibanez/Maxon PCB. ElectroSmash's drawing shows what looks like a second resistor beside R47 with no label of its own; I count R47 plus D11, so the real total could be 75. Its drawing also labels two caps C11 and two resistors R11; fiddl3 names them C11 (dry) / C11 (soft A) and R11 / R11b.
- v5: buffers, tank caps, the guard diode and the JFET switching are explain-only in the sketch (no pickup load, cable, hum, ripple, pops or battery drain are simulated). The L6 difference you hear is only that bypass stays buffered.
- v5: rung effects are hand-tuned behavioral settings (curve, gain, corners), not a solve. L1 stands in for the Distortion+/DOD 250 with the TS's Drive-in-feedback layout and silicon MA150s; the Distortion+ actually uses germanium 1N270s (swap them in the Value tab). D11's role and the D6/R29 emitter level are my readings; the 2SK44 pin order is from a pinout listing, not a maker datasheet.
- v5: the Klon branch is text only; no Klon circuit is drawn.
- v5: the off-board DC jack isn't drawn on the TS808 board (the battery stands for both).

- Behavioral, not circuit-accurate. Branches in the map are drawn, not separately simulated.
- The Fundamentals water diagram uses toy numbers (battery voltage from the rail label, a resistance mapped from one knob); it shows the relationships, not real measurements.
- Thingamagoop LEDacle 2 only breathes on a timer (the TRI shaper is not modeled); LEDacle 1 follows the modeled MOD square.
- Melodies are fixed loops; no tempo or key control yet.
- Board traces are auto-routed from the schematic; on the kit boards only part placement matches the real PCB.
- Fuzz Face transistor pinout and DC-jack wiring, Thingamagoop FSK pin reading, and the CA-9 multiplier are my readings; verify on the boards.
- Build mode has no board (auto sketch) and no branching.
- Explain-only parts (19): mostly coupling caps, bias resistors with no modeled stage, the PT2399 mix and feedback pots, Thingamagoop TRI rate / shape and LED resistors, the Fuzz Face output divider and LEVEL path. Each says what you would hear on the real board.
- Value targets are behavioral scalings, not circuit solves; the formula line shows real-board math, and the model only follows its direction and rough size.
- Only the Fuzz Face board has a 3PDT drawn; the other circuits have no footswitch part, so no lug map. The Tube Screamer transistors now have board parts and highlight nets (v5).
- Chip pins with no wire on a sketch board (Tube Screamer, PT2399, Atari Punk have no board) show the ELI5 and role but no net to highlight.
- XR2206 buying advice names Atommaker's warning in text; the link goes to the EEVblog clone thread, not to an Atommaker page.
- JS bundle ~920 kB minified (Dialkit + motion + board code + the 74-part TS808); not code-split.

## Performance & device fit

Assessment 2026-10-09 (CT), from code review plus headless runs. **No phone benchmarks**; costs are estimates.

| Piece | Cost | Notes |
|---|---|---|
| Audio graph | Low | ~4-6 native nodes per circuit plus a limiter. Melody switching adds one short-lived gain node per switch (old source stops 40 ms after its fade). |
| Analysers | Low-medium | One AnalyserNode per probe point plus the input tap. Mini scopes can be switched off in Dialkit on low phones. |
| **Board SVG** | Medium | Biggest DOM (v5, measured): full TS808 ≈ 2,060 SVG elements, Thingamagoop ≈ 1,830. v3 splits it into a memoized static layer (parts, traces, pads) and a small `BoardControls` layer, so turning a knob re-renders only the controls. Section-tint hover is done with a data attribute and CSS, not React state. Pan/zoom only changes the `viewBox`. |
| LEDs | Low | Blinking LEDs update `opacity` directly inside the existing scope animation frame (no extra rAF, no React). |
| Tooltips | Low | One delegated listener set on the document reads `data-tip`; no per-element handlers or tooltip components. |
| Scopes | Low | The In and Out panes share one Canvas 2D loop, DPR capped at 2, spectrum skipped when small, paused when hidden. |
| Fundamentals | Low | Rendered only while open; the water diagram is ~20 SVG elements animated with CSS. |
| v4 tabs | Low | Value, Lugs, Pinout and Inside render only for the selected part and the active tab. A value change re-resolves params (a loop over ≤ 15 tunes) and sets AudioParams; it does not rebuild the graph. The Δ badges and net highlight are a few SVG nodes; resistor band recolor only touches changed parts. chips.json adds about 32 kB (raw) to the bundle. |
| v5 Layers | Low-medium | A rung switch re-filters parts, nets and links (a few array passes over ≤ 83 board items and 66 nets) and re-routes the board once; the audio graph is not rebuilt, only AudioParams change (plus a one-time WaveShaper curve swap between hard and soft). The full TS808 board is now the biggest DOM: about 2,060 SVG elements (Thingamagoop about 1,830, measured); lower rungs draw far fewer (L0 is a handful). tube-screamer.json grew from 21 kB to 129 kB raw (25 kB gzip); the JS bundle went from 834 kB to 920 kB minified. |
| Map, path | Low | ≤ 11 boxes and ≤ 15 links; the path is ~30-60 elements. |

**Desktop:** full experience; the inspector is a fixed 400 px column. **Phones:** the top bar wraps into two rows, the board fills the width, the Controls tray scrolls sideways, and the inspector is a bottom sheet that peeks with its header and slides up when you pick something. Every HTML control is at least 44 px tall; board controls have padded invisible hit circles. Long-press shows a tooltip; the sheet header shows the type and name anyway. **v4 on phones:** the DIP drawing and lug maps scale to the sheet width; pin and lug lists stack below them with 44 px rows; tapping a pin or lug switches to the board and highlights the net. **v5 on phones:** the Layers stepper wraps to two rows with 44 px buttons; the full TS808 board is wide, so pinch-zoom or step down a rung to see fewer parts. **Low phones:** the full TS808 and the Thingamagoop boards are the heaviest views; use Map or Path if panning stutters and turn off mini scopes. **Reduced motion:** decorative motion (sheet slide, LED breathing, water flow, tooltip fade) stops; audio and the scopes keep working. **iOS:** audio starts after the first tap; the silent switch can mute Web Audio. **Mic:** needs HTTPS or localhost. **Site fit (ericwittke.com/lab):** good lab route; keep it behind the first tap.
