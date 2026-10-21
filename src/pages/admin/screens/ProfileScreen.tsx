import { useRef, useState } from 'react'
import { BellRing, ShieldCheck } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { shrinkAvatar } from '@/lib/avatar'
import { PERMISSION_INFO, useAdmin, type AdminMe } from '../admin-context'
import { ActionSheet, Avatar, BarButton, Cell, FieldRow, Screen, Section, ToggleCell, plainInput, useToast } from '../ios'

/** The admin's own page: photo, name, email, role and what she can do, and her notification choice. */
export function ProfileScreen({ backLabel }: { backLabel: string }) {
  const { me, setMe, avatar, setAvatar, pop, push, can, isOwner } = useAdmin()
  const toast = useToast()
  const [name, setName] = useState(me.name)
  const [photoMenu, setPhotoMenu] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  async function update(patch: Partial<Pick<AdminMe, 'name' | 'notifyNewBookings'>>, done?: string) {
    try {
      setMe(await api.patch<AdminMe>('/auth/me', patch))
      if (done) toast(done)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível guardar.', true)
    }
  }

  async function uploadPhoto(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const data = await shrinkAvatar(file)
      const updated = await api.put<AdminMe>('/auth/me/avatar', { contentType: 'image/jpeg', data })
      setMe(updated)
      setAvatar(`data:image/jpeg;base64,${data}`)
      toast('Foto atualizada')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível usar esta foto.', true)
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function removePhoto() {
    try {
      setMe(await api.delete<AdminMe>('/auth/me/avatar'))
      setAvatar(null)
      toast('Foto removida')
    } catch {
      toast('Não foi possível remover a foto.', true)
    }
  }

  const nameDirty = name.trim() !== me.name

  return (
    <Screen
      title="Perfil"
      back={{ label: backLabel, onClick: pop }}
      trailing={nameDirty ? <BarButton label="Guardar" bold onClick={() => void update({ name: name.trim() }, 'Nome guardado')} /> : undefined}
    >
      <div className="flex flex-col items-center pt-2">
        <button type="button" onClick={() => setPhotoMenu(true)} disabled={busy} className="active:opacity-70">
          <Avatar name={me.name || me.email} src={avatar} size={96} />
        </button>
        <button
          type="button"
          onClick={() => setPhotoMenu(true)}
          disabled={busy}
          className="mt-2 h-8 text-[15px] text-[var(--ios-tint)] active:opacity-50 disabled:opacity-40"
        >
          {busy ? 'A enviar…' : avatar ? 'Editar foto' : 'Adicionar foto'}
        </button>
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => void uploadPhoto(e.target.files?.[0])} />
      </div>

      <Section footer="É assim que a app te cumprimenta e que a equipa te vê.">
        <FieldRow label="Nome">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => nameDirty && void update({ name: name.trim() }, 'Nome guardado')}
            maxLength={60}
            placeholder="O teu nome"
            className={`${plainInput} h-11 w-full text-right`}
          />
        </FieldRow>
        <Cell title="Email" detail={me.email} />
        <Cell title="Função" detail={isOwner ? 'Dona da conta' : 'Equipa'} />
      </Section>

      {can('marcacoes') && (
        <Section header="Notificações" footer="Uma notificação neste iPhone sempre que chega um pedido de marcação.">
          <ToggleCell
            Icon={BellRing}
            tint="red"
            title="Novos pedidos"
            checked={me.notifyNewBookings}
            onChange={(value) => void update({ notifyNewBookings: value }, value ? 'Notificações ligadas' : 'Notificações desligadas')}
          />
        </Section>
      )}

      <Section
        header="O que podes fazer"
        footer={isOwner ? 'Como dona da conta tens acesso a tudo, incluindo a equipa.' : 'Para mudar, fala com a dona da conta.'}
      >
        {(Object.keys(PERMISSION_INFO) as Array<keyof typeof PERMISSION_INFO>).map((key) => (
          <Cell
            key={key}
            title={PERMISSION_INFO[key].label}
            subtitle={PERMISSION_INFO[key].hint}
            accessory={can(key) ? 'check' : <span className="text-[15px] text-[var(--ios-tertiary)]">Sem acesso</span>}
          />
        ))}
      </Section>

      <Section>
        <Cell Icon={ShieldCheck} tint="gray" title="Password e segurança" onClick={() => push({ name: 'security' })} />
      </Section>

      <ActionSheet
        open={photoMenu}
        onClose={() => setPhotoMenu(false)}
        actions={[
          { label: 'Escolher foto', onClick: () => fileInput.current?.click() },
          ...(avatar ? [{ label: 'Remover foto', destructive: true, onClick: () => void removePhoto() }] : []),
        ]}
      />
    </Screen>
  )
}
