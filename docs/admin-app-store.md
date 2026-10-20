# App de admin (AFRO ADMIN) na App Store — distribuição não listada

A app de admin (`com.afroglow.app2`, projeto em `ios/App`) vai para a App Store como **app não listada**:
não aparece na pesquisa e só se instala pelo link direto, que se envia à proprietária.

## 1. Já preparado no projeto

- Versão **1.0.0**, build **4**.
- Só iPhone (`TARGETED_DEVICE_FAMILY = 1`): não são precisas capturas de iPad.
- `ITSAppUsesNonExemptEncryption = false`: não é preciso responder à pergunta da exportação de cifra em cada build.
- Textos da câmara e da biblioteca de fotos (usadas no portfólio, nas fotos dos serviços e no perfil do salão).
- `PrivacyInfo.xcprivacy` incluído nos recursos da app.

## 2. Antes de enviar

1. Fazer as alterações à app.
2. `npm run build:ios`, abrir `ios/App/App.xcodeproj` no Xcode, Product → Archive e enviar para o App Store Connect.
   Em cada build nova, subir o `CURRENT_PROJECT_VERSION`.
3. Criar a conta de admin para a revisão da Apple (no servidor de produção):

   ```
   cd server && npm run set-admin -- revisao@afroglow.pt '<password com 8+ caracteres>'
   ```

   Atenção: um admin vê os dados reais das clientes. Apagar ou mudar a password desta conta quando a app for aprovada.

## 3. App Store Connect

**Apps → + → Nova app**: plataforma iOS, nome `AFRO ADMIN` (ou outro livre), idioma Português (Portugal),
bundle ID `com.afroglow.app2`, SKU `afro-admin`.

| Campo | Valor |
|---|---|
| Categoria | Negócios |
| Preço | Gratuito |
| Classificação etária | responder "Não" a tudo (4+) |
| URL da política de privacidade | a mesma da app de clientes |
| URL de suporte | o site da AfrooGlow |
| Capturas | iPhone 6,9" (1320 × 2868), 3 a 10 imagens |
| Privacidade da app | Nome, email, telefone, fotos e outro conteúdo do utilizador: ligados à identidade, funcionalidade da app, sem rastreio |

**Descrição** (exemplo):

> App de gestão interna do salão AfrooGlow: marcações, agenda, clientes, serviços e preços, portfólio e estatísticas.
> Só para a equipa do salão; é preciso uma conta de administrador.

**Informações para a revisão da app → Início de sessão obrigatório**: email e password da conta do passo 2.3.

**Notas para a revisão**:

> This is an internal management app for the staff of the AfrooGlow hair salon (bookings, schedule, customers,
> services, prices, portfolio and statistics). It is not meant for the public: accounts are created by us, there is
> no sign-up in the app. Please sign in with the demo admin account provided. We will request Unlisted App
> Distribution for this app.

## 4. Pedido de distribuição não listada

Depois de criar a app no App Store Connect (antes ou logo após submeter a versão):
**developer.apple.com/contact/request/unlisted-app**

- Apple ID da app: o número em App Store Connect → Informações da app.
- Público e motivo (exemplo):

  > AFRO ADMIN is the internal management app for the AfrooGlow hair salon in Bragança, Portugal. It is used only by
  > the salon owner and staff to manage bookings, the schedule, customers, services and the portfolio. Accounts are
  > created by us and there is no public sign-up, so the app has no use for the general public and should not appear
  > in search. We will share the direct link only with the salon staff.

Quando a Apple aprovar a versão e o pedido, a app fica disponível só pelo link. Enviar o link à proprietária.

## 5. Atualizações

Como na app de clientes: build nova → nova versão (1.0.1, 1.1…) → revisão → publicação.
A app continua não listada e as atualizações chegam pela App Store.
