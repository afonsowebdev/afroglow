import { Link } from 'react-router-dom'
import { MotionButton } from '@/components/ui/motion-button'
import { BrandLogo } from '@/components/ui/brand-logo'

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-5 text-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center whitespace-nowrap font-logo text-[20vw] leading-none tracking-tight text-onyx/5"
      >
        AFROGLOW
      </span>
      <div className="relative">
        <Link to="/" aria-label="AFROGLOW, voltar ao início" className="inline-flex">
          <BrandLogo size="lg" />
        </Link>
        <h1 className="mt-8 font-logo text-5xl text-onyx sm:text-6xl">404</h1>
        <p className="mt-4 font-subtitle text-lg font-light text-muted-dark">Esta página não existe.</p>
        <div className="mt-8 flex justify-center">
          <MotionButton label="Voltar ao início" href="/" size="sm" />
        </div>
      </div>
    </div>
  )
}
