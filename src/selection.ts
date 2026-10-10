export type Sel =
  | { kind: 'part'; id: string }
  | { kind: 'block'; id: string }
  | { kind: 'wire'; id: string }
  | { kind: 'rail'; id: 'top' | 'bottom' }
  | { kind: 'legend'; id: 'audio' | 'plus' | 'minus' | 'control' | 'bias' | 'ground' }
  | { kind: 'net'; id: string }
  | { kind: 'link'; id: string }
  | { kind: 'section'; id: string }
  | { kind: 'bpart'; id: string }
  | null
