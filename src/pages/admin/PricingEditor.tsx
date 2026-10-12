import { priceKey } from '@/lib/pricing'
import { splitList, type PricingDraft } from './pricing-draft'

/**
 * Prices by length and/or parting for one hairstyle: the two option lists (comma separated) and one price per
 * combination. Off, the hairstyle has the single price above.
 */
export function PricingEditor({
  draft,
  onChange,
  fieldClass,
}: {
  draft: PricingDraft
  onChange: (draft: PricingDraft) => void
  fieldClass: string
}) {
  const lengths = splitList(draft.lengths)
  const partings = splitList(draft.partings)
  const rows = lengths.length ? lengths : ['']
  const cols = partings.length ? partings : ['']

  return (
    <div className="rounded-2xl border border-onyx/15 p-4">
      <label className="flex items-center justify-between gap-3">
        <span>
          <span className="block font-subtitle text-sm font-medium text-onyx">Preço por comprimento e repartição</span>
          <span className="block font-subtitle text-xs text-muted-dark">
            A cliente escolhe ao marcar. O site mostra &quot;a partir de&quot; o preço mais baixo.
          </span>
        </span>
        <input
          type="checkbox"
          checked={draft.on}
          onChange={(e) => onChange({ ...draft, on: e.target.checked })}
          className="size-5 shrink-0 accent-[#1a1008]"
        />
      </label>

      {draft.on && (
        <div className="mt-4 flex flex-col gap-3">
          <label>
            <span className="mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark">
              Comprimentos (separados por vírgula, vazio se não se aplica)
            </span>
            <input
              value={draft.lengths}
              onChange={(e) => onChange({ ...draft, lengths: e.target.value })}
              placeholder="Curta, Média, Longa"
              className={fieldClass}
            />
          </label>
          <label>
            <span className="mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark">
              Repartições (separadas por vírgula, vazio se não se aplica)
            </span>
            <input
              value={draft.partings}
              onChange={(e) => onChange({ ...draft, partings: e.target.value })}
              placeholder="Grossas, Médias, Finas"
              className={fieldClass}
            />
          </label>

          {(lengths.length > 0 || partings.length > 0) && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-subtitle text-xs">
                {partings.length > 0 && (
                  <thead>
                    <tr>
                      {lengths.length > 0 && <th />}
                      {cols.map((c) => (
                        <th key={c} className="px-1 pb-1.5 text-left font-medium text-muted-dark">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {rows.map((r) => (
                    <tr key={r}>
                      {lengths.length > 0 && <th className="pr-2 text-left font-medium text-muted-dark">{r}</th>}
                      {cols.map((c) => {
                        const key = priceKey(r, c)
                        return (
                          <td key={key} className="p-1">
                            <span className="relative block">
                              <input
                                value={draft.prices[key] ?? ''}
                                onChange={(e) => onChange({ ...draft, prices: { ...draft.prices, [key]: e.target.value } })}
                                inputMode="decimal"
                                aria-label={`Preço ${[r, c].filter(Boolean).join(' · ')}`}
                                className={`${fieldClass} min-w-[4.5rem] pr-6`}
                              />
                              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-dark">
                                €
                              </span>
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
