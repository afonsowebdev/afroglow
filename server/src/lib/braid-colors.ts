/** The braiding-hair colours the studio works with, by their usual code. Kept in step with src/lib/braid-colors.ts. */
export const BRAID_COLORS: Record<string, string> = {
  '1': 'Preto',
  '2': 'Preto acastanhado',
  '4': 'Castanho escuro',
  '6': 'Castanho chocolate',
  '30': 'Castanho claro',
  '27': 'Loiro',
  '350': 'Ruivo',
}

/** "Cor 27 (Loiro)", or null for no colour. */
export const colorLabel = (code: string | null | undefined) =>
  code && BRAID_COLORS[code] ? `Cor ${code} (${BRAID_COLORS[code]})` : null
