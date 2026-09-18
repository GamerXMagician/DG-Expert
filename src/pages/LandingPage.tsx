import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Wrench,
  Stethoscope,
  Factory,
  MessageSquare,
  ClipboardList,
  ArrowRight,
  Search,
  Brain,
  CheckCircle2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Logo, SafetyNote } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'

const features = [
  { icon: BookOpen, title: 'Generator Fundamentals', desc: 'Working principles, components and systems explained clearly.' },
  { icon: Wrench, title: 'Preventive Maintenance', desc: 'Structured schedules and service guidance by hours run.' },
  { icon: Stethoscope, title: 'Troubleshooting', desc: 'Guided fault diagnosis: causes → checks → corrective actions.' },
  { icon: Factory, title: 'OEM-Specific Knowledge', desc: 'Cummins, CAT, Perkins, Kirloskar, Volvo and more.' },
  { icon: MessageSquare, title: 'AI Technical Assistant', desc: 'Ask anything — get structured, safety-first answers.' },
  { icon: ClipboardList, title: 'Maintenance Guides', desc: 'Practical procedures grounded in OEM best practice.' },
]

const steps = [
  { icon: MessageSquare, label: 'ASK', desc: 'Describe the symptom or ask a question.' },
  { icon: Search, label: 'ANALYZE', desc: 'DG Expert searches its technical knowledge.' },
  { icon: Brain, label: 'DIAGNOSE', desc: 'Likely causes and diagnostic checks identified.' },
  { icon: CheckCircle2, label: 'SOLVE', desc: 'Corrective actions with safety guidance.' },
]

const slides = [
  { src: '/slide1.png', title: 'Industrial-grade power', desc: 'Modern diesel generators built for reliability.' },
  { src: '/slide2.png', title: 'Expert maintenance', desc: 'Technician-led servicing and inspections.' },
  { src: '/slide3.png', title: 'Fleet-scale monitoring', desc: 'Keep every unit running at peak health.' },
  { src: '/slide4.png', title: 'Live diagnostics', desc: 'Read the panel, diagnose faults, act fast.' },
]

function HeroCarousel() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 4000)
    return () => clearInterval(t)
  }, [paused])

  const go = (n: number) => setI((n + slides.length) % slides.length)

  return (
    <section className="bg-steel-950 py-14">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-3xl font-bold text-white">See DG Expert in the field</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-steel-300">
          Real diesel generators, servicing and diagnostics.
        </p>

        <div
          className="relative mt-8 overflow-hidden rounded-2xl border border-steel-800 shadow-2xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Slides */}
          <div className="relative aspect-video w-full bg-black">
            {slides.map((s, idx) => (
              <div
                key={s.src}
                className={`absolute inset-0 transition-opacity duration-700 ${idx === i ? 'opacity-100' : 'opacity-0'}`}
                aria-hidden={idx !== i}
              >
                <img src={s.src} alt={s.title} className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-steel-950/90 to-transparent p-6 pt-16">
                  <h3 className="text-xl font-bold text-white">{s.title}</h3>
                  <p className="text-sm text-steel-300">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Arrows */}
          <button
            onClick={() => go(i - 1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-steel-950/60 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-brand-600"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => go(i + 1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-steel-950/60 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-brand-600"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dots */}
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
            {slides.map((s, idx) => (
              <button
                key={s.src}
                onClick={() => setI(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${idx === i ? 'w-6 bg-brand-500' : 'w-2 bg-white/50 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function LandingPage() {
  const { session } = useAuth()

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-steel-200 bg-white/90 backdrop-blur dark:border-steel-800 dark:bg-steel-950/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-steel-600 dark:text-steel-300 md:flex">
            <a href="#features" className="hover:text-brand-600">Features</a>
            <a href="#how" className="hover:text-brand-600">How it works</a>
            <a href="#pricing" className="hover:text-brand-600">Pricing</a>
            <Link to="/about" className="hover:text-brand-600">About</Link>
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <Link to="/dashboard" className="btn-primary">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">Login</Link>
                <Link to="/signup" className="btn-primary">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background video 1 */}
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/hero.mp4"
          autoPlay
          muted
          loop
          playsInline
          poster="/logo.png"
          aria-hidden="true"
        />
        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-steel-950/80 via-steel-950/70 to-steel-950/90" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center lg:py-28">
          <span className="badge mx-auto mb-6 bg-brand-500/20 text-brand-200 ring-1 ring-brand-400/30">
            <ShieldCheck className="h-3.5 w-3.5" /> Engineering-grade technical knowledge
          </span>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
            DG <span className="text-brand-400">Expert</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg font-medium text-steel-100">
            Your Intelligent Diesel Generator Knowledge &amp; Troubleshooting Assistant
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-steel-300">
            Understand, maintain and troubleshoot diesel generators with structured technical
            knowledge and AI-powered assistance.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to={session ? '/dashboard' : '/signup'} className="btn-primary">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to={session ? '/knowledge' : '/login'} className="btn-secondary">
              Explore DG Knowledge
            </Link>
            {!session && (
              <Link to="/login" className="btn-ghost text-white hover:bg-white/10">Login</Link>
            )}
          </div>
        </div>
      </section>

      {/* Image carousel */}
      <HeroCarousel />

      {/* Features — video 2 behind */}
      <section id="features" className="relative overflow-hidden">
        <video className="absolute inset-0 h-full w-full object-cover" src="/hero2.mp4" autoPlay muted loop playsInline poster="/favicon.png" aria-hidden="true" />
        <div className="absolute inset-0 bg-steel-950/85" />
        <div className="relative mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold text-white">Everything a DG professional needs</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-steel-300">
            Built for technicians, engineers, maintenance teams and learners.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-transform hover:-translate-y-1">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-brand-500/20 text-brand-300">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
                <p className="mt-1 text-sm text-steel-300">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — video 3 behind */}
      <section id="how" className="relative overflow-hidden">
        <video className="absolute inset-0 h-full w-full object-cover" src="/hero3.mp4" autoPlay muted loop playsInline poster="/favicon.png" aria-hidden="true" />
        <div className="absolute inset-0 bg-steel-950/85" />
        <div className="relative mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold text-white">How DG Expert works</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.label} className="relative rounded-xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white">
                  <s.icon className="h-6 w-6" />
                </div>
                <p className="mt-3 text-lg font-bold tracking-wide text-white">{s.label}</p>
                <p className="mt-1 text-sm text-steel-300">{s.desc}</p>
                {i < steps.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-steel-500 lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">DG Expert Plans</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-steel-500">
          Start free, upgrade to Unlimited for full access.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="card p-8">
            <h3 className="text-xl font-bold">Free</h3>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold">$0</span>
              <span className="text-steel-500">/month</span>
            </p>
            <p className="mt-1 text-steel-500">Basic limited access</p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                '5 AI questions / day',
                'Limited troubleshooting',
                'Limited OEM information (5)',
                'Limited knowledge base (5)',
                'Basic generator fundamentals',
              ].map((x) => (
                <li key={x} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" /> {x}</li>
              ))}
            </ul>
            <Link to="/signup" className="btn-secondary mt-6 w-full">Start free</Link>
          </div>
          <div className="card border-brand-500 p-8 ring-2 ring-brand-500">
            <span className="badge mb-2 bg-brand-600 text-white">Most popular</span>
            <h3 className="text-xl font-bold">Unlimited</h3>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold">$19</span>
              <span className="text-steel-500">/month</span>
            </p>
            <p className="mt-1 text-steel-500">Full DG Expert access</p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                'Unlimited AI questions',
                'Full troubleshooting knowledge',
                'Full OEM knowledge (all brands)',
                'Full knowledge base access',
                'Preventive maintenance guides',
                'Unlimited saved questions & history',
                'Vendor marketplace access',
                'Priority features & updates',
              ].map((x) => (
                <li key={x} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" /> {x}</li>
              ))}
            </ul>
            <Link to="/signup" className="btn-primary mt-6 w-full">Get Unlimited — $19/mo</Link>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="mx-auto max-w-4xl px-4 pb-12">
        <SafetyNote>
          DG Expert provides technical information for educational and troubleshooting assistance.
          Always follow the generator manufacturer&apos;s official service manual, safety procedures
          and applicable regulations. Work on electrical, fuel, mechanical and high-voltage systems
          should be performed by appropriately qualified personnel.
        </SafetyNote>
      </section>

      <Footer />
    </div>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-steel-200 py-10 dark:border-steel-800">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-steel-500">
          <Link to="/about" className="hover:text-brand-600">About</Link>
          <a href="/#features" className="hover:text-brand-600">Features</a>
          <Link to="/pricing" className="hover:text-brand-600">Pricing</Link>
          <Link to="/about" className="hover:text-brand-600">Contact</Link>
          <Link to="/terms" className="hover:text-brand-600">Terms</Link>
          <Link to="/privacy" className="hover:text-brand-600">Privacy</Link>
          <Link to="/disclaimer" className="hover:text-brand-600">Disclaimer</Link>
        </nav>
      </div>
      <p className="mx-auto mt-6 max-w-6xl px-4 text-xs text-steel-400">
        © {new Date().getFullYear()} DG Expert. For educational and technical assistance only.
      </p>
    </footer>
  )
}
