export default function About() {
  return (
    <section id="sobre" className="bg-cream px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-14 md:grid-cols-[60%_40%] md:gap-0">
        <div className="flex flex-col justify-center md:border-r md:border-gold/30 md:pr-14">
          <h2 className="font-logo text-4xl sm:text-5xl">Quem somos</h2>
          <p className="mt-8 max-w-[65ch] font-subtitle text-base font-light leading-[1.7] text-onyx/80 sm:text-lg">
            A AfroGlow nasceu da paixão por preservar e celebrar a arte das tranças afro. Cada
            penteado é feito à mão, com técnica apurada e respeito pela identidade de quem o usa.
            É uma prática que atravessa gerações e continua viva em cada fio entrançado.
          </p>
          <p className="mt-6 max-w-[65ch] font-subtitle text-base font-light leading-[1.7] text-onyx/80 sm:text-lg">
            Trabalhamos com atenção ao detalhe, higiene rigorosa e conforto durante todo o
            processo, para que cada sessão seja também um momento de cuidado.
          </p>
          <p className="mt-10 font-display text-2xl italic text-gold-deep">Desde 2020</p>
        </div>

        <div className="group relative aspect-[4/5] overflow-hidden rounded-sm md:pl-14">
          <div
            className="flex h-full w-full items-center justify-center bg-muted/30"
            role="img"
            aria-label="Trabalho de tranças afro realizado pela AfroGlow"
          >
            <i className="bx bx-image text-4xl text-onyx/30" aria-hidden="true" />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gold/0 transition-colors duration-300 group-hover:bg-gold/20" />
        </div>
      </div>
    </section>
  )
}
