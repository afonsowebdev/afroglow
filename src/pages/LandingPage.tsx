import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Hero from '@/components/sections/Hero'
import About from '@/components/sections/About'
import Services from '@/components/sections/Services'
import HowItWorks from '@/components/sections/HowItWorks'
import Faq from '@/components/sections/Faq'
import Location from '@/components/sections/Location'
import Gallery from '@/components/sections/Gallery'
import Testimonials from '@/components/sections/Testimonials'
import Contact from '@/components/sections/Contact'

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Services />
        <HowItWorks />
        <Gallery />
        <Testimonials />
        <Faq />
        <Location />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
