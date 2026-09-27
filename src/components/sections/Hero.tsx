import { MotionButton } from '@/components/ui/motion-button'
import { StackSpreadStage, type StackSpreadImage } from '@/components/ui/stack-spread'

const images: StackSpreadImage[] = [
  { src: '/images/hero/hero-1.jpg', alt: 'Knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-2.jpg', alt: 'Detalhe de knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-3.jpg', alt: 'Vista lateral de knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-4.jpg', alt: 'Padrão de repartição triangular em knotless braids' },
  { src: '/images/hero/hero-5.jpg', alt: 'Detalhe do couro cabeludo com repartição triangular' },
]

export default function Hero() {
  return (
    <div id="top">
      <StackSpreadStage
        images={images}
        scrollLength={350}
        stackScale={0.82}
        cardRadius={10}
        clusterRotation
        showScrollHint
        watermark="AFROGLOW"
        eyebrow="AFROGLOW · Portugal"
        headline={
          <>
            Arte que parte
            <br />
            do teu cabelo.
          </>
        }
        subtitle="Tranças afro feitas com cuidado, técnica e identidade."
      >
        <MotionButton label="Ver Serviços" href="#servicos" />
      </StackSpreadStage>
    </div>
  )
}
