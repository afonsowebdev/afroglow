import { MotionButton } from '@/components/ui/motion-button'
import { StackSpreadStage, type StackSpreadImage } from '@/components/ui/stack-spread'

const images: StackSpreadImage[] = [
  { alt: 'Cliente com box braids douradas' },
  { alt: 'Detalhe de knotless braids' },
  { alt: 'Retrato com tranças fulani' },
  { alt: 'Cornrows com padrão geométrico' },
  { alt: 'Cliente sorrindo com goddess braids' },
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
        eyebrow="AfroGlow · Portugal"
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
