import { lazy, Suspense, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import Hero from '@/components/sections/Hero'
import StructuredData from '@/components/sections/StructuredData'

// Only the navbar and hero are in the first download; the rest loads right after the first
// paint, so the page becomes visible sooner on slow phones.
const loaders = {
  about: () => import('@/components/sections/About'),
  services: () => import('@/components/sections/Services'),
  howItWorks: () => import('@/components/sections/HowItWorks'),
  gallery: () => import('@/components/sections/Gallery'),
  testimonials: () => import('@/components/sections/Testimonials'),
  faq: () => import('@/components/sections/Faq'),
  location: () => import('@/components/sections/Location'),
  contact: () => import('@/components/sections/Contact'),
  footer: () => import('@/components/layout/Footer'),
}

const About = lazy(loaders.about)
const Services = lazy(loaders.services)
const HowItWorks = lazy(loaders.howItWorks)
const Gallery = lazy(loaders.gallery)
const Testimonials = lazy(loaders.testimonials)
const Faq = lazy(loaders.faq)
const Location = lazy(loaders.location)
const Contact = lazy(loaders.contact)
const Footer = lazy(loaders.footer)

export default function LandingPage() {
  useEffect(() => {
    // Start fetching every section as soon as the browser is idle, so scrolling and menu
    // links never wait on a download.
    const load = () => Object.values(loaders).forEach((loader) => void loader())
    const timer = window.setTimeout(load, 200)
    return () => window.clearTimeout(timer)
  }, [])

  // Arriving from another page's menu (e.g. /#servicos): scroll to that section as soon as it has loaded.
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id) return
    const go = () => {
      const el = document.getElementById(id)
      if (!el) return false
      el.scrollIntoView()
      return true
    }
    if (go()) return
    const observer = new MutationObserver(() => go() && observer.disconnect())
    observer.observe(document.body, { childList: true, subtree: true })
    const stop = window.setTimeout(() => observer.disconnect(), 8000)
    return () => {
      observer.disconnect()
      window.clearTimeout(stop)
    }
  }, [])

  return (
    <>
      <Navbar />
      <StructuredData />
      <main>
        <Hero />
        <Suspense fallback={<div className="min-h-screen" aria-hidden="true" />}>
          <About />
          <Services />
          <HowItWorks />
          <Gallery />
          <Testimonials />
          <Faq />
          <Location />
          <Contact />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </>
  )
}
