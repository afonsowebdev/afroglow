import {
  BarChart3,
  BellRing,
  CalendarX2,
  Image as ImageIcon,
  Images,
  LogOut,
  MessageSquareQuote,
  Moon,
  Scissors,
  ShieldCheck,
  Store,
  Tag,
  Users,
} from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { useAdmin } from '../admin-context'
import { Alert, Avatar, Cell, Screen, Section, Toggle } from '../ios'
import { useState } from 'react'

/** Everything else, as the iPhone's Settings: the admin's own card on top, then the business, tools and account. */
export function MoreScreen() {
  const { me, avatar, can, isOwner, push, testimonials, logout } = useAdmin()
  const theme = useTheme()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const pendingTestimonials = testimonials.filter((t) => t.status === 'PENDING').length

  return (
    <Screen title="Mais">
      <Section>
        <Cell
          leading={<Avatar name={me.name || me.email} src={avatar} size={58} />}
          title={<span className="text-lg font-semibold">{me.name || 'O teu perfil'}</span>}
          subtitle={`${me.email} · ${isOwner ? 'Dona da conta' : 'Equipa'}`}
          onClick={() => push({ name: 'profile' })}
        />
      </Section>

      {(can('catalogo') || can('testemunhos') || can('definicoes')) && (
        <Section header="Negócio">
          {can('catalogo') && <Cell Icon={Scissors} tint="indigo" title="Serviços e preços" onClick={() => push({ name: 'services' })} />}
          {can('catalogo') && <Cell Icon={Tag} tint="pink" title="Promoções" onClick={() => push({ name: 'promotions' })} />}
          {can('catalogo') && <Cell Icon={Images} tint="teal" title="Portfólio" onClick={() => push({ name: 'portfolio' })} />}
          {can('testemunhos') && (
            <Cell
              Icon={MessageSquareQuote}
              tint="purple"
              title="Testemunhos"
              badge={pendingTestimonials}
              onClick={() => push({ name: 'testimonials' })}
            />
          )}
          {can('definicoes') && <Cell Icon={Store} tint="gray" title="Definições do negócio" onClick={() => push({ name: 'settings' })} />}
        </Section>
      )}

      {(can('marcacoes') || can('notificacoes') || can('estatisticas')) && (
        <Section header="Ferramentas">
          {can('marcacoes') && <Cell Icon={CalendarX2} tint="red" title="Dias fechados e férias" onClick={() => push({ name: 'closures' })} />}
          {can('notificacoes') && <Cell Icon={BellRing} tint="orange" title="Notificar clientes" onClick={() => push({ name: 'broadcast' })} />}
          {can('estatisticas') && <Cell Icon={BarChart3} tint="green" title="Estatísticas" onClick={() => push({ name: 'stats' })} />}
        </Section>
      )}

      <Section header="Conta">
        {isOwner && <Cell Icon={Users} tint="blue" title="Equipa e permissões" onClick={() => push({ name: 'team' })} />}
        <Cell Icon={ShieldCheck} tint="gray" title="Password e segurança" onClick={() => push({ name: 'security' })} />
        <Cell Icon={ImageIcon} title="Fundo e aparência" onClick={() => push({ name: 'appearance' })} />
        <Cell
          Icon={Moon}
          tint="indigo"
          title="Modo escuro"
          accessory={<Toggle checked={theme.theme === 'dark'} onChange={() => theme.toggleTheme()} label="Modo escuro" />}
        />
      </Section>

      <Section>
        <Cell Icon={LogOut} tint="red" title="Terminar sessão" destructive onClick={() => setConfirmLogout(true)} />
      </Section>

      <p className="mt-6 text-center text-[13px] text-[var(--ios-tertiary)]">AFROGLOW · Painel de gestão</p>

      <Alert
        open={confirmLogout}
        title="Terminar sessão?"
        message="Para voltar a entrar precisas do email e da password."
        onClose={() => setConfirmLogout(false)}
        buttons={[
          { label: 'Cancelar', style: 'cancel' },
          { label: 'Terminar sessão', style: 'destructive', onClick: () => logout() },
        ]}
      />
    </Screen>
  )
}
