import { priceKey } from '@/lib/pricing'
import { splitList, type PricingDraft } from './pricing-draft'

/**
 * Prices by length and/or parting for one hairstyle: the two option lists (comma separated) in a white card, and one
 * row per combination with its price in a glass pill (no table to scroll sideways). Off, the hairstyle has the single
 * price above.
 */
export function PricingEditor({
  draft,
  onChange,
  bare = false,
}: {
  draft: PricingDraft
  onChange: (draft: PricingDraft) => void
  /** Only the lists and the table (the on/off switch is the caller's). */
  bare?: boolean
}) {
  const lengths = splitList(draft.lengths)
  const partings = splitList(draft.partings)
  const rows = lengths.length ? lengths : ['']
  const cols = partings.length ? partings : ['']

  const combos = rows.flatMap((r) => cols.map((c) => [r, c] as const))
  const filled = combos.filter(([r, c]) => (draft.prices[priceKey(r, c)] ?? '').trim()).length
  const card = 'overflow-hidden rounded-[22px] bg-card'
  const plain = 'field-plain block w-full min-w-0 !border-0 !bg-transparent !p-0 font-subtitle text-[15px] text-onyx !shadow-none outline-none placeholder:text-onyx/35'
  const label = 'mb-2 px-1 font-subtitle text-[12px] font-semibold text-muted-dark'

  // The two lists as rows of one white card, then one row per combination with its price in a glass pill.
  const body = (
    <div className="flex flex-col gap-4">
      <div>
        <div className={`divide-y divide-onyx/[0.07] ${card}`} style={{ boxShadow: 'var(--card-shadow)' }}>
          {(
            [
              ['Comprimentos', 'lengths', 'Curta, Média, Longa'],
              ['Repartições', 'partings', 'Grossas, Médias, Finas'],
            ] as const
          ).map(([title, field, example]) => (
            <label key={field} className="flex h-[52px] items-center gap-3 px-4">
              <span className="w-[6.25rem] shrink-0 font-subtitle text-[13px] text-muted-dark">{title}</span>
              <input
                value={draft[field]}
                onChange={(e) => onChange({ ...draft, [field]: e.target.value })}
                placeholder={example}
                aria-label={title}
                className={plain}
              />
            </label>
          ))}
        </div>
        <p className="mt-2 px-1 font-subtitle text-xs text-muted-dark">Separa por vírgulas. Deixa uma vazia se não se aplica.</p>
      </div>

      {(lengths.length > 0 || partings.length > 0) && (
        <section>
          <p className={label}>
            Preços{' '}
            <span className="font-normal">
              · {filled} de {combos.length} {combos.length === 1 ? 'preenchido' : 'preenchidos'}
            </span>
          </p>
          <div className={`divide-y divide-onyx/[0.07] ${card}`} style={{ boxShadow: 'var(--card-shadow)' }}>
            {combos.map(([r, c]) => {
              const key = priceKey(r, c)
              const name = [r, c].filter(Boolean).join(' · ')
              const empty = !(draft.prices[key] ?? '').trim()
              return (
                <label key={key} className="flex h-[52px] items-center gap-3 pe-2 ps-4">
                  <span className="min-w-0 flex-1 truncate font-subtitle text-[14px] text-onyx">{name}</span>
                  <span className="glass-chip flex h-9 w-[6.5rem] shrink-0 items-center gap-1 rounded-full px-3.5">
                    <input
                      value={draft.prices[key] ?? ''}
                      onChange={(e) => onChange({ ...draft, prices: { ...draft.prices, [key]: e.target.value } })}
                      inputMode="decimal"
                      placeholder="0"
                      aria-label={`Preço ${name}`}
                      className={`${plain} text-right font-semibold tabular-nums`}
                    />
                    <span className={`font-subtitle text-[13px] ${empty ? 'text-onyx/35' : 'text-onyx'}`}>€</span>
                  </span>
                </label>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )

  if (bare) return body
  return (
    <div className="rounded-[22px] bg-card p-4" style={{ boxShadow: 'var(--card-shadow)' }}>
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
      {draft.on && <div className="mt-4">{body}</div>}
    </div>
  )
}
