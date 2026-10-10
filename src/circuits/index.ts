import type { Circuit } from '../types'
import fuzzFace from './fuzz-face.json'
import thingamagoop from './thingamagoop.json'
import bassStomp from './bass-stomp.json'
import ringMod from './ring-mod.json'
import tubeScreamer from './tube-screamer.json'
import atariPunk from './atari-punk.json'
import pt2399 from './pt2399.json'

export const circuits: Circuit[] = [
  fuzzFace,
  thingamagoop,
  bassStomp,
  ringMod,
  tubeScreamer,
  atariPunk,
  pt2399,
] as unknown as Circuit[]

export const comingNext: { name: string; why: string }[] = [
  { name: 'Big Muff Pi', why: 'two cascaded clip stages + a mid-scooping tone stack' },
  { name: 'Pro Co RAT', why: 'diodes to ground (hard) after a slow op-amp' },
  { name: 'Pico Paso (PAL198X)', why: 'LM324 Schmitt oscillators; LFO shifts osc 2 thresholds' },
  { name: 'Spring reverb driver', why: 'current-drive an inductor coil; recover millivolts' },
  { name: 'Sallen-Key / ladder / diode VCF', why: 'RC low-passes + feedback = resonance' },
  { name: 'OTA VCA (LM13700)', why: 'control current sets gain' },
  { name: 'AR envelope', why: 'one cap, two steering diodes, two pots' },
  { name: '40106 drone bank', why: 'hysteresis + RC = oscillator' },
  { name: 'VCO core (es.EDU saw)', why: 'current charges cap, Schmitt resets it' },
  { name: 'Piezo contact-mic preamp', why: 'JFET keeps a capacitive source from going tinny' },
  { name: 'Gieskes VCO Fan', why: 'LED → fan blades → LDR = mechanical AM' },
  { name: 'Gieskes Asterisk', why: 'CV motor speed = tape pitch + time' },
  { name: 'HSS3jb photocell LPF', why: 'RC low-pass where R is light' },
]
