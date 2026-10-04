import { LegalLayout, LegalSection as Section } from '@/components/layout/LegalLayout'
import { siteConfig } from '@/lib/site-config'

// NOTE: this is a plain-language draft that matches what the system actually does. It should be
// reviewed by the business owner (and ideally a lawyer) before the app is published.
const CONTACT_EMAIL = 'geral@afroglow.pt'
const LAST_UPDATED = '4 de outubro de 2026'

export default function PrivacyPage() {
  return (
    <LegalLayout title="Política de privacidade" updated={LAST_UPDATED}>
      <p className="mt-8 font-subtitle text-[15px] leading-relaxed text-muted-dark">
        Esta política explica que dados pessoais a {siteConfig.name} recolhe através do site afroglow.pt e da app{' '}
        {siteConfig.name}, para que os usamos e quais são os teus direitos.
      </p>

      <Section title="Quem é o responsável">
        <p>
          O responsável pelo tratamento dos dados é a {siteConfig.name} ({siteConfig.location}). Podes falar connosco
          por email em{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-ink underline">
            {CONTACT_EMAIL}
          </a>
          , ou pelo Instagram @{siteConfig.instagramHandle}.
        </p>
      </Section>

      <Section title="Que dados recolhemos">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-onyx">Dados da conta:</strong> nome, email, telemóvel e password (guardada apenas de
            forma cifrada, nunca em texto legível).
          </li>
          <li>
            <strong className="text-onyx">Marcações:</strong> serviço escolhido, data e hora, estado do pedido e as
            notas que escreveres.
          </li>
          <li>
            <strong className="text-onyx">Testemunhos:</strong> o texto que escreveres, que só aparece no site depois de
            aprovado e com o teu nome.
          </li>
          <li>
            <strong className="text-onyx">Dados técnicos:</strong> registos de funcionamento do servidor, necessários
            para segurança e para corrigir erros.
          </li>
        </ul>
        <p>Não recolhemos a tua localização, contactos, fotografias nem dados de pagamento.</p>
      </Section>

      <Section title="Para que usamos os dados">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Criar e gerir a tua conta e as tuas marcações.</li>
          <li>
            Enviar-te emails sobre o teu pedido: código de verificação, confirmação, resposta e lembrete da sessão.
          </li>
          <li>Avisar a equipa quando entra um novo pedido.</li>
          <li>Publicar o teu testemunho, se o escreveres e for aprovado.</li>
          <li>Manter o serviço seguro e evitar abusos.</li>
        </ul>
        <p>
          Não vendemos os teus dados nem os usamos para publicidade de terceiros. Só te enviamos comunicações
          relacionadas com o serviço.
        </p>
      </Section>

      <Section title="Com quem partilhamos">
        <p>Usamos prestadores de serviços que tratam dados em nosso nome, apenas para o funcionamento do serviço:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>alojamento do site e do servidor (Vercel e Render);</li>
          <li>base de dados (Neon);</li>
          <li>envio de emails (Resend);</li>
          <li>notificações no iPhone (Apple), quando as ativares.</li>
        </ul>
      </Section>

      <Section title="Durante quanto tempo guardamos">
        <p>
          Guardamos os teus dados enquanto tiveres conta. Se eliminares a conta, removemos o teu nome, telemóvel, notas
          e testemunhos, e os teus dados de acesso deixam de funcionar. As marcações passadas ficam apenas como registo
          sem identificação pessoal, para a contabilidade e estatísticas do negócio.
        </p>
      </Section>

      <Section title="Os teus direitos">
        <p>Nos termos do RGPD, tens direito a:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>aceder aos teus dados e corrigi-los (podes alterar o nome e o telemóvel no teu perfil);</li>
          <li>eliminar a tua conta e os teus dados (no perfil, em “Eliminar conta”);</li>
          <li>pedir uma cópia dos teus dados, opor-te ao tratamento ou limitá-lo;</li>
          <li>
            apresentar reclamação à Comissão Nacional de Proteção de Dados (cnpd.pt), se entenderes que os teus direitos
            não foram respeitados.
          </li>
        </ul>
        <p>
          Para qualquer pedido, escreve para{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-ink underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section title="Crianças">
        <p>O serviço não se destina a menores de 16 anos, e não recolhemos dados de menores de forma intencional.</p>
      </Section>

      <Section title="Alterações a esta política">
        <p>
          Se mudarmos a forma como tratamos os dados, atualizamos esta página e a data no topo. Em alterações
          importantes, avisamos-te na app ou por email.
        </p>
      </Section>
    </LegalLayout>
  )
}
