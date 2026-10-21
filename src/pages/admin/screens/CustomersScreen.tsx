import { useCallback, useEffect, useMemo, useState } from 'react'
import { UserRound, Users } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { AdminCustomer } from '../admin-types'
import { useAdmin } from '../admin-context'
import { dateKey, euros, plural, shortDate } from '../format'
import { Alert, Avatar, BarButton, EmptyState, Screen, SearchField, Section, Segmented, plainInput, useToast } from '../ios'

type Sort = 'recent' | 'sessions' | 'name'

function badgeOf(customer: AdminCustomer) {
  if (!customer.hasAccount) return 'Sem conta'
  if (Date.now() - new Date(customer.createdAt).getTime() < 14 * 86_400_000) return 'Nova'
  if (customer.bookingCount >= 3) return 'Fiel'
  return null
}

export function CustomersScreen() {
  const { push, bookings } = useAdmin()
  const toast = useToast()
  const [customers, setCustomers] = useState<AdminCustomer[] | null>(null)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<Sort>('name')
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState('')

  const load = useCallback(async () => {
    try {
      setCustomers(await api.get<AdminCustomer[]>('/admin/customers'))
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  // Fresh counts whenever bookings change elsewhere in the app.
  const bookingsKey = bookings.map((b) => b.id + b.status).join()
  useEffect(() => {
    void load()
  }, [load, bookingsKey])

  const list = useMemo(() => {
    if (!customers) return []
    const q = search.trim().toLowerCase()
    const digits = q.replace(/\s/g, '')
    const filtered = q
      ? customers.filter(
          (c) => c.name.toLowerCase().includes(q) || c.phone.replace(/\s/g, '').includes(digits) || (c.email ?? '').toLowerCase().includes(q),
        )
      : customers
    const sorted = [...filtered]
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'pt'))
    else if (sort === 'sessions') sorted.sort((a, b) => b.bookingCount - a.bookingCount || a.name.localeCompare(b.name, 'pt'))
    else sorted.sort((a, b) => (b.lastBookingAt ?? b.createdAt).localeCompare(a.lastBookingAt ?? a.createdAt))
    return sorted
  }, [customers, search, sort])

  // A–Z: one section per letter, as in Contacts.
  const groups = useMemo(() => {
    if (sort !== 'name') return [{ letter: '', items: list }]
    const map = new Map<string, AdminCustomer[]>()
    for (const c of list) {
      const letter = c.name.trim().charAt(0).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '') || '#'
      const key = /[A-Z]/.test(letter) ? letter : '#'
      map.set(key, [...(map.get(key) ?? []), c])
    }
    return [...map.entries()].map(([letter, items]) => ({ letter, items }))
  }, [list, sort])

  const totalSessions = customers?.reduce((sum, c) => sum + c.bookingCount, 0) ?? 0
  const totalSpent = customers?.reduce((sum, c) => sum + c.spentCents, 0) ?? 0
  const allPicked = list.length > 0 && list.every((c) => picked.has(c.id))

  function stopSelecting() {
    setSelecting(false)
    setPicked(new Set())
  }

  async function deletePicked() {
    try {
      const result = await api.post<{ deleted: number }>('/admin/customers/delete', { ids: [...picked], password })
      toast(result.deleted === 1 ? 'Cliente eliminada' : `${result.deleted} clientes eliminadas`)
      stopSelecting()
      await load()
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível eliminar.', true)
    }
  }

  return (
    <Screen
      title="Clientes"
      subtitle={
        customers
          ? `${plural(customers.length, 'cliente', 'clientes')} · ${plural(totalSessions, 'sessão', 'sessões')} · ${euros(totalSpent)}`
          : undefined
      }
      trailing={
        customers?.length ? (
          <BarButton label={selecting ? 'OK' : 'Selecionar'} bold={selecting} onClick={() => (selecting ? stopSelecting() : setSelecting(true))} />
        ) : undefined
      }
    >
      <div className="space-y-3 px-4 pt-2">
        <SearchField value={search} onChange={setSearch} placeholder="Nome, telemóvel ou email" />
        <Segmented
          value={sort}
          onChange={setSort}
          options={[
            { value: 'name', label: 'A–Z' },
            { value: 'recent', label: 'Recentes' },
            { value: 'sessions', label: 'Mais sessões' },
          ]}
        />
      </div>

      {error && (
        <EmptyState Icon={Users} title="Sem ligação" text="Não foi possível carregar as clientes." action={{ label: 'Tentar de novo', onClick: () => void load() }} />
      )}
      {!customers && !error && <p className="py-10 text-center text-[15px] text-[var(--ios-secondary)]">A carregar…</p>}
      {customers && list.length === 0 && (
        <EmptyState
          Icon={UserRound}
          title={search ? 'Nenhuma cliente encontrada' : 'Ainda sem clientes'}
          text={
            search
              ? `Nenhum nome ou telemóvel corresponde a “${search.trim()}”.`
              : 'As clientes aparecem aqui quando criam conta, ou quando marcas uma sessão por elas.'
          }
        />
      )}

      {groups.map((group) =>
        group.items.length ? (
          <Section key={group.letter || 'all'} header={group.letter || undefined}>
            {group.items.map((customer) => {
              const badge = badgeOf(customer)
              const on = picked.has(customer.id)
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() =>
                    selecting
                      ? setPicked((current) => {
                          const next = new Set(current)
                          if (next.has(customer.id)) next.delete(customer.id)
                          else next.add(customer.id)
                          return next
                        })
                      : push({ name: 'customer', id: customer.id })
                  }
                  className="flex w-full items-stretch text-left active:bg-[var(--ios-cell-pressed)]"
                >
                  {selecting && (
                    <span className="flex items-center pl-4">
                      <span
                        className={cn(
                          'flex size-[22px] items-center justify-center rounded-full border-[1.5px] text-[13px] text-[var(--ios-on-tint)]',
                          on ? 'border-[var(--ios-tint)] bg-[var(--ios-tint)]' : 'border-[var(--ios-tertiary)]',
                        )}
                      >
                        {on && '✓'}
                      </span>
                    </span>
                  )}
                  <span className="flex items-center py-2 pl-4">
                    <Avatar name={customer.name} size={40} />
                  </span>
                  <span className="ios-cell-body ml-3 flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-4">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[15px]">{customer.name}</span>
                        {badge && (
                          <span
                            className={cn(
                              'shrink-0 rounded-[5px] px-1.5 py-px text-[11px] font-semibold',
                              badge === 'Fiel' && 'bg-[color-mix(in_srgb,var(--ios-tint)_18%,transparent)] text-[var(--ios-tint)]',
                              badge === 'Nova' && 'bg-[color-mix(in_srgb,var(--ios-green)_18%,transparent)] text-[var(--ios-green)]',
                              badge === 'Sem conta' && 'bg-[var(--ios-fill)] text-[var(--ios-secondary)]',
                            )}
                          >
                            {badge}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-[var(--ios-secondary)]">
                        {plural(customer.bookingCount, 'sessão', 'sessões')} · {euros(customer.spentCents)}
                        {customer.lastBookingAt
                          ? ` · ${new Date(customer.lastBookingAt).getTime() > Date.now() ? 'próxima' : 'última'} ${shortDate(dateKey(customer.lastBookingAt))}`
                          : ''}
                        {customer.adminNotes ? ' · 📝' : ''}
                      </span>
                    </span>
                  </span>
                </button>
              )
            })}
          </Section>
        ) : null,
      )}

      {selecting && (
        <div className="ios-bar fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex h-12 items-center justify-between rounded-full px-5 shadow-lg shadow-black/10">
          <button
            type="button"
            onClick={() => setPicked(allPicked ? new Set() : new Set(list.map((c) => c.id)))}
            className="text-[15px] text-[var(--ios-tint)]"
          >
            {allPicked ? 'Desmarcar todas' : 'Selecionar todas'}
          </button>
          <button
            type="button"
            disabled={picked.size === 0}
            onClick={() => {
              setPassword('')
              setConfirming(true)
            }}
            className="text-[15px] text-[var(--ios-red)] disabled:opacity-30"
          >
            Eliminar{picked.size ? ` (${picked.size})` : ''}
          </button>
        </div>
      )}

      <Alert
        open={confirming}
        title={picked.size > 1 ? `Eliminar ${picked.size} clientes?` : 'Eliminar a cliente?'}
        message="As sessões futuras são canceladas, os dados pessoais e testemunhos apagados. Não pode ser desfeito."
        onClose={() => setConfirming(false)}
        buttons={[
          { label: 'Cancelar', style: 'cancel' },
          {
            label: 'Eliminar',
            style: 'destructive',
            onClick: () => {
              setConfirming(false)
              if (password) void deletePicked()
            },
          },
        ]}
      >
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="A tua password"
          aria-label="A tua password"
          className={`${plainInput} h-9 w-full rounded-[8px] bg-[var(--ios-cell)] px-2.5 text-[15px]`}
        />
      </Alert>
    </Screen>
  )
}
