/** True inside the customer iPhone app (built with `--mode customer`); false on the website and in the admin app. */
export const isCustomerApp = import.meta.env.MODE === 'customer'

/** Border of text fields: firm 1.5 pt in the customer app, the brand's thin gold line elsewhere. */
export const fieldBorder = isCustomerApp
  ? 'border-2 border-onyx/30 focus-visible:border-onyx'
  : 'border border-gold/30 focus-visible:border-gold-deep'

/** Where booking lives: its own tab in the customer app, /agendar on the website. */
export const bookPath = isCustomerApp ? '/marcar' : '/agendar'
