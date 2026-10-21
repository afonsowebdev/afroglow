import { useCallback, useEffect, useState } from 'react'
import { Sheet, SheetField, sheetFieldClass } from '@/components/ui/sheet'
import { api, ApiError } from '@/lib/api'
import { PERMISSION_INFO, PERMISSIONS, type Permission } from './admin-me'
import { group, Notice, pillButton, Row, Section, Segment, Switch } from './admin-ui'

interface Member {
  id: string
  email: string
  name: string
  role: 'OWNER' | 'STAFF'
  permissions: Permission[]
  createdAt: string
}

interface Draft {
  id: string | null
  name: string
  email: string
  password: string
  role: 'OWNER' | 'STAFF'
  permissions: Permission[]
}

const summary = (m: Member) =>
  m.role === 'OWNER'
    ? 'Dona da conta · acesso a tudo'
    : m.permissions.length
      ? m.permissions.map((p) => PERMISSION_INFO[p].label).join(', ')
      : 'Sem acesso a nada ainda'

/** The people who can open the admin app, and what each one may use. Only the owner sees this page. */
export function TeamView({ meId }: { meId: string }) {
  const [members, setMembers] = useState<Member[] | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  const load = useCallback(async () => {
    try {
      setMembers(await api.get<Member[]>('/admin/team'))
    } catch {
      setMembers([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function open(member: Member | null) {
    setError(null)
    setConfirmRemove(false)
    setNewPassword('')
    setDraft(
      member
        ? { id: member.id, name: member.name, email: member.email, password: '', role: member.role, permissions: member.permissions }
        : { id: null, name: '', email: '', password: '', role: 'STAFF', permissions: ['marcacoes', 'clientes'] },
    )
  }

  async function save() {
    if (!draft) return
    setBusy(true)
    setError(null)
    try {
      if (draft.id) {
        await api.patch(`/admin/team/${draft.id}`, { name: draft.name.trim(), role: draft.role, permissions: draft.permissions })
        if (newPassword) await api.post(`/admin/team/${draft.id}/password`, { password: newPassword })
        setNotice('Alterações guardadas.')
      } else {
        await api.post('/admin/team', {
          name: draft.name.trim(),
          email: draft.email.trim(),
          password: draft.password,
          role: draft.role,
          permissions: draft.permissions,
        })
        setNotice(`${draft.name.trim()} foi adicionada. Dá-lhe o email e a password para entrar.`)
      }
      setDraft(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível guardar.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!draft?.id) return
    setBusy(true)
    try {
      await api.delete(`/admin/team/${draft.id}`)
      setNotice('Removida da equipa.')
      setDraft(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível remover.')
    } finally {
      setBusy(false)
    }
  }

  const isSelf = draft?.id === meId
  const canSave =
    draft !== null &&
    draft.name.trim().length > 0 &&
    (draft.id ? newPassword.length === 0 || newPassword.length >= 8 : /\S+@\S+\.\S+/.test(draft.email) && draft.password.length >= 8)

  return (
    <section className="mt-6">
      {notice && <Notice text={notice} onClose={() => setNotice(null)} />}

      <div className="flex items-end justify-between gap-4">
        <p className="font-subtitle text-sm text-muted-dark">Cada pessoa entra com o seu email e só vê o que lhe deixares.</p>
        <button type="button" onClick={() => open(null)} className={pillButton}>
          <i className="bx bx-user-plus text-lg" aria-hidden="true" />
          Adicionar
        </button>
      </div>

      {members === null ? (
        <p className="mt-6 font-subtitle text-muted-dark">A carregar...</p>
      ) : (
        <div className={`${group} mt-5`}>
          {members.map((m) => (
            <button key={m.id} type="button" onClick={() => open(m)} className="flex w-full items-center gap-3.5 px-4 py-3 text-left active:bg-onyx/[0.04]">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-onyx font-subtitle text-base font-semibold text-white">
                {(m.name || m.email).trim().charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-subtitle text-[15px] font-semibold text-onyx">
                  {m.name || m.email}
                  {m.id === meId && <span className="font-normal text-muted-dark"> (tu)</span>}
                </span>
                <span className="block truncate font-subtitle text-xs text-muted-dark">{summary(m)}</span>
              </span>
              <i className="bx bx-chevron-right text-xl text-onyx/30" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <Sheet
        open={draft !== null}
        title={draft?.id ? draft.name || 'Pessoa' : 'Nova pessoa'}
        description={draft?.id ? draft.email : 'Dá-lhe o email e a password; ela pode mudar a password depois.'}
        icon="bx bx-user"
        busy={busy}
        error={error}
        submitLabel={draft?.id ? 'Guardar' : 'Adicionar'}
        submitDisabled={!canSave}
        onSubmit={() => void save()}
        onClose={() => setDraft(null)}
      >
        {draft && (
          <>
            <SheetField label="Nome">
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={60} className={sheetFieldClass} />
            </SheetField>
            {!draft.id && (
              <>
                <SheetField label="Email">
                  <input
                    type="email"
                    autoCapitalize="none"
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    placeholder="nome@exemplo.pt"
                    className={sheetFieldClass}
                  />
                </SheetField>
                <SheetField label="Password (8 caracteres ou mais)">
                  <input
                    autoCapitalize="none"
                    autoComplete="off"
                    value={draft.password}
                    onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                    className={sheetFieldClass}
                  />
                </SheetField>
              </>
            )}
            <SheetField label="Função">
              <Segment
                value={draft.role}
                onChange={(role) => setDraft({ ...draft, role })}
                options={[
                  ['STAFF', 'Equipa'],
                  ['OWNER', 'Dona da conta'],
                ]}
              />
            </SheetField>
            {draft.role === 'STAFF' ? (
              <Section title="Pode usar">
                <div className={group}>
                  {PERMISSIONS.map((p) => (
                    <Row
                      key={p}
                      title={PERMISSION_INFO[p].label}
                      text={PERMISSION_INFO[p].hint}
                      right={
                        <Switch
                          checked={draft.permissions.includes(p)}
                          onChange={(on) =>
                            setDraft({ ...draft, permissions: on ? [...draft.permissions, p] : draft.permissions.filter((x) => x !== p) })
                          }
                          label={PERMISSION_INFO[p].label}
                        />
                      }
                    />
                  ))}
                </div>
              </Section>
            ) : (
              <p className="font-subtitle text-xs text-muted-dark">Acesso a tudo, incluindo adicionar e remover pessoas da equipa.</p>
            )}
            {draft.id && !isSelf && (
              <>
                <SheetField label="Nova password (opcional)">
                  <input
                    autoCapitalize="none"
                    autoComplete="off"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Se ela se esqueceu da dela"
                    className={sheetFieldClass}
                  />
                </SheetField>
                <button
                  type="button"
                  onClick={() => (confirmRemove ? void remove() : setConfirmRemove(true))}
                  className={`self-center rounded-full px-4 py-2 font-subtitle text-xs ${
                    confirmRemove ? 'bg-red-600 font-medium text-[#ffffff]' : 'text-red-700/80 underline underline-offset-4'
                  }`}
                >
                  {confirmRemove ? 'Toca de novo para remover' : 'Remover da equipa'}
                </button>
              </>
            )}
          </>
        )}
      </Sheet>
    </section>
  )
}
