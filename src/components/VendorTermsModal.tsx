import { X } from 'lucide-react'

interface Props {
  onAgree: () => void
  onClose: () => void
}

// Full vendor Terms & Conditions in a modal. "Agree and continue" confirms; the
// close/decline path leaves the application un-agreed (and thus unsubmittable).
export function VendorTermsModal({ onAgree, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-steel-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-steel-200 px-5 py-3 dark:border-steel-800">
          <h2 className="text-lg font-bold">Vendor Terms &amp; Conditions</h2>
          <button onClick={onClose} className="btn-ghost !px-2" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4 text-sm text-steel-600 dark:text-steel-300">
          <p>
            These terms govern your registration and activity as a vendor on DG Expert. By agreeing
            you confirm you have read, understood and accept all of the following.
          </p>
          <Section n="1. Accurate information">
            All information you provide — business name, contact details, PAN, GST, MSME registration
            and supporting documents — must be true, accurate and current. Submitting false, forged or
            misleading documents will result in immediate rejection or suspension of your account.
          </Section>
          <Section n="2. Verification & approval">
            Your application is reviewed and verified by a DG Expert administrator. Approval is at our
            sole discretion and may be withheld or revoked at any time. You may not list services until
            your application is approved.
          </Section>
          <Section n="3. Services & conduct">
            You are solely responsible for the services you list, the accuracy of pricing and
            descriptions, and the quality and legality of the work you deliver. You agree to communicate
            professionally with customers and honour commitments made through the platform.
          </Section>
          <Section n="4. Compliance">
            You agree to comply with all applicable laws, taxes, licensing and safety regulations,
            including manufacturer service standards. DG Expert is a listing and communication platform
            and is not a party to any contract between you and a customer.
          </Section>
          <Section n="5. Data & documents">
            Documents you upload (PAN, GST, MSME certificates) are used only for verification and are
            accessible to DG Expert administrators. You confirm you are authorised to share them.
          </Section>
          <Section n="6. Suspension & termination">
            DG Expert may suspend or remove your vendor account for breach of these terms, fraudulent
            activity, repeated customer complaints, or any conduct that harms the platform or its users.
          </Section>
          <p className="rounded-lg bg-safety-500/10 px-3 py-2 text-xs text-safety-700 dark:text-safety-300">
            Work on electrical, fuel, mechanical and high-voltage generator systems must be performed by
            appropriately qualified personnel following the OEM&apos;s official procedures.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-steel-200 px-5 py-3 dark:border-steel-800">
          <button onClick={onClose} className="btn-ghost text-red-600">I don&apos;t agree</button>
          <button onClick={onAgree} className="btn-primary">Agree and continue</button>
        </div>
      </div>
    </div>
  )
}

function Section({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-steel-800 dark:text-steel-100">{n}</p>
      <p className="mt-1">{children}</p>
    </div>
  )
}
