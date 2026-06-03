import Link from 'next/link';
import { Scale } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — Global Wakili Legal Enterprise',
};

export default function PrivacyPage() {
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
          <span className="text-sm text-gray-500">Privacy Policy</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12 prose prose-gray prose-sm">
        <h1>Privacy Policy</h1>
        <p className="text-gray-500">Effective date: 3 June 2026 | Last updated: 3 June 2026</p>

        <p>
          Global Wakili Limited ("we", "us", "our") is committed to protecting your privacy and the
          confidentiality of your data. This Privacy Policy explains how we collect, use, disclose,
          and safeguard personal data in accordance with the <strong>Kenya Data Protection Act 2019</strong>
          (KDPA), the <strong>EU General Data Protection Regulation</strong> (GDPR) where applicable,
          and other relevant legislation.
        </p>

        <h2>1. Data We Collect</h2>
        <h3>1.1 Account and Identity Data</h3>
        <ul>
          <li>Name, email address, phone number</li>
          <li>Role and permissions within your firm</li>
          <li>Authentication credentials (passwords stored as bcrypt hashes — never in plain text)</li>
          <li>National ID / KRA PIN (where provided for tax compliance)</li>
        </ul>

        <h3>1.2 Firm and Client Data</h3>
        <ul>
          <li>Law firm details: name, KRA PIN, eTIMS ID, address</li>
          <li>Client records: names, contact information, matter details</li>
          <li>Financial data: invoices, payments, trust account balances, journal entries</li>
          <li>Documents: legal documents uploaded to the platform</li>
        </ul>

        <h3>1.3 Usage Data</h3>
        <ul>
          <li>Login timestamps, IP addresses, device information</li>
          <li>Feature usage patterns (aggregated, anonymized)</li>
          <li>API request logs (retained for 90 days)</li>
        </ul>

        <h3>1.4 Integration Data</h3>
        <ul>
          <li>M-PESA transaction references (not card numbers or PINs)</li>
          <li>eTIMS submission records and KRA control numbers</li>
          <li>Calendar events (when Google/Microsoft calendar is connected)</li>
        </ul>

        <h2>2. How We Use Your Data</h2>
        <ul>
          <li><strong>Service delivery:</strong> Providing legal ERP features, processing payments, filing eTIMS returns</li>
          <li><strong>Security:</strong> Detecting and preventing unauthorized access, fraud, and data breaches</li>
          <li><strong>Compliance:</strong> Meeting our obligations under Kenyan law, KRA requirements, and Law Society rules</li>
          <li><strong>Support:</strong> Responding to support requests and troubleshooting</li>
          <li><strong>Improvement:</strong> Analyzing anonymized usage patterns to improve the Platform</li>
          <li><strong>Communications:</strong> Sending service notifications, security alerts, and billing information</li>
        </ul>

        <h2>3. Legal Basis for Processing</h2>
        <ul>
          <li><strong>Contract:</strong> Processing necessary to provide the services you have subscribed to</li>
          <li><strong>Legal obligation:</strong> Tax compliance (KRA eTIMS), Law Society of Kenya trust accounting rules</li>
          <li><strong>Legitimate interest:</strong> Security monitoring, fraud prevention, service improvement</li>
          <li><strong>Consent:</strong> Marketing communications, optional integrations (Google, Microsoft)</li>
        </ul>

        <h2>4. Data Storage and Security</h2>
        <p>
          Your data is stored in encrypted PostgreSQL databases hosted on Neon Serverless (AWS infrastructure,
          EU/US regions). Documents are stored in AWS S3 with AES-256 encryption at rest and TLS in transit.
        </p>
        <p>Security measures include:</p>
        <ul>
          <li>Application-level tenant isolation — no tenant can access another tenant's data</li>
          <li>Tamper-evident SHA-256 hash-chain audit logs</li>
          <li>JWT authentication with minimum 32-character secrets</li>
          <li>Rate limiting and IP-based protection</li>
          <li>Malware scanning on all document uploads (VirusTotal API)</li>
          <li>CORS restricted to production domain only</li>
        </ul>

        <h2>5. Data Retention</h2>
        <ul>
          <li><strong>Active account data:</strong> Retained for the duration of your subscription + 90 days post-termination</li>
          <li><strong>Financial records:</strong> 7 years minimum (Kenya Tax Act, Advocates Act requirements)</li>
          <li><strong>Audit logs:</strong> 7 years (immutable — required for regulatory compliance)</li>
          <li><strong>Documents:</strong> Per your firm's configured retention policy (default 7 years)</li>
          <li><strong>API request logs:</strong> 90 days</li>
        </ul>

        <h2>6. Data Sharing</h2>
        <p>We do not sell your data. We share data only with:</p>
        <ul>
          <li><strong>KRA (eTIMS):</strong> Invoice data required by law for tax compliance</li>
          <li><strong>Safaricom (M-PESA):</strong> Payment transaction data for processing</li>
          <li><strong>Anthropic:</strong> Document/matter data sent to Claude API for AI features (only when you explicitly use AI tools; subject to Anthropic's privacy policy)</li>
          <li><strong>Infrastructure providers:</strong> Neon (DB), AWS (storage), Redis (queuing) — under data processing agreements</li>
          <li><strong>Law Society of Kenya:</strong> If required by their audit or regulatory powers</li>
          <li><strong>Law enforcement:</strong> Only when legally compelled with appropriate court order</li>
        </ul>

        <h2>7. Your Rights (KDPA 2019)</h2>
        <p>Under the Kenya Data Protection Act 2019, you have the right to:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of your personal data</li>
          <li><strong>Correction:</strong> Correct inaccurate personal data</li>
          <li><strong>Deletion:</strong> Request deletion of personal data (subject to legal retention requirements)</li>
          <li><strong>Portability:</strong> Export your data in a standard format</li>
          <li><strong>Objection:</strong> Object to processing based on legitimate interest</li>
          <li><strong>Withdraw consent:</strong> Withdraw consent for consent-based processing at any time</li>
        </ul>
        <p>To exercise these rights, contact: <strong>privacy@globalwakili.co.ke</strong></p>

        <h2>8. AI and Automated Processing</h2>
        <p>
          When you use AI features (document analysis, contract review, etc.), your data may be sent to
          Anthropic's Claude API. Key safeguards:
        </p>
        <ul>
          <li>Only data you explicitly submit for AI analysis is sent</li>
          <li>Sensitive fields (bank details, national IDs) are automatically redacted before sending</li>
          <li>All AI calls are logged in our audit trail</li>
          <li>No AI output is used operationally without human review</li>
          <li>AI features can be disabled per tenant in Platform Settings</li>
        </ul>

        <h2>9. Cookies</h2>
        <p>
          The Platform uses only essential session cookies (JWT storage in sessionStorage, not persistent cookies).
          No third-party tracking or advertising cookies are used.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We will notify you of material changes via email 30 days in advance. Continued use after
          the notice period constitutes acceptance.
        </p>

        <h2>11. Contact and Complaints</h2>
        <p>
          Data Protection Officer: <strong>dpo@globalwakili.co.ke</strong><br />
          For complaints to the regulator: Office of the Data Protection Commissioner (ODPC), Kenya.
        </p>
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Global Wakili Limited · <Link href="/legal/terms" className="hover:text-gray-600">Terms & Conditions</Link>
      </footer>
    </div>
  );
}
