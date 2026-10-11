import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { api, assetUrl } from '@/lib/api'
import { useCustomerAuth } from '@/lib/customer-auth'
import type { Testimonial as ApiTestimonial } from '@/lib/types'

type Review = { id: string; quote: string; name: string; date: string; photo?: number }

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const linkClass =
  'inline-flex items-center gap-1.5 font-subtitle text-sm text-onyx underline underline-offset-4 hover:no-underline'

/** The customer's photo, or their initial on black. */
function Avatar({ review }: { review: Review }) {
  return review.photo ? (
    <img
      src={assetUrl(`/testimonials/${review.id}/photo?v=${review.photo}`)}
      alt=""
      loading="lazy"
      className="size-12 shrink-0 rounded-full object-cover"
    />
  ) : (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-onyx font-subtitle text-base font-semibold text-white">
      {review.name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

/**
 * What customers say, in black and white like the FAQ: the title, the counter with arrows and the invitation to
 * leave one on the left; one testimonial at a time in large type on the right (stacked on phones). The invitation
 * opens the profile's testimonial form, or sign in first.
 */
export default function Testimonials() {
  const navigate = useNavigate()
  const { customer } = useCustomerAuth()
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [index, setIndex] = useState(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    api
      .get<ApiTestimonial[]>('/testimonials')
      .then((data) =>
        setReviews(
          data.map((t) => ({
            id: t.id,
            quote: t.content,
            name: t.customer.name,
            date: t.createdAt,
            photo: typeof t.photo === 'number' ? t.photo : undefined,
          })),
        ),
      )
      .catch(() => setReviews([]))
  }, [])

  const total = reviews?.length ?? 0
  const review = reviews?.[index]
  const go = (direction: 1 | -1) => {
    setExpanded(false)
    setIndex((i) => (i + direction + total) % total)
  }
  const leaveOne = () => navigate(customer ? '/conta?tab=testemunho' : '/entrar')
  const when = review ? new Date(review.date) : null
  const long = (review?.quote.length ?? 0) > 280

  return (
    <section id="testemunhos" className="bg-white px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <h2 className="font-logo text-4xl text-onyx sm:text-5xl">O que dizem as nossas clientes</h2>
          <p className="mt-4 max-w-sm font-subtitle text-base font-light leading-relaxed text-onyx/60">
            Palavras de quem já passou pelo nosso espaço.
          </p>

          {total > 1 && (
            <div className="mt-8 flex items-center gap-5">
              <p className="font-subtitle text-sm tabular-nums text-onyx/50">
                <span className="text-onyx">{String(index + 1).padStart(2, '0')}</span> / {String(total).padStart(2, '0')}
              </p>
              <div className="flex gap-2">
                {([-1, 1] as const).map((direction) => (
                  <button
                    key={direction}
                    type="button"
                    aria-label={direction < 0 ? 'Testemunho anterior' : 'Testemunho seguinte'}
                    onClick={() => go(direction)}
                    className="flex size-10 items-center justify-center rounded-full border border-onyx/20 text-xl text-onyx transition-colors hover:border-onyx hover:bg-onyx hover:text-white"
                  >
                    <i className={direction < 0 ? 'bx bx-left-arrow-alt' : 'bx bx-right-arrow-alt'} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 border-t border-onyx/10 pt-6">
            <button type="button" onClick={leaveOne} className={linkClass}>
              Deixar o meu testemunho
              <i className="bx bx-right-arrow-alt text-base" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="min-w-0">
          {reviews === null ? (
            <div className="h-56 animate-pulse rounded-2xl bg-onyx/5" />
          ) : !review || !when ? (
            <div className="border-t border-onyx/10 pt-8">
              <p className="font-subtitle text-2xl font-light text-onyx">Sê a primeira a contar como foi.</p>
              <p className="mt-2 font-subtitle text-sm text-onyx/60">Os testemunhos aparecem aqui depois de aprovados.</p>
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.figure
                key={review.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="border-t border-onyx/10 pt-8"
              >
                <span className="block h-12 font-display text-8xl leading-none text-onyx/20" aria-hidden="true">
                  “
                </span>
                <blockquote
                  className={`font-subtitle text-xl font-light leading-snug text-onyx sm:text-3xl ${
                    long && !expanded ? 'line-clamp-6' : ''
                  }`}
                >
                  {review.quote}
                </blockquote>
                {long && (
                  <button type="button" onClick={() => setExpanded((v) => !v)} className={`mt-4 ${linkClass}`}>
                    {expanded ? 'Ler menos' : 'Ler mais'}
                  </button>
                )}
                <figcaption className="mt-8 flex items-center gap-4">
                  <Avatar review={review} />
                  <span className="min-w-0">
                    <span className="block truncate font-subtitle text-base font-medium text-onyx">{review.name}</span>
                    <span className="block font-subtitle text-sm text-onyx/55">
                      Cliente AFROGLOW · {MONTHS_PT[when.getMonth()]} {when.getFullYear()}
                    </span>
                  </span>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          )}
        </div>
      </div>
    </section>
  )
}
