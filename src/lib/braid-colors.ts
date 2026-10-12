/*
 * The braiding-hair colours the studio works with, by their usual code, with a swatch to show them.
 * Kept in step with server/src/lib/braid-colors.ts (which checks the code a booking sends).
 */
export const BRAID_COLORS = [
  { code: '1', name: 'Preto', hex: '#0d0b0a' },
  { code: '2', name: 'Preto acastanhado', hex: '#22160f' },
  { code: '4', name: 'Castanho escuro', hex: '#3b2416' },
  { code: '6', name: 'Castanho chocolate', hex: '#5b3520' },
  { code: '30', name: 'Castanho claro', hex: '#8c5a30' },
  { code: '27', name: 'Loiro', hex: '#c8964f' },
  { code: '350', name: 'Ruivo', hex: '#9a3b1c' },
] as const

/** "Cor 27 (Loiro)", or null. */
export function colorLabel(code: string | null | undefined) {
  const c = BRAID_COLORS.find((x) => x.code === code)
  return c ? `Cor ${c.code} (${c.name})` : null
}
