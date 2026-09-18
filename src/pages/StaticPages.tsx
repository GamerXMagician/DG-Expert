import { Link } from 'react-router-dom'
import { Logo, SafetyNote } from '@/components/ui'
import { Footer } from './LandingPage'

function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-steel-200 dark:border-steel-800">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Logo />
          <Link to="/" className="btn-ghost">Home</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">{title}</h1>
        <div className="prose-dg mt-6 space-y-4 text-steel-600 dark:text-steel-300">{children}</div>
      </main>
      <Footer />
    </div>
  )
}

export function AboutPage() {
  return (
    <PageShell title="About DG Expert">
      <p>
        DG Expert is an AI-powered technical knowledge platform for diesel generator professionals,
        technicians, engineers, maintenance teams and learners. It combines structured technical
        knowledge with an AI assistant to help you understand, maintain and troubleshoot diesel
        generators.
      </p>
      <p>
        The platform supports multiple OEMs (Cummins, Caterpillar, Perkins, Kirloskar, Volvo Penta,
        MTU, Kohler, Mahindra Powerol, Ashok Leyland, Greaves and more) and clearly identifies
        OEM-specific information where it applies.
      </p>
      <p className="text-sm">Contact: prasadtenesh@gmail.com</p>
    </PageShell>
  )
}

export function PricingPage() {
  return (
    <PageShell title="Pricing">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="text-lg font-bold">Free</h3>
          <p className="text-sm text-steel-500">Basic limited access</p>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
            <li>5 AI questions per day</li>
            <li>Limited troubleshooting and OEM info</li>
            <li>Basic generator knowledge</li>
          </ul>
        </div>
        <div className="card border-brand-500 p-6 ring-1 ring-brand-500">
          <h3 className="text-lg font-bold">Unlimited</h3>
          <p className="text-sm text-steel-500">Full DG Expert access</p>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
            <li>Unlimited AI questions</li>
            <li>Full troubleshooting and OEM knowledge</li>
            <li>Unlimited saved questions and history</li>
            <li>Priority features</li>
          </ul>
        </div>
      </div>
      <p className="mt-6 text-sm">
        Payment integration (Stripe / Razorpay) can be added later. For now, subscription status is
        managed by administrators for testing.
      </p>
      <Link to="/signup" className="btn-primary mt-4">Get started free</Link>
    </PageShell>
  )
}

export function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy">
      <p>
        DG Expert stores the account information you provide (name, email, phone) and your activity
        (questions, saved items, technical requests) to operate the service. Your private data is
        protected by database access controls (Row Level Security) so other users cannot read it.
      </p>
      <p>We do not sell your personal data. Authentication is handled securely by Supabase Auth.</p>
    </PageShell>
  )
}

export function TermsPage() {
  return (
    <PageShell title="Terms of Service">
      <p>
        By using DG Expert you agree to use the technical information responsibly and to follow all
        applicable safety procedures and regulations. DG Expert is an assistance tool and does not
        replace OEM service manuals or the judgment of qualified personnel.
      </p>
      <SafetyNote>
        Always defer to the generator manufacturer&apos;s official documentation and use qualified
        technicians for any hands-on work.
      </SafetyNote>
    </PageShell>
  )
}

export function VendorTermsPage() {
  return (
    <PageShell title="Vendor Terms & Conditions">
      <p>
        These terms govern your registration and activity as a vendor on DG Expert. By submitting a
        vendor application you confirm that you have read, understood and agree to all of the
        following.
      </p>

      <h2 className="text-lg font-bold text-steel-800 dark:text-steel-100">1. Accurate information</h2>
      <p>
        All information you provide — including business name, contact details, PAN, GST, MSME
        registration and supporting documents — must be true, accurate and current. Submitting
        false, forged or misleading documents will result in immediate rejection or suspension of
        your vendor account.
      </p>

      <h2 className="text-lg font-bold text-steel-800 dark:text-steel-100">2. Verification &amp; approval</h2>
      <p>
        Your application is subject to review and verification by a DG Expert administrator.
        Approval is at our sole discretion and may be withheld or revoked at any time. You may not
        list services until your application is approved.
      </p>

      <h2 className="text-lg font-bold text-steel-800 dark:text-steel-100">3. Services &amp; conduct</h2>
      <p>
        You are solely responsible for the services you list, the accuracy of pricing and
        descriptions, and the quality and legality of the work you deliver. You agree to communicate
        professionally with customers and to honour commitments made through the platform.
      </p>

      <h2 className="text-lg font-bold text-steel-800 dark:text-steel-100">4. Compliance</h2>
      <p>
        You agree to comply with all applicable laws, taxes, licensing and safety regulations,
        including manufacturer service standards. DG Expert is a listing and communication platform
        and is not a party to any contract between you and a customer.
      </p>

      <h2 className="text-lg font-bold text-steel-800 dark:text-steel-100">5. Data &amp; documents</h2>
      <p>
        Documents you upload (PAN, GST, MSME certificates) are used only for verification and are
        accessible to DG Expert administrators. You confirm you are authorised to share them.
      </p>

      <h2 className="text-lg font-bold text-steel-800 dark:text-steel-100">6. Suspension &amp; termination</h2>
      <p>
        DG Expert may suspend or remove your vendor account for breach of these terms, fraudulent
        activity, repeated customer complaints, or any conduct that harms the platform or its users.
      </p>

      <SafetyNote>
        Work on electrical, fuel, mechanical and high-voltage generator systems must be performed by
        appropriately qualified personnel following the OEM&apos;s official procedures.
      </SafetyNote>
    </PageShell>
  )
}

export function DisclaimerPage() {
  return (
    <PageShell title="Disclaimer">
      <SafetyNote>
        DG Expert provides technical information for educational and troubleshooting assistance.
        Always follow the generator manufacturer&apos;s official service manual, safety procedures
        and applicable regulations. Work on electrical, fuel, mechanical and high-voltage systems
        should be performed by appropriately qualified personnel.
      </SafetyNote>
      <p>
        DG Expert does not guarantee the accuracy or completeness of any information and does not
        accept liability for actions taken based on it. It is not a substitute for OEM service
        manuals or a qualified technician.
      </p>
    </PageShell>
  )
}

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center p-4 text-center">
      <div>
        <p className="text-6xl font-bold text-brand-600">404</p>
        <p className="mt-2 text-steel-500">This page could not be found.</p>
        <Link to="/" className="btn-primary mt-6">Go home</Link>
      </div>
    </div>
  )
}
