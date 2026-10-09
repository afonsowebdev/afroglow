import { useEffect, useState } from 'react'
import { ActionButton } from '@/components/ui/action-button'
import { MotionButton } from '@/components/ui/motion-button'
import { api, ApiError } from '@/lib/api'
import { fieldBorder, isCustomerApp } from '@/lib/app-mode'

export function TestimonialForm() {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [hasPhoto, setHasPhoto] = useState(false)
  const [showPhoto, setShowPhoto] = useState(true)

  // Offer to show the profile photo only when there is one.
  useEffect(() => {
    api
      .get<{ dataUrl: string | null }>('/account/avatar')
      .then((data) => setHasPhoto(!!data.dataUrl))
      .catch(() => {})
  }, [])

  async function handleSubmit() {
    if (content.trim().length < 10 || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/account/testimonials', { content: content.trim(), showPhoto: hasPhoto && showPhoto })
      setSent(true)
      setContent('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <p className="font-subtitle text-sm text-muted-dark">
        Obrigado! O teu testemunho foi enviado e vai aparecer na página assim que for revisto.
      </p>
    )
  }

  return (
    // Not a <form>: in the app this sits inside the sheet's own form, and a form inside a form is submitted by the
    // browser itself (a page reload) instead of reaching our handler.
    <div className="flex flex-col gap-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        maxLength={600}
        placeholder="Conta-nos como foi a tua experiência..."
        className={`rounded-xl ${fieldBorder} bg-white px-4 py-3 font-subtitle text-onyx outline-none transition-colors duration-300`}
      />
      {hasPhoto ? (
        <label className="flex items-start gap-3 font-subtitle text-sm text-onyx">
          <input
            type="checkbox"
            checked={showPhoto}
            onChange={(e) => setShowPhoto(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[#c9a84c]"
          />
          <span>
            Mostrar a minha foto de perfil junto ao testemunho
            <span className="block text-xs text-muted-dark">
              Só aparece depois de aprovado. Podes retirá-la quando quiseres.
            </span>
          </span>
        </label>
      ) : (
        <p className="font-subtitle text-xs text-muted-dark">
          Queres que a tua foto apareça no testemunho? Adiciona-a primeiro ao teu perfil.
        </p>
      )}
      {error && <p className="font-subtitle text-sm text-red-700">{error}</p>}
      <div>
        {isCustomerApp ? (
          <ActionButton
            label={submitting ? 'A enviar...' : 'Enviar testemunho'}
            disabled={content.trim().length < 10 || submitting}
            onClick={() => void handleSubmit()}
          />
        ) : (
          <MotionButton
            label={submitting ? 'A enviar...' : 'Enviar testemunho'}
            size="sm"
            type="button"
            disabled={content.trim().length < 10 || submitting}
            onClick={() => void handleSubmit()}
          />
        )}
      </div>
    </div>
  )
}
