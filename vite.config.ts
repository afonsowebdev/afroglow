import { execSync } from 'node:child_process'
import path from 'node:path'
import pkg from './package.json' with { type: 'json' }
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import sitemap from 'vite-plugin-sitemap'
import type { Plugin } from 'vite'

// Starts the app's script after the browser has painted the static first screen from index.html,
// instead of before it, so visitors see the page while the JavaScript is still starting up.
function startAppAfterFirstPaint(): Plugin {
  return {
    name: 'start-app-after-first-paint',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const entry = html.match(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/)
        if (!entry) return html
        const loader =
          `<script>requestAnimationFrame(function(){requestAnimationFrame(function(){` +
          `var s=document.createElement('script');s.type='module';s.src='${entry[1]}';document.head.appendChild(s)})})</script>`
        return html.replace(entry[0], loader)
      },
    },
  }
}

const git = (command: string, fallback: string) => {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return fallback
  }
}

export default defineConfig(({ mode }) => ({
  define: {
    // Shown in the app's Settings: marketing version + build number (commits so far) + short commit.
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD__: JSON.stringify(git('git rev-list --count HEAD', '0')),
    __APP_COMMIT__: JSON.stringify(git('git rev-parse --short HEAD', 'dev')),
  },
  plugins: [
    react(),
    ...(mode === 'customer' ? [] : [startAppAfterFirstPaint()]),
    tailwindcss(),
    sitemap({
      hostname: 'https://afroglow.pt',
      // The SPA only ever builds one index.html, so the plugin can't
      // discover client-side routes on its own — public ones are added
      // here; private/account/admin routes are excluded from both the
      // sitemap and robots.txt so they're never offered for indexing.
      dynamicRoutes: ['/agendar', '/privacidade', '/termos'],
      exclude: ['/entrar', '/conta', '/admin', '/admin/login', '/ceo'],
      changefreq: 'weekly',
      priority: { '/': 1.0, '/agendar': 0.8, '/privacidade': 0.3, '/termos': 0.3 },
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
