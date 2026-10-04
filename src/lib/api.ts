const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function tokenStore(key: string) {
  // If storage is blocked (private mode), keep the token for this page session so a
  // login still works until the tab is closed.
  let memory: string | null = null
  return {
    get() {
      try {
        return localStorage.getItem(key) ?? memory
      } catch {
        return memory
      }
    },
    set(token: string | null) {
      memory = token
      try {
        if (token) localStorage.setItem(key, token)
        else localStorage.removeItem(key)
      } catch {
        // storage unavailable — the in-memory copy above still applies
      }
    },
  }
}

// Fallback for browsers that refuse to keep the cross-site session cookie.
export const customerToken = tokenStore('afroglow-customer-token')
export const adminToken = tokenStore('afroglow-admin-token')

const ADMIN_AUTH_PATHS = ['/auth/login', '/auth/me', '/auth/logout']

function tokenFor(path: string) {
  const isAdmin = path.startsWith('/admin') || ADMIN_AUTH_PATHS.includes(path)
  return (isAdmin ? adminToken : customerToken).get()
}

// The API runs on a host that sleeps when idle; the first request after a
// pause can take ~30s. Pinging it as soon as the site opens wakes it up while
// the visitor is still reading, so login/booking don't hit the cold start.
export function warmUpApi() {
  void fetch(`${API_URL}/health`).catch(() => {})
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenFor(path)
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    let message = `Erro ${res.status}`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // response had no JSON body
    }
    throw new ApiError(message, res.status)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
}
