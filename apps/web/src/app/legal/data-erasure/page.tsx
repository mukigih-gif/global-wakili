import Link from 'next/link';
import { Scale, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Data Erasure Request — Global Wakili Legal Enterprise',
};

export default function DataErasurePage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary-600 flex items-center justify-center">
              <Scale className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Global Wakili</span>
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500">Data Erasure Request</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Erasure Request</h1>
            <p className="text-sm text-gray-500">Right to Erasure — Kenya Data Protection Act 2019 · GDPR Article 17</p>
          </div>
        </div>

        <div className="prose prose-gray prose-sm mb-8">
          <p>
            Under the <strong>Kenya Data Protection Act 2019 (Section 26)</strong> and the <strong>EU General Data
            Protection Regulation (Article 17)</strong>, you have the right to request erasure of your personal data
            held by Global Wakili Limited where:
          </p>
          <ul>
            <li>The data is no longer necessary for the purpose it was collected</li>
            <li>You withdraw consent and there is no other legal basis for processing</li>
            <li>You object to processing and there are no overriding legitimate grounds</li>
            <li>The data has been unlawfully processed</li>
            <li>Erasure is required to comply with a legal obligation</li>
          </ul>
          <p>
            <strong>Note:</strong> We may be required to retain certain data for legal, regulatory, or contractual
            obligations (e.g., Law Society of Kenya requirements, KRA compliance, court orders). We will inform
            you of any limitations on erasure.
          </p>
        </div>

        {/* Request form */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Submit Erasure Request</h2>
          <form
            action="mailto:privacy@globalwakili.co.ke"
            method="get"
            encType="text/plain"
            className="space-y-4"
          >
            <div>
              <label className="form-label">Full Name *</label>
              <input type="text" name="name" required className="form-input w-full" placeholder="As registered on the platform" />
            </div>
            <div>
              <label className="form-label">Email Address *</label>
              <input type="email" name="email" required className="form-input w-full" placeholder="Email used on the platform" />
            </div>
            <div>
              <label className="form-label">Account / Firm ID (if known)</label>
              <input type="text" name="firmId" className="form-input w-full" placeholder="e.g. your-firm-slug" />
            </div>
            <div>
              <label className="form-label">Reason for Erasure Request *</label>
              <textarea name="reason" required rows={4} className="form-input w-full resize-none" placeholder="Briefly describe the basis for your erasure request…" />
            </div>
            <div>
              <label className="form-label">Data Categories to Erase</label>
              <div className="space-y-2 mt-1">
                {['All personal data', 'Account & profile data', 'Activity logs', 'Documents', 'Communications', 'Billing data'].map((cat) => (
                  <label key={cat} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" name="categories" value={cat} className="rounded border-gray-300 text-primary-600" />
                    {cat}
                  </label>
                ))}
              </div>
            </div>
            <div className="pt-2">
              <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" required className="rounded border-gray-300 text-primary-600 mt-0.5 flex-shrink-0" />
                <span>
                  I confirm that I am the data subject or an authorised representative, and I understand
                  that erasure of certain data may result in loss of access to services and cannot be undone.
                </span>
              </label>
            </div>
            <button
              type="submit"
              className="h-10 px-6 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
            >
              Submit Erasure Request
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-400">
            We will acknowledge your request within <strong>3 business days</strong> and complete erasure or
            provide reasons for retention within <strong>30 days</strong> as required by the Kenya Data Protection Act 2019.
            Contact our Data Protection Officer at{' '}
            <a href="mailto:dpo@globalwakili.co.ke" className="text-primary-600 hover:underline">dpo@globalwakili.co.ke</a>.
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Global Wakili Limited ·{' '}
        <Link href="/legal/privacy" className="hover:text-gray-600">Privacy Policy</Link> ·{' '}
        <Link href="/legal/terms" className="hover:text-gray-600">Terms</Link>
      </footer>
    </div>
  );
}
