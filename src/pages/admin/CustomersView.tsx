import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sheet, SheetField, sheetFieldClass } from '@/components/ui/sheet'
import { api, ApiError } from '@/lib/api'
import { customerWhatsappUrl } from '@/lib/site-config'
import { formatPrice } from '@/lib/types'
import { STATUS_LABEL, type AdminCustomer, type AdminCustomerDetail } from '@/pages/admin/admin-types'

const LISBON_TZ = 'Europe/Lisbon'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', {
    timeZone: LISBON_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso: string) {
  return `${formatDate(iso)} · ${new Date(iso).toLocaleTimeString('pt-PT', { timeZone: LISBON_TZ, hour: '2-digit', minute: '2-digit' })}`
}

export function CustomersView({
  refreshKey,
  onNewBooking,
}: {
  /** Changes when bookings change elsewhere, so counts stay fresh. */
  refreshKey: string
  onNewBooking: (customer: AdminCustomer) => void
}) {
  const [customers, setCustomers] = useState<AdminCustomer[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AdminCustomer | null>(null)
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [sheetError, setSheetError] = useState<string | null>(null)
  // Deleting: pick one or several (or all), then confirm with the admin's own password.
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null)
  const [password, setPassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sort, setSort] = useState<'recent' | 'sessions' | 'name'>('recent')

  const load = useCallback(async () => {
    try {
      setCustomers(await api.get<AdminCustomer[]>('/admin/customers'))
      setLoadError(null)
    } catch {
      setLoadError('Não foi possível carregar os clientes.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  useEffect(() => {
    if (!selected) return
    setDetail(null)
    setSheetError(null)
    setNotes(selected.adminNotes)
    api
      .get<AdminCustomerDetail>(`/admin/customers/${selected.id}`)
      .then(setDetail)
      .catch(() => setSheetError('Não foi possível carregar o histórico.'))
  }, [selected])

  const filtered = useMemo(() => {
    if (!customers) return []
    const q = search.trim().toLowerCase()
    if (!q) return customers
    const digits = q.replace(/\s/g, '')
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.replace(/\s/g, '').includes(digits) ||
        (c.email ?? '').toLowerCase().includes(q),
    )
  }, [customers, search])

  const sorted = useMemo(() => {
    const list = [...filtered]
    if (sort === 'name') return list.sort((a, b) => a.name.localeCompare(b.name, 'pt'))
    if (sort === 'sessions')
      return list.sort((a, b) => b.bookingCount - a.bookingCount || a.name.localeCompare(b.name, 'pt'))
    return list.sort((a, b) => (b.lastBookingAt ?? b.createdAt).localeCompare(a.lastBookingAt ?? a.createdAt))
  }, [filtered, sort])

  const allPicked = filtered.length > 0 && filtered.every((c) => picked.has(c.id))

  function togglePick(id: string) {
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function stopSelecting() {
    setSelecting(false)
    setPicked(new Set())
  }

  function askDelete(ids: string[]) {
    setPassword('')
    setDeleteError(null)
    setConfirmIds(ids)
  }

  async function confirmDelete() {
    if (!confirmIds) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const result = await api.post<{ deleted: number }>('/admin/customers/delete', { ids: confirmIds, password })
      setConfirmIds(null)
      setSelected(null)
      stopSelecting()
      setNotice(result.deleted === 1 ? 'Cliente eliminado.' : `${result.deleted} clientes eliminados.`)
      await load()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Não foi possível eliminar.')
    } finally {
      setDeleting(false)
    }
  }

  async function saveNotes() {
    if (!selected) return
    setSaving(true)
    setSheetError(null)
    try {
      await api.patch(`/admin/customers/${selected.id}/notes`, { adminNotes: notes })
      setCustomers((list) => list?.map((c) => (c.id === selected.id ? { ...c, adminNotes: notes.trim() } : c)) ?? list)
      setSelected(null)
    } catch (err) {
      setSheetError(err instanceof ApiError ? err.message : 'Erro ao guardar as notas.')
    } finally {
      setSaving(false)
    }
  }

  const totalSessions = customers?.reduce((sum, c) => sum + c.bookingCount, 0) ?? 0
  const totalSpent = customers?.reduce((sum, c) => sum + c.spentCents, 0) ?? 0

  return (
    <section className="mt-6">
      <div className="grid grid-cols-3 divide-x divide-onyx/15 rounded-2xl border-[1.5px] border-onyx/25 bg-white py-4">
        {[
          [customers ? String(customers.length) : '–', 'Clientes'],
          [customers ? String(totalSessions) : '–', 'Sessões'],
          [customers ? formatPrice(totalSpent).replace(/,00/, '') : '–', 'Receita'],
        ].map(([value, label]) => (
          <div key={label} className="px-2 text-center">
            <p className="font-subtitle text-xl font-semibold lining-nums leading-none tracking-tight text-onyx">
              {value}
            </p>
            <p className="mt-1.5 font-subtitle text-[10px] uppercase tracking-[0.14em] text-muted-dark">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <i
            className="bx bx-search pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-onyx/40"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar cliente"
            aria-label="Pesquisar clientes"
            className="w-full rounded-2xl border-2 border-onyx/30 bg-white py-3 pl-11 pr-4 font-subtitle text-sm text-onyx outline-none placeholder:text-onyx/40 focus-visible:border-onyx"
          />
        </div>
        <button
          type="button"
          onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
          className={`shrink-0 rounded-full px-4 py-3 font-subtitle text-sm text-onyx ${selecting ? 'glass-chip-on' : 'glass-chip'}`}
        >
          {selecting ? 'Cancelar' : 'Selecionar'}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="shrink-0 font-subtitle text-[11px] uppercase tracking-wide text-muted-dark">Ordenar</span>
        {(
          [
            ['recent', 'Mais recentes'],
            ['sessions', 'Mais sessões'],
            ['name', 'A–Z'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={sort === id}
            onClick={() => setSort(id)}
            className={`shrink-0 rounded-full px-3.5 py-2 font-subtitle text-xs text-onyx ${
              sort === id ? 'glass-chip-on font-semibold' : 'glass-chip'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {selecting && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-onyx/25 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => setPicked(allPicked ? new Set() : new Set(filtered.map((c) => c.id)))}
            className="flex items-center gap-2 font-subtitle text-sm text-onyx"
          >
            <i className={`bx ${allPicked ? 'bxs-check-square' : 'bx-square'} text-xl`} aria-hidden="true" />
            {allPicked ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
          <button
            type="button"
            disabled={picked.size === 0}
            onClick={() => askDelete([...picked])}
            className="glass-chip rounded-full px-4 py-2 font-subtitle text-sm text-red-700 disabled:opacity-40"
          >
            Eliminar{picked.size > 0 ? ` (${picked.size})` : ''}
          </button>
        </div>
      )}

      {notice && (
        <p className="mt-3 flex items-center gap-2 font-subtitle text-sm text-onyx">
          <i className="bx bx-check-circle text-lg text-gold-ink" aria-hidden="true" /> {notice}
        </p>
      )}
      {loadError && (
        <p className="mt-6 font-subtitle text-sm text-red-700">
          {loadError}{' '}
          <button type="button" onClick={() => void load()} className="underline">
            Tentar de novo
          </button>
        </p>
      )}
      {!customers && !loadError && <p className="mt-6 font-subtitle text-muted-dark">A carregar...</p>}
      {customers && filtered.length === 0 && (
        <div className="mt-12 flex flex-col items-center text-center">
          <i className="bx bx-user text-5xl text-onyx/25" aria-hidden="true" />
          <p className="mt-3 font-subtitle text-base text-onyx">
            {search ? 'Nenhum cliente encontrado' : 'Ainda sem clientes'}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {sorted.map((customer) => {
          const isPicked = picked.has(customer.id)
          const fresh = Date.now() - new Date(customer.createdAt).getTime() < 14 * 86_400_000
          const badge = !customer.hasAccount ? 'Sem conta' : fresh ? 'Nova' : customer.bookingCount >= 3 ? 'Fiel' : null
          return (
            <div
              key={customer.id}
              className={`flex items-stretch overflow-hidden rounded-2xl border-[1.5px] bg-white ${
                isPicked ? 'border-onyx' : 'border-onyx/25'
              }`}
            >
              <button
                type="button"
                onClick={() => (selecting ? togglePick(customer.id) : setSelected(customer))}
                className="flex min-w-0 flex-1 items-center gap-3.5 p-4 text-left"
              >
                {selecting && (
                  <i
                    className={`bx ${isPicked ? 'bxs-check-square text-onyx' : 'bx-square text-onyx/40'} shrink-0 text-2xl`}
                    aria-hidden="true"
                  />
                )}
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-onyx/5 font-logo text-xl text-gold-ink">
                  {customer.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-subtitle text-base font-semibold tracking-tight text-onyx">
                      {customer.name}
                    </span>
                    {badge && (
                      <span className="shrink-0 rounded-full bg-onyx/10 px-2 py-0.5 font-subtitle text-[10px] font-medium text-onyx">
                        {badge}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate font-subtitle text-xs text-muted-dark">{customer.phone}</span>
                  <span className="mt-1.5 flex items-center gap-3 font-subtitle text-xs text-onyx">
                    <span className="font-semibold lining-nums">
                      {customer.bookingCount} {customer.bookingCount === 1 ? 'sessão' : 'sessões'}
                    </span>
                    <span className="text-muted-dark lining-nums">
                      {formatPrice(customer.spentCents).replace(/,00/, '')}
                    </span>
                  </span>
                  <span className="mt-0.5 block font-subtitle text-[11px] text-muted-dark">
                    {customer.lastBookingAt
                      ? `Última marcação: ${formatDate(customer.lastBookingAt)}`
                      : 'Ainda sem marcações'}
                  </span>
                </span>
              </button>
              {!selecting && (
                <a
                  href={customerWhatsappUrl(customer.phone, `Olá ${customer.name}! `)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`WhatsApp de ${customer.name}`}
                  className="flex w-14 shrink-0 items-center justify-center border-l border-onyx/10 bg-onyx/5 text-2xl text-onyx active:opacity-60"
                >
                  <i className="bx bxl-whatsapp" aria-hidden="true" />
                </a>
              )}
            </div>
          )
        })}
      </div>

      <Sheet
        open={Boolean(selected)}
        title={selected?.name ?? ''}
        description={
          selected
            ? `${selected.phone}${selected.email ? ` · ${selected.email}` : ' · sem conta (adicionado por ti)'}`
            : undefined
        }
        icon="bx bx-user"
        busy={saving}
        error={sheetError}
        submitLabel="Guardar notas"
        onSubmit={saveNotes}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Sessões', String(selected.bookingCount)],
                ['Total', formatPrice(selected.spentCents)],
                ['Cliente desde', formatDate(selected.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-onyx/5 px-2 py-3">
                  <p className="font-subtitle font-semibold lining-nums tracking-tight text-sm leading-tight text-onyx">
                    {value}
                  </p>
                  <p className="mt-1 font-subtitle text-[10px] uppercase tracking-wide text-muted-dark">{label}</p>
                </div>
              ))}
            </div>

            <p className="flex items-center gap-2 font-subtitle text-xs text-muted-dark">
              <i
                className={`bx ${selected.reminderChannel === 'PHONE' ? 'bx-message-detail' : 'bx-envelope'} text-base`}
                aria-hidden="true"
              />
              Lembrete 48h antes: {selected.reminderChannel === 'PHONE' ? 'mensagem para o telemóvel' : 'email'}
            </p>

            <div className="grid grid-cols-3 gap-2">
              <a
                href={customerWhatsappUrl(selected.phone, `Olá ${selected.name}! `)}
                target="_blank"
                rel="noreferrer"
                className="glass-chip flex flex-col items-center gap-1 rounded-2xl py-3 font-subtitle text-xs text-onyx"
              >
                <i className="bx bxl-whatsapp text-2xl" aria-hidden="true" />
                WhatsApp
              </a>
              <a
                href={`tel:${selected.phone.replace(/\s/g, '')}`}
                className="glass-chip flex flex-col items-center gap-1 rounded-2xl py-3 font-subtitle text-xs text-onyx"
              >
                <i className="bx bx-phone text-2xl" aria-hidden="true" />
                Ligar
              </a>
              <button
                type="button"
                onClick={() => {
                  const customer = selected
                  setSelected(null)
                  onNewBooking(customer)
                }}
                className="glass-chip flex flex-col items-center gap-1 rounded-2xl py-3 font-subtitle text-xs text-onyx"
              >
                <i className="bx bx-calendar-plus text-2xl" aria-hidden="true" />
                Marcar
              </button>
            </div>

            <SheetField label="Notas privadas">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Preferências, alergias, tamanho... (o cliente não vê)"
                className={`${sheetFieldClass} resize-none`}
              />
            </SheetField>

            <div>
              <p className="mb-2 font-subtitle text-xs uppercase tracking-wide text-muted-dark">Marcações</p>
              {!detail && !sheetError && <p className="font-subtitle text-sm text-muted-dark">A carregar...</p>}
              {detail && detail.bookings.length === 0 && (
                <p className="font-subtitle text-sm text-muted-dark">Sem marcações.</p>
              )}
              <div className="flex flex-col divide-y divide-onyx/10">
                {detail?.bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-subtitle text-sm text-onyx">{b.service.name}</p>
                      <p className="font-subtitle text-xs text-muted-dark">{formatDateTime(b.slot.startsAt)}</p>
                    </div>
                    <span className={`flex shrink-0 items-center gap-1.5 font-subtitle text-xs text-muted-dark`}>
                      <span
                        className={`size-2 rounded-full ${
                          b.status === 'ACCEPTED'
                            ? 'bg-emerald-500'
                            : b.status === 'PENDING'
                              ? 'bg-amber-500'
                              : 'bg-red-600'
                        }`}
                        aria-hidden="true"
                      />
                      {STATUS_LABEL[b.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => askDelete([selected.id])}
              className="self-center font-subtitle text-xs text-red-700/80 underline underline-offset-4"
            >
              Eliminar este cliente
            </button>
          </>
        )}
      </Sheet>

      <Sheet
        open={confirmIds !== null}
        destructive
        icon="bx bx-trash"
        title={confirmIds && confirmIds.length > 1 ? `Eliminar ${confirmIds.length} clientes` : 'Eliminar cliente'}
        description="As sessões futuras são canceladas e os horários ficam livres. Os dados pessoais e testemunhos são apagados e isto não se pode desfazer."
        busy={deleting}
        error={deleteError}
        submitLabel="Eliminar"
        submitDisabled={password.length === 0}
        onSubmit={() => void confirmDelete()}
        onClose={() => setConfirmIds(null)}
      >
        <SheetField label="A tua password de admin">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={sheetFieldClass}
          />
        </SheetField>
      </Sheet>
    </section>
  )
}
