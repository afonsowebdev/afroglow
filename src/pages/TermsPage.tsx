import { LegalLayout, LegalSection as Section } from '@/components/layout/LegalLayout'
import { siteConfig } from '@/lib/site-config'

// NOTE: plain-language draft that matches how the booking system works. It should be reviewed by the
// business owner (and ideally a lawyer) before launch.
const LAST_UPDATED = '4 de outubro de 2026'

export default function TermsPage() {
  return (
    <LegalLayout title="Termos e condições" updated={LAST_UPDATED}>
      <p className="mt-8 font-subtitle text-[15px] leading-relaxed text-muted-dark">
        Estes termos aplicam-se ao uso do site afroglow.pt e da app {siteConfig.name} para pedir marcações. Ao criar uma
        conta ou fazer um pedido, aceitas estas condições.
      </p>

      <Section title="O serviço">
        <p>
          O site e a app permitem ver os serviços da {siteConfig.name}, pedir marcações e gerir a tua conta. Os serviços
          de tranças são prestados presencialmente, na data e hora combinadas.
        </p>
      </Section>

      <Section title="A tua conta">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Tens de indicar dados verdadeiros (nome, email e telemóvel) e manter a tua password em segredo.</li>
          <li>Confirmamos o teu email com um código antes de a conta ficar ativa.</li>
          <li>Podes alterar os teus dados ou eliminar a conta quando quiseres, no teu perfil.</li>
        </ul>
      </Section>

      <Section title="Marcações">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Um pedido de marcação <strong className="text-onyx">não é uma confirmação</strong>: fica pendente até a{" "}
            {siteConfig.name} o aceitar. Se for aceite, recebes um email; se não for possível, também.
          </li>
          <li>
            Podes reagendar ou cancelar a tua marcação na tua conta. Pedimos que o faças com a maior antecedência
            possível, para podermos oferecer o horário a outra pessoa.
          </li>
          {siteConfig.cancellationPolicy && <li>{siteConfig.cancellationPolicy}</li>}
          <li>A duração e o preço de cada modelo são os indicados no momento do pedido.</li>
        </ul>
      </Section>

      <Section title="Testemunhos">
        <p>
          Se escreveres um testemunho, aceitas que seja publicado no site com o teu nome depois de aprovado. Podemos
          recusar ou retirar testemunhos que sejam ofensivos ou que não sejam verdadeiros.
        </p>
      </Section>

      <Section title="Uso correto">
        <p>
          Não podes usar o serviço para fazer pedidos falsos ou repetidos, nem tentar aceder a contas ou dados de outras
          pessoas. Podemos suspender contas que o façam.
        </p>
      </Section>

      <Section title="Conteúdos">
        <p>
          Os textos, imagens, vídeos e o nome {siteConfig.name} pertencem ao negócio e não podem ser copiados ou usados
          sem autorização.
        </p>
      </Section>

      <Section title="Privacidade">
        <p>
          O tratamento dos teus dados está explicado na{' '}
          <a href="/privacidade" className="text-gold-deep underline">
            política de privacidade
          </a>
          .
        </p>
      </Section>

      <Section title="Reclamações e lei aplicável">
        <p>
          Estes termos regem-se pela lei portuguesa. Podes apresentar reclamações no{' '}
          <a
            href="https://www.livroreclamacoes.pt/"
            target="_blank"
            rel="noreferrer"
            className="text-gold-deep underline"
          >
            Livro de Reclamações Eletrónico
          </a>{' '}
          ou contactar-nos em{' '}
          <a href={`mailto:${siteConfig.email}`} className="text-gold-deep underline">
            {siteConfig.email}
          </a>
          .
        </p>
      </Section>

      <Section title="Alterações">
        <p>
          Podemos atualizar estes termos. A versão em vigor é sempre a desta página, com a data de atualização no topo.
        </p>
      </Section>
    </LegalLayout>
  )
}
