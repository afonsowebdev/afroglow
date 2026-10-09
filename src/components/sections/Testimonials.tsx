import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MotionButton } from '@/components/ui/motion-button'
import { api, assetUrl } from '@/lib/api'
import { useCustomerAuth } from '@/lib/customer-auth'
import type { Testimonial as ApiTestimonial } from '@/lib/types'

type Review = { id: string; quote: string; name: string; date: string; photo?: number }

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** One testimonial, as in the customer app: the quote, then the customer's photo (or initial), name and month. */
function ReviewCard({ review }: { review: Review }) {
  const [open, setOpen] = useState(false)
  const long = review.quote.length > 180
  const when = new Date(review.date)
  return (
    <figure
      data-card
      className="flex w-[85%] shrink-0 snap-start flex-col rounded-[2rem] border-[1.5px] border-onyx/15 bg-white p-7 shadow-[0_10px_30px_rgba(26,16,8,0.06)] sm:w-[60%] md:w-[calc((100%-3rem)/3)]"
    >
      <i className="bx bxs-quote-alt-left text-5xl text-gold/40" aria-hidden="true" />
      <blockquote
        className={`mt-3 flex-1 font-subtitle text-[17px] leading-relaxed text-onyx ${open ? '' : 'line-clamp-6'}`}
      >
        {review.quote}
      </blockquote>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 self-start font-subtitle text-sm font-medium text-onyx underline underline-offset-4"
        >
          {open ? 'Ler menos' : 'Ler mais'}
        </button>
      )}
      <figcaption className="mt-6 flex items-center gap-3 border-t border-onyx/10 pt-4">
        {review.photo ? (
          <img
            src={assetUrl(`/testimonials/${review.id}/photo?v=${review.photo}`)}
            alt=""
            loading="lazy"
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-onyx font-subtitle text-base font-semibold text-[#ffffff] dark:bg-gold-deep">
            {review.name.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate font-subtitle text-sm font-semibold text-onyx">{review.name}</span>
          <span className="block font-subtitle text-xs text-muted-dark">
            Cliente AFROGLOW · {MONTHS_PT[when.getMonth()]} {when.getFullYear()}
          </span>
        </span>
      </figcaption>
    </figure>
  )
}

/**
 * What customers say, in the customer app's card style: three side by side with arrows on wide screens, a
 * swipeable strip on phones, and an invitation to leave one (the profile's Testemunho tab, or sign in first).
 */
export default function Testimonials() {
  const navigate = useNavigate()
  const { customer } = useCustomerAuth()
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [index, setIndex] = useState(0)
  const track = useRef<HTMLDivElement>(null)

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

  // Moves the strip by one card; the counter follows the scroll position.
  const step = (direction: 1 | -1) => {
    const el = track.current
    const card = el?.querySelector<HTMLElement>('[data-card]')
    if (!el || !card) return
    el.scrollBy({ left: direction * (card.offsetWidth + 24), behavior: 'smooth' })
  }

  const leaveOne = () => navigate(customer ? '/conta?tab=testemunho' : '/entrar')

  return (
    <section id="testemunhos" className="bg-white py-24 md:py-32">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-5 text-center sm:px-8">
        <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">Testemunhos</p>
        <h2 className="mt-2 font-logo text-4xl sm:text-5xl">O que dizem as nossas clientes</h2>
      </div>

      {reviews === null ? (
        <div className="mx-auto mt-12 flex max-w-6xl gap-6 overflow-hidden px-5 sm:px-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-64 w-[85%] shrink-0 animate-pulse rounded-[2rem] bg-gold/10 sm:w-[60%] md:w-[calc((100%-3rem)/3)]"
            />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="mx-auto mt-12 flex max-w-md flex-col items-center rounded-[2rem] border-[1.5px] border-dashed border-onyx/20 px-8 py-12 text-center">
          <i className="bx bx-message-rounded-dots text-5xl text-gold-deep/50" aria-hidden="true" />
          <p className="mt-4 font-subtitle text-lg text-onyx">Sê a primeira a contar como foi</p>
          <p className="mt-1 font-subtitle text-sm font-light text-muted-dark">
            Os testemunhos aparecem aqui depois de aprovados.
          </p>
          <div className="mt-6">
            <MotionButton label="Deixar testemunho" size="sm" onClick={leaveOne} />
          </div>
        </div>
      ) : (
        <>
          <div
            ref={track}
            onScroll={(e) => {
              const el = e.currentTarget
              const card = el.querySelector<HTMLElement>('[data-card]')
              if (card) setIndex(Math.min(total - 1, Math.round(el.scrollLeft / (card.offsetWidth + 24))))
            }}
            className="mx-auto mt-12 flex max-w-6xl snap-x snap-mandatory items-stretch gap-6 overflow-x-auto scroll-px-5 px-5 pb-4 [scrollbar-width:none] sm:scroll-px-8 sm:px-8 [&::-webkit-scrollbar]:hidden"
          >
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>

          <div className="mx-auto mt-6 flex max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
            <p className="font-subtitle text-sm tabular-nums text-muted-dark">
              <span className="font-semibold text-onyx">{String(index + 1).padStart(2, '0')}</span> /{' '}
              {String(total).padStart(2, '0')}
            </p>
            {total > 1 && (
              <div className="flex gap-2">
                {([-1, 1] as const).map((direction) => (
                  <button
                    key={direction}
                    type="button"
                    aria-label={direction < 0 ? 'Testemunho anterior' : 'Testemunho seguinte'}
                    onClick={() => step(direction)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-onyx/20 text-2xl text-onyx transition-colors hover:border-onyx/60"
                  >
                    <i className={direction < 0 ? 'bx bx-chevron-left' : 'bx bx-chevron-right'} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-12 flex justify-center">
            <MotionButton label="Deixar o meu testemunho" variant="secondary" onClick={leaveOne} />
          </div>
        </>
      )}
    </section>
  )
}
