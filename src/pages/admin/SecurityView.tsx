import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Bell, Camera, Check, ChevronDown, Eye, EyeOff, KeyRound, LogOut, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { ForgotPasswordSheet } from '@/components/ui/forgot-password-sheet'
import { api, ApiError } from '@/lib/api'
import { cropAvatar } from '@/lib/avatar'
import { AvatarCropper } from './AvatarCropper'
import { tap } from '@/lib/haptics'
import { fullMe, type AdminMe } from './admin-me'

/** How strong a new password looks, 0 – 4, from its length and the kinds of characters in it. */
function strength(password: string) {
  if (password.length < 8) return 0
  let score = 1
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  return score
}
const STRENGTH = ['Curta demais', 'Fraca', 'Razoável', 'Boa', 'Forte']
/** The strength bar's colour: red while weak, yellow when fair, green when good. */
const STRENGTH_COLOUR = ['var(--c-cancelled)', 'var(--c-cancelled)', 'var(--c-waiting)', 'var(--c-confirmed)', 'var(--c-confirmed)']

/** The soft shadow of the Painel's cards. */
const CARD_SHADOW = 'var(--card-shadow)'
const label = 'mb-2 px-1 font-subtitle text-[12px] font-semibold text-muted-dark'

/** A password in a glass field, with the eye to show it. */
function PasswordField({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  autoComplete: string
}) {
  const [shown, setShown] = useState(false)
  return (
    <label className="glass-chip flex h-12 items-center gap-2 rounded-full pe-1.5 ps-4">
      <input
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete={autoComplete}
        className="field-plain h-full min-w-0 flex-1 !border-0 !bg-transparent !p-0 font-subtitle text-base text-onyx !shadow-none outline-none placeholder:text-onyx/40"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? 'Esconder password' : 'Mostrar password'}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-dark"
      >
        {shown ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </label>
  )
}

/** The iPhone switch, green when on. */
function GreenSwitch({ checked, onChange, label: name }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={name}
      onClick={() => {
        void tap()
        onChange(!checked)
      }}
      className="relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-200"
      style={{ background: checked ? 'var(--c-pos)' : 'color-mix(in srgb, var(--color-onyx) 16%, transparent)' }}
    >
      <span
        className={`absolute top-[2px] size-[26px] rounded-full bg-[#ffffff] shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition-all duration-200 ${checked ? 'left-[22px]' : 'left-[2px]'}`}
      />
    </button>
  )
}

/**
 * The admin's account, in the Painel's style: who is signed in (photo, name, role) in a white card, the name in a glass
 * field saved right there, the new-request notifications, the password change folded in a card (current, new, repeat;
 * the iPhone's password autofill; a coloured strength bar and the rule), a way in if the current one is forgotten, and
 * signing out of this device.
 */
export function SecurityView({
  onLogout,
  onPhoto,
}: {
  onLogout: () => void
  /** The new photo, so the profile tab in the bar below shows it at once. */
  onPhoto?: (dataUrl: string) => void
}) {
  const [me, setMe] = useState<AdminMe | null>(null)
  const email = me?.email ?? null
  const [name, setName] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [profileNote, setProfileNote] = useState<string | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [forgotOpen, setForgotOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    api
      .get<Partial<AdminMe> & { email: string }>('/auth/me')
      .then((who) => {
        const full = fullMe(who)
        setMe(full)
        setName(full.name)
        if (full.avatarVersion && full.id) {
          api
            .get<{ dataUrl: string | null }>(`/auth/avatar/${full.id}`)
            .then((data) => setPhoto(data.dataUrl))
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  async function saveProfile(patch: { name?: string; notifyNewBookings?: boolean }, done: string) {
    try {
      setMe(fullMe(await api.patch<AdminMe>('/auth/me', patch)))
      setProfileNote(done)
    } catch (err) {
      setProfileNote(err instanceof ApiError ? err.message : 'Não foi possível guardar.')
    }
  }

  // The photo picked, in the editor until it is placed and used.
  const [cropping, setCropping] = useState<File | null>(null)
  const [savingPhoto, setSavingPhoto] = useState(false)

  function pickPhoto(file: File | undefined) {
    if (photoInput.current) photoInput.current.value = ''
    if (file) setCropping(file)
  }

  async function changePhoto(file: File, crop: { x: number; y: number; side: number }) {
    setSavingPhoto(true)
    try {
      const data = await cropAvatar(file, crop)
      setMe(fullMe(await api.put<AdminMe>('/auth/me/avatar', { contentType: 'image/jpeg', data })))
      setPhoto(`data:image/jpeg;base64,${data}`)
      onPhoto?.(`data:image/jpeg;base64,${data}`)
      setProfileNote('Foto atualizada.')
      setCropping(null)
    } catch (err) {
      setProfileNote(err instanceof ApiError ? err.message : 'Não foi possível usar esta foto.')
      setCropping(null)
    } finally {
      setSavingPhoto(false)
    }
  }

  const score = strength(next)
  const mismatch = confirm.length > 0 && next !== confirm
  const sameAsCurrent = next.length > 0 && next === current
  const canSubmit = current.length > 0 && next.length >= 8 && next === confirm && !sameAsCurrent
  const nameChanged = me ? name.trim() !== me.name && name.trim().length > 0 : false

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || busy) return
    setBusy(true)
    setMessage(null)
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next })
      setCurrent('')
      setNext('')
      setConfirm('')
      setMessage({ ok: true, text: 'Password alterada. Usa a nova da próxima vez que entrares.' })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Who is signed in. */}
      <section className="flex flex-col items-center rounded-[22px] bg-card px-5 pb-5 pt-6 text-center" style={{ boxShadow: CARD_SHADOW }}>
        <button
          type="button"
          onClick={() => photoInput.current?.click()}
          aria-label="Mudar a foto"
          className="relative shrink-0 transition-transform active:scale-[0.97]"
        >
          {photo ? (
            <img src={photo} alt="" className="size-24 rounded-full object-cover shadow-[0_6px_20px_-6px_rgba(0,0,0,0.3)]" />
          ) : (
            <span className="glass-chip flex size-24 items-center justify-center rounded-full font-subtitle text-3xl font-semibold text-onyx">
              {(name || email || '?').trim().charAt(0).toUpperCase()}
            </span>
          )}
          <span className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-card text-onyx shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
            <Camera size={15} />
          </span>
        </button>
        <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
        <p className="mt-3 max-w-full truncate font-subtitle text-[20px] font-semibold tracking-tight text-onyx">{me?.name || 'Sem nome'}</p>
        <p className="max-w-full truncate font-subtitle text-[13px] text-muted-dark">{email ?? '…'}</p>
        {me && (
          <span
            className="mt-2.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 font-subtitle text-[11px] font-semibold text-onyx"
            style={{
              background: `color-mix(in srgb, ${me.role === 'OWNER' ? 'var(--c-confirmed)' : 'var(--c-waiting)'} 15%, transparent)`,
            }}
          >
            <span className="size-1.5 rounded-full" style={{ background: me.role === 'OWNER' ? 'var(--c-confirmed)' : 'var(--c-waiting)' }} aria-hidden="true" />
            {me.role === 'OWNER' ? 'Dona da conta' : 'Equipa'}
          </span>
        )}

        {/* The name, saved right here. */}
        <label className="glass-chip mt-5 flex h-12 w-full items-center gap-3 rounded-full pe-1.5 ps-4 text-left">
          <span className="shrink-0 font-subtitle text-[13px] text-muted-dark">Nome</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Como te chamam"
            className="field-plain h-full min-w-0 flex-1 !border-0 !bg-transparent !p-0 text-right font-subtitle text-base font-medium text-onyx !shadow-none outline-none placeholder:text-onyx/35"
          />
          {nameChanged ? (
            <button
              type="button"
              onClick={() => void saveProfile({ name: name.trim() }, 'Nome guardado.')}
              className="glass-chip-on flex h-9 shrink-0 items-center gap-1 rounded-full px-3 font-subtitle text-[12px] font-semibold text-onyx"
            >
              <Check size={13} strokeWidth={2.6} />
              Guardar
            </button>
          ) : (
            <span className="w-1.5 shrink-0" />
          )}
        </label>
        {profileNote && (
          <p className="mt-2.5 flex items-center gap-1.5 font-subtitle text-xs text-muted-dark">
            <Check size={13} style={{ color: 'var(--c-confirmed)' }} />
            {profileNote}
          </p>
        )}
      </section>

      {/* New-request notifications. */}
      {me && (me.role === 'OWNER' || me.permissions.includes('marcacoes')) && (
        <section>
          <p className={label}>Notificações</p>
          <div className="flex items-center gap-3.5 rounded-[22px] bg-card p-3.5" style={{ boxShadow: CARD_SHADOW }}>
            <span className="glass-chip flex size-10 shrink-0 items-center justify-center rounded-full text-onyx">
              <Bell size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-subtitle text-[15px] font-semibold text-onyx">Novos pedidos</span>
              <span className="block font-subtitle text-xs text-muted-dark">Neste iPhone, sempre que chega um.</span>
            </span>
            <GreenSwitch
              checked={me.notifyNewBookings}
              onChange={(on) => void saveProfile({ notifyNewBookings: on }, on ? 'Notificações ligadas.' : 'Notificações desligadas.')}
              label="Notificar novos pedidos"
            />
          </div>
        </section>
      )}

      {/* Light or dark, as an iOS segmented control (it used to be a button on top). */}
      <section>
        <p className={label}>Aparência</p>
        <div className="flex items-center gap-3.5 rounded-[22px] bg-card p-3.5" style={{ boxShadow: CARD_SHADOW }}>
          <span className="glass-chip flex size-10 shrink-0 items-center justify-center rounded-full text-onyx">
            {theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
          </span>
          <span className="min-w-0 flex-1 font-subtitle text-[15px] font-semibold text-onyx">Tema</span>
          <div className="grid shrink-0 grid-cols-2 rounded-full bg-onyx/[0.06] p-1" role="radiogroup" aria-label="Tema">
            {(
              [
                ['light', 'Claro', Sun],
                ['dark', 'Escuro', Moon],
              ] as const
            ).map(([id, name, Icon]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={theme === id}
                onClick={() => {
                  if (theme === id) return
                  void tap()
                  toggleTheme()
                }}
                className={`flex h-8 items-center justify-center gap-1.5 rounded-full px-3 font-subtitle text-[12px] transition-colors ${
                  theme === id
                    ? 'bg-white font-semibold text-onyx shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] dark:bg-onyx/[0.16]'
                    : 'text-muted-dark'
                }`}
              >
                <Icon size={13} />
                {name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* The password change, folded until needed. */}
      <section>
        <p className={label}>Segurança</p>
        <div className="overflow-hidden rounded-[22px] bg-card" style={{ boxShadow: CARD_SHADOW }}>
          <button
            type="button"
            aria-expanded={passwordOpen}
            onClick={() => {
              void tap()
              setPasswordOpen((v) => !v)
            }}
            className="flex w-full items-center gap-3.5 p-3.5 text-left"
          >
            <span className="glass-chip flex size-10 shrink-0 items-center justify-center rounded-full text-onyx">
              <KeyRound size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-subtitle text-[15px] font-semibold text-onyx">Alterar password</span>
              <span className="block font-subtitle text-xs text-muted-dark">Pelo menos 8 caracteres.</span>
            </span>
            <ChevronDown size={18} className={`shrink-0 text-ink-3 transition-transform duration-300 ${passwordOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence initial={false}>
            {passwordOpen && (
              <motion.div
                key="password"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <form onSubmit={submit} className="flex flex-col gap-2.5 px-3.5 pb-4">
                  {/* The account's email for the iPhone's password manager, so it saves the new one against it. */}
                  <input type="email" autoComplete="username" value={email ?? ''} readOnly hidden />
                  <PasswordField value={current} onChange={setCurrent} placeholder="Password atual" autoComplete="current-password" />
                  <PasswordField value={next} onChange={setNext} placeholder="Nova password" autoComplete="new-password" />
                  <PasswordField value={confirm} onChange={setConfirm} placeholder="Repetir nova password" autoComplete="new-password" />

                  {/* How strong the new one is, and the rule. */}
                  <div className="px-1 pt-1">
                    <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                      {[1, 2, 3, 4].map((step) => (
                        <span
                          key={step}
                          className="h-1.5 rounded-full transition-colors duration-300"
                          style={{
                            background:
                              next.length > 0 && score >= step ? STRENGTH_COLOUR[score] : 'color-mix(in srgb, var(--color-onyx) 10%, transparent)',
                          }}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 font-subtitle text-xs">
                      <span className={`flex items-center gap-1.5 ${next.length >= 8 ? 'text-onyx' : 'text-muted-dark'}`}>
                        <Check
                          size={14}
                          strokeWidth={2.5}
                          style={{ color: next.length >= 8 ? 'var(--c-confirmed)' : undefined, opacity: next.length >= 8 ? 1 : 0.3 }}
                        />
                        Pelo menos 8 caracteres
                      </span>
                      {next.length > 0 && (
                        <span className="font-semibold" style={{ color: STRENGTH_COLOUR[score] }}>
                          {STRENGTH[score]}
                        </span>
                      )}
                    </div>
                    {mismatch && <p className="mt-2 font-subtitle text-xs" style={{ color: 'var(--c-cancelled)' }}>As passwords não coincidem.</p>}
                    {sameAsCurrent && (
                      <p className="mt-2 font-subtitle text-xs" style={{ color: 'var(--c-cancelled)' }}>
                        A nova password tem de ser diferente da atual.
                      </p>
                    )}
                  </div>

                  {message && (
                    <p
                      role={message.ok ? 'status' : 'alert'}
                      className="flex items-start gap-2 rounded-2xl px-3.5 py-2.5 font-subtitle text-[13px] text-onyx"
                      style={{ background: `color-mix(in srgb, ${message.ok ? 'var(--c-confirmed)' : 'var(--c-cancelled)'} 11%, transparent)` }}
                    >
                      {message.ok && <Check size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--c-confirmed)' }} />}
                      {message.text}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!canSubmit || busy}
                    className="mt-1 flex h-12 w-full items-center gap-3 rounded-full bg-card pe-1.5 ps-4 text-left transition-transform active:scale-[0.98] disabled:opacity-45"
                    style={{ boxShadow: CARD_SHADOW }}
                  >
                    <KeyRound size={17} className="shrink-0 text-onyx" />
                    <span className="min-w-0 flex-1 font-subtitle text-[14px] font-semibold text-onyx">{busy ? 'A guardar…' : 'Alterar password'}</span>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-onyx/[0.05] text-onyx">
                      <ArrowRight size={17} />
                    </span>
                  </button>
                  <button type="button" onClick={() => setForgotOpen(true)} className="self-center py-1 font-subtitle text-[13px] text-muted-dark">
                    Não sabes a password atual?
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Leaving this device. */}
      <section>
        <p className={label}>Este aparelho</p>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3.5 rounded-[22px] bg-card p-3.5 text-left transition-transform active:scale-[0.98]"
          style={{ boxShadow: CARD_SHADOW }}
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'color-mix(in srgb, var(--c-cancelled) 13%, transparent)', color: 'var(--c-cancelled)' }}
          >
            <LogOut size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-subtitle text-[15px] font-semibold" style={{ color: 'var(--c-cancelled)' }}>
              Terminar sessão
            </span>
            <span className="block font-subtitle text-xs text-muted-dark">Para voltar precisas do email e da password.</span>
          </span>
        </button>
      </section>

      <AvatarCropper
        file={cropping}
        busy={savingPhoto}
        onCancel={() => setCropping(null)}
        onDone={(crop) => cropping && void changePhoto(cropping, crop)}
      />

      <ForgotPasswordSheet admin open={forgotOpen} initialEmail={email ?? ''} onClose={() => setForgotOpen(false)} />
    </div>
  )
}
