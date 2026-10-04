/** True inside the customer iPhone app (built with `--mode customer`); false on the website and in the admin app. */
export const isCustomerApp = import.meta.env.MODE === 'customer'
