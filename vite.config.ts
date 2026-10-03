import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import sitemap from 'vite-plugin-sitemap'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    sitemap({
      hostname: 'https://afroglow.pt',
      // The SPA only ever builds one index.html, so the plugin can't
      // discover client-side routes on its own — public ones are added
      // here; private/account/admin routes are excluded from both the
      // sitemap and robots.txt so they're never offered for indexing.
      dynamicRoutes: ['/agendar'],
      exclude: ['/entrar', '/conta', '/admin', '/admin/login', '/ceo'],
      changefreq: 'weekly',
      priority: { '/': 1.0, '/agendar': 0.8 },
      robots: [{ userAgent: '*', allow: '/', disallow: ['/entrar', '/conta', '/admin', '/ceo'] }],
    }),
  ],
  resolve: {
    alias: [
      // The customer iPhone app is built from the same source but must not carry the website/admin.
      ...(mode === 'customer'
        ? [{ find: '@/site-entry', replacement: path.resolve(import.meta.dirname, './src/customer/no-site.ts') }]
        : []),
      { find: '@', replacement: path.resolve(import.meta.dirname, './src') },
    ],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
}))
