import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MessageSquareQuote } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import type { Testimonial } from '@/lib/types'
import { useAdmin } from '../admin-context'
import { timeAgo } from '../format'
import { Avatar, Button, EmptyState, Screen, Section, Segmented, useToast } from '../ios'

type View = 'PENDING' | 'APPROVED' | 'REJECTED'

/** The author's photo when they chose to show it (fetched with the admin's login), otherwise their initials. */
function AuthorAvatar({ testimonial }: { testimonial: Testimonial }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    if (testimonial.photo !== true) return
    api
      .get<{ dataUrl: string | null }>(`/admin/testimonials/${testimonial.id}/photo`)
      .then((data) => setSrc(data.dataUrl))
      .catch(() => {})
  }, [testimonial.id, testimonial.photo])
  return <Avatar name={testimonial.customer.name} src={src} size={40} />
}

function TestimonialCard({ testimonial, view, onDecision, busy }: { testimonial: Testimonial; view: View; onDecision: (d: 'approve' | 'reject') => void; busy: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const long = testimonial.content.length > 220
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
      className="overflow-hidden rounded-[12px] bg-[var(--ios-cell)]"
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          <AuthorAvatar testimonial={testimonial} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-semibold">{testimonial.customer.name}</p>
            <p className="text-[13px] text-[var(--ios-secondary)]">
              {timeAgo(testimonial.createdAt)}
              {testimonial.photo === true && ' · quer mostrar a foto'}
            </p>
          </div>
        </div>
        <p className={`mt-3 text-[17px] leading-[24px] ${long && !expanded ? 'line-clamp-5' : ''}`}>“{testimonial.content}”</p>
        {long && (
          <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-[15px] text-[var(--ios-tint)]">
            {expanded ? 'Ler menos' : 'Ler tudo'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-4 pb-4">
        {view === 'PENDING' ? (
          <>
            <Button variant="gray" className="h-11 text-[15px]" disabled={busy} onClick={() => onDecision('reject')}>
              Recusar
            </Button>
            <Button className="h-11 text-[15px]" disabled={busy} onClick={() => onDecision('approve')}>
              Publicar
            </Button>
          </>
        ) : (
          <Button
            variant={view === 'APPROVED' ? 'destructiveTinted' : 'tinted'}
            className="col-span-2 h-11 text-[15px]"
            disabled={busy}
            onClick={() => onDecision(view === 'APPROVED' ? 'reject' : 'approve')}
          >
            {view === 'APPROVED' ? 'Retirar do site e da app' : 'Publicar'}
          </Button>
        )}
      </div>
    </motion.div>
  )
}

export function TestimonialsScreen({ backLabel }: { backLabel: string }) {
  const { testimonials, reload, pop } = useAdmin()
  const toast = useToast()
  const [view, setView] = useState<View>('PENDING')
  const [busyId, setBusyId] = useState<string | null>(null)

  const byStatus = (status: View) =>
    testimonials.filter((t) => t.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const current = byStatus(view)

  async function decide(t: Testimonial, decision: 'approve' | 'reject') {
    setBusyId(t.id)
    try {
      await api.post(`/admin/testimonials/${t.id}/${decision}`)
      await reload()
      toast(decision === 'approve' ? 'Publicado' : view === 'APPROVED' ? 'Retirado' : 'Recusado')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível guardar.', true)
    } finally {
      setBusyId(null)
    }
  }

  const empty = {
    PENDING: ['Tudo revisto', 'Não há testemunhos à espera.'],
    APPROVED: ['Nada publicado', 'Os testemunhos publicados aparecem no site e na app.'],
    REJECTED: ['Nenhum recusado', 'Os testemunhos recusados ficam aqui.'],
  }[view]

  return (
    <Screen title="Testemunhos" back={{ label: backLabel, onClick: pop }}>
      <div className="px-4 pt-2">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'PENDING', label: `Por rever (${byStatus('PENDING').length})` },
            { value: 'APPROVED', label: `Publicados (${byStatus('APPROVED').length})` },
            { value: 'REJECTED', label: `Recusados (${byStatus('REJECTED').length})` },
          ]}
        />
      </div>
      {current.length === 0 ? (
        <EmptyState Icon={MessageSquareQuote} title={empty[0]} text={empty[1]} />
      ) : (
        <Section flush footer={view === 'PENDING' ? 'Ao publicar, o testemunho aparece no site e na app com o nome da cliente.' : undefined}>
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {current.map((t) => (
                <TestimonialCard key={t.id} testimonial={t} view={view} busy={busyId === t.id} onDecision={(d) => void decide(t, d)} />
              ))}
            </AnimatePresence>
          </div>
        </Section>
      )}
    </Screen>
  )
}
