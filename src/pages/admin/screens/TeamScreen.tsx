import { useCallback, useEffect, useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { PERMISSIONS, PERMISSION_INFO, useAdmin, type Permission } from '../admin-context'
import { timeAgo } from '../format'
import {
  Alert,
  Avatar,
  BarButton,
  Cell,
  EmptyState,
  FieldRow,
  IOSSheet,
  Screen,
  Section,
  Segmented,
  ToggleCell,
  plainInput,
  useToast,
} from '../ios'

interface Member {
  id: string
  email: string
  name: string
  role: 'OWNER' | 'STAFF'
  permissions: Permission[]
  avatarVersion: number | null
  createdAt: string
}

const avatarCache = new Map<string, string | null>()

/** A team member's photo, fetched once per version. */
function MemberAvatar({ member, size = 40 }: { member: Member; size?: number }) {
  const key = `${member.id}:${member.avatarVersion}`
  const [src, setSrc] = useState(() => avatarCache.get(key) ?? null)
  useEffect(() => {
    if (!member.avatarVersion || avatarCache.has(key)) return
    api
      .get<{ dataUrl: string | null }>(`/auth/avatar/${member.id}`)
      .then((data) => {
        avatarCache.set(key, data.dataUrl)
        setSrc(data.dataUrl)
      })
      .catch(() => {})
  }, [key, member.id, member.avatarVersion])
  return <Avatar name={member.name || member.email} src={member.avatarVersion ? src : null} size={size} />
}

interface Draft {
  id: string | null
  name: string
  email: string
  password: string
  role: 'OWNER' | 'STAFF'
  permissions: Permission[]
}

const NEW_DRAFT: Draft = { id: null, name: '', email: '', password: '', role: 'STAFF', permissions: ['marcacoes', 'clientes'] }

function summary(member: Member) {
  if (member.role === 'OWNER') return 'Dona da conta · acesso a tudo'
  if (!member.permissions.length) return 'Sem acesso a nada ainda'
  return member.permissions.map((p) => PERMISSION_INFO[p].label).join(', ')
}

export function TeamScreen({ backLabel }: { backLabel: string }) {
  const { me, pop } = useAdmin()
  const toast = useToast()
  const [members, setMembers] = useState<Member[] | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [passwordFor, setPasswordFor] = useState<Member | null>(null)
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

  function edit(member: Member) {
    setError(null)
    setDraft({ id: member.id, name: member.name, email: member.email, password: '', role: member.role, permissions: member.permissions })
  }

  async function save() {
    if (!draft) return
    setBusy(true)
    setError(null)
    try {
      if (draft.id) {
        await api.patch(`/admin/team/${draft.id}`, { name: draft.name.trim(), role: draft.role, permissions: draft.permissions })
        toast('Alterações guardadas')
      } else {
        await api.post('/admin/team', {
          name: draft.name.trim(),
          email: draft.email.trim(),
          password: draft.password,
          role: draft.role,
          permissions: draft.permissions,
        })
        toast(`${draft.name.trim().split(' ')[0]} foi adicionada`)
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
    try {
      await api.delete(`/admin/team/${draft.id}`)
      toast('Removida da equipa')
      setDraft(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível remover.')
    }
  }

  async function setPassword() {
    if (!passwordFor) return
    try {
      await api.post(`/admin/team/${passwordFor.id}/password`, { password: newPassword })
      toast('Password definida')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível definir a password.', true)
    }
  }

  const editing = draft?.id ? members?.find((m) => m.id === draft.id) : null
  const isSelf = draft?.id === me.id
  const canSave =
    draft !== null &&
    draft.name.trim().length > 0 &&
    (draft.id !== null || (/\S+@\S+\.\S+/.test(draft.email) && draft.password.length >= 8))

  return (
    <Screen
      title="Equipa"
      back={{ label: backLabel, onClick: pop }}
      trailing={<BarButton label="Adicionar pessoa" Icon={Plus} onClick={() => {
        setError(null)
        setDraft({ ...NEW_DRAFT })
      }} />}
    >
      {members === null ? (
        <p className="py-10 text-center text-[15px] text-[var(--ios-secondary)]">A carregar…</p>
      ) : members.length === 0 ? (
        <EmptyState Icon={Users} title="Sem equipa" />
      ) : (
        <Section
          footer="Cada pessoa entra na app de admin com o seu email e password, e só vê o que lhe deixares. A dona da conta vê tudo."
        >
          {members.map((member) => (
            <Cell
              key={member.id}
              leading={<MemberAvatar member={member} />}
              title={
                <span>
                  {member.name || member.email}
                  {member.id === me.id && <span className="text-[var(--ios-secondary)]"> (tu)</span>}
                </span>
              }
              subtitle={summary(member)}
              onClick={() => edit(member)}
            />
          ))}
        </Section>
      )}

      <IOSSheet
        open={draft !== null}
        title={draft?.id ? draft.name || 'Pessoa' : 'Nova pessoa'}
        onClose={() => setDraft(null)}
        busy={busy}
        done={{ label: draft?.id ? 'Guardar' : 'Adicionar', onClick: () => void save(), disabled: !canSave }}
      >
        {draft && (
          <>
            {editing && (
              <div className="flex flex-col items-center pt-5">
                <MemberAvatar member={editing} size={72} />
                <p className="mt-2 text-[13px] text-[var(--ios-secondary)]">Na equipa {timeAgo(editing.createdAt).toLowerCase()}</p>
              </div>
            )}
            {error && <p className="mx-8 mt-4 text-[15px] text-[var(--ios-red)]">{error}</p>}
            <Section footer={draft.id ? undefined : 'Dá-lhe esta password; ela pode mudá-la depois em Password e segurança.'}>
              <FieldRow label="Nome">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Nome"
                  maxLength={60}
                  className={`${plainInput} h-11 w-full text-right`}
                />
              </FieldRow>
              {draft.id ? (
                <Cell title="Email" detail={draft.email} />
              ) : (
                <>
                  <FieldRow label="Email">
                    <input
                      value={draft.email}
                      onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                      type="email"
                      autoCapitalize="none"
                      placeholder="nome@exemplo.pt"
                      className={`${plainInput} h-11 w-full text-right`}
                    />
                  </FieldRow>
                  <FieldRow label="Password">
                    <input
                      value={draft.password}
                      onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                      type="text"
                      autoCapitalize="none"
                      autoComplete="off"
                      placeholder="8 caracteres ou mais"
                      className={`${plainInput} h-11 w-full text-right`}
                    />
                  </FieldRow>
                </>
              )}
            </Section>

            <Section header="Função" flush>
              <Segmented
                value={draft.role}
                onChange={(role) => setDraft({ ...draft, role })}
                options={[
                  { value: 'STAFF', label: 'Equipa' },
                  { value: 'OWNER', label: 'Dona da conta' },
                ]}
              />
            </Section>

            {draft.role === 'STAFF' ? (
              <Section header="Pode usar" footer="Tudo o que estiver desligado não lhe aparece na app.">
                {PERMISSIONS.map((permission) => (
                  <ToggleCell
                    key={permission}
                    title={PERMISSION_INFO[permission].label}
                    subtitle={PERMISSION_INFO[permission].hint}
                    checked={draft.permissions.includes(permission)}
                    onChange={(on) =>
                      setDraft({
                        ...draft,
                        permissions: on ? [...draft.permissions, permission] : draft.permissions.filter((p) => p !== permission),
                      })
                    }
                  />
                ))}
              </Section>
            ) : (
              <p className="mx-8 mt-2 text-[13px] text-[var(--ios-secondary)]">
                Acesso a tudo, incluindo adicionar e remover pessoas da equipa.
              </p>
            )}

            {editing && !isSelf && (
              <Section>
                <Cell
                  title="Definir nova password"
                  tinted
                  onClick={() => {
                    setNewPassword('')
                    setPasswordFor(editing)
                  }}
                />
                <Cell title="Remover da equipa" destructive onClick={() => setConfirmRemove(true)} />
              </Section>
            )}
          </>
        )}
      </IOSSheet>

      <Alert
        open={confirmRemove}
        title={`Remover ${draft?.name.split(' ')[0] || 'esta pessoa'}?`}
        message="Deixa de conseguir entrar na app de admin de imediato."
        onClose={() => setConfirmRemove(false)}
        buttons={[
          { label: 'Cancelar', style: 'cancel' },
          {
            label: 'Remover',
            style: 'destructive',
            onClick: () => {
              setConfirmRemove(false)
              void remove()
            },
          },
        ]}
      />
      <Alert
        open={passwordFor !== null}
        title="Nova password"
        message={passwordFor ? `Para ${passwordFor.name || passwordFor.email}. Diz-lha tu.` : undefined}
        onClose={() => setPasswordFor(null)}
        buttons={[
          { label: 'Cancelar', style: 'cancel' },
          {
            label: 'Definir',
            onClick: () => {
              setPasswordFor(null)
              if (newPassword.length >= 8) void setPassword()
              else toast('A password deve ter pelo menos 8 caracteres.', true)
            },
          },
        ]}
      >
        <input
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoCapitalize="none"
          autoComplete="off"
          placeholder="8 caracteres ou mais"
          aria-label="Nova password"
          className={`${plainInput} h-9 w-full rounded-[8px] bg-[var(--ios-cell)] px-2.5 text-[15px]`}
        />
      </Alert>
    </Screen>
  )
}
