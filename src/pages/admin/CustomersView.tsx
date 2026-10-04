import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sheet, SheetField, sheetFieldClass } from '@/components/ui/sheet'
import { api, ApiError } from '@/lib/api'
import { customerWhatsappUrl } from '@/lib/site-config'
import { formatPrice } from '@/lib/types'
import { STATUS_LABEL, type AdminCustomer, type AdminCustomerDetail } from '@/pages/admin/admin-types'

const LISBON_TZ = 'Europe/Lisbon'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { timeZone: LISBON_TZ, day: 'numeric', month: 'short', year: 'numeric' })
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
      (c) => c.name.toLowerCase().includes(q) || c.phone.replace(/\s/g, '').includes(digits) || (c.email ?? '').toLowerCase().includes(q),
    )
  }, [customers, search])

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

  return (
    <section className="mt-6">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Pesquisar por nome, telemóvel ou email"
        aria-label="Pesquisar clientes"
        className="w-full rounded-full border border-gold/30 bg-white px-5 py-3 font-subtitle text-sm text-onyx outline-none placeholder:text-onyx/40 focus-visible:border-gold-deep"
      />

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
          <i className="bx bx-user text-5xl text-gold-deep/40" aria-hidden="true" />
          <p className="mt-3 font-subtitle text-base text-onyx">{search ? 'Nenhum cliente encontrado' : 'Ainda sem clientes'}</p>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {filtered.map((customer) => (
          <button
            key={customer.id}
            type="button"
            onClick={() => setSelected(customer)}
            className="flex items-center gap-4 rounded-2xl border border-gold/20 bg-white p-4 text-left shadow-sm shadow-black/5 transition-colors hover:border-gold-deep"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-deep/10 font-logo text-lg text-gold-deep">
              {customer.name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-subtitle text-base font-semibold text-onyx">{customer.name}</span>
              <span className="block truncate font-subtitle text-xs text-muted-dark">
                {customer.phone}
                {!customer.hasAccount && ' · sem conta'}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-logo text-lg leading-none text-onyx">{customer.bookingCount}</span>
              <span className="block font-subtitle text-[10px] uppercase tracking-wide text-muted-dark">sessões</span>
            </span>
          </button>
        ))}
      </div>

      <Sheet
        open={Boolean(selected)}
        title={selected?.name ?? ''}
        description={selected ? `${selected.phone}${selected.email ? ` · ${selected.email}` : ' · sem conta (adicionado por ti)'}` : undefined}
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
                <div key={label} className="rounded-xl bg-gold-deep/5 px-2 py-3">
                  <p className="font-logo text-sm leading-tight text-onyx">{value}</p>
                  <p className="mt-1 font-subtitle text-[10px] uppercase tracking-wide text-muted-dark">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={customerWhatsappUrl(selected.phone, `Olá ${selected.name}! `)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-full border border-gold/30 py-2.5 font-subtitle text-sm text-onyx hover:border-gold-deep"
              >
                <i className="bx bxl-whatsapp text-lg" aria-hidden="true" /> WhatsApp
              </a>
              <button
                type="button"
                onClick={() => {
                  const customer = selected
                  setSelected(null)
                  onNewBooking(customer)
                }}
                className="flex items-center justify-center gap-2 rounded-full border border-gold/30 py-2.5 font-subtitle text-sm text-onyx hover:border-gold-deep"
              >
                <i className="bx bx-calendar-plus text-lg" aria-hidden="true" /> Nova marcação
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
              <div className="flex flex-col divide-y divide-gold/15">
                {detail?.bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-subtitle text-sm text-onyx">{b.service.name}</p>
                      <p className="font-subtitle text-xs text-muted-dark">{formatDateTime(b.slot.startsAt)}</p>
                    </div>
                    <span className="shrink-0 font-subtitle text-xs text-muted-dark">{STATUS_LABEL[b.status]}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Sheet>
    </section>
  )
}
