import Link from 'next/link';
import { Scale } from 'lucide-react';

export const metadata = {
  title: 'Terms & Conditions — Global Wakili Legal Enterprise',
};

export default function TermsPage() {
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
          <span className="text-sm text-gray-500">Terms & Conditions</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12 prose prose-gray prose-sm">
        <h1>Terms and Conditions</h1>
        <p className="text-gray-500">Effective date: 3 June 2026 | Last updated: 3 June 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using the Global Wakili Legal Enterprise platform ("Platform"), you agree to be bound by these
          Terms and Conditions ("Terms"). If you do not agree to these Terms, you may not use the Platform.
          These Terms constitute a legally binding agreement between you and Global Wakili Limited ("Company",
          "we", "us", or "our"), a company registered in Kenya.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Global Wakili Legal Enterprise is a cloud-based, multi-tenant Legal ERP platform providing practice
          management, trust accounting, legal accounting, HR & payroll, AI operations, document management,
          and client collaboration services to law firms and legal practitioners, primarily within Kenya.
        </p>

        <h2>3. Account Registration and Security</h2>
        <p>
          You must provide accurate, complete, and current information when registering for an account.
          You are responsible for maintaining the confidentiality of your login credentials. You must immediately
          notify us of any unauthorized use of your account. We are not liable for any losses resulting from
          unauthorized account access caused by your failure to maintain credential security.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Platform for any unlawful purpose or in violation of any applicable law</li>
          <li>Attempt to gain unauthorized access to any part of the Platform or its systems</li>
          <li>Upload or transmit malicious code, viruses, or harmful content</li>
          <li>Attempt to reverse-engineer, decompile, or disassemble the Platform</li>
          <li>Use the Platform to harass, abuse, or harm others</li>
          <li>Circumvent or attempt to circumvent any security or access controls</li>
          <li>Use automated tools to scrape or extract data without authorization</li>
        </ul>

        <h2>5. Trust Accounting and Financial Data</h2>
        <p>
          The Platform provides trust accounting tools to assist law firms in managing client funds.
          You acknowledge that the Platform is a tool and does not constitute legal or financial advice.
          You remain solely responsible for compliance with the Advocates Act (Cap. 16), the Law Society
          of Kenya Practice Rules, and any applicable regulations governing the handling of client funds.
          We are not liable for any regulatory breach arising from your use of the trust accounting features.
        </p>

        <h2>6. KRA eTIMS and Tax Compliance</h2>
        <p>
          The Platform facilitates submission of invoices to the Kenya Revenue Authority's Electronic Tax
          Invoice Management System (eTIMS). You are solely responsible for the accuracy of invoice data,
          compliance with the Income Tax Act, VAT Act, and any KRA requirements. We do not guarantee
          acceptance of any submission by KRA.
        </p>

        <h2>7. M-PESA Payments</h2>
        <p>
          Payment processing via M-PESA is facilitated through Safaricom Daraja API integration.
          Transaction fees are determined by Safaricom and are not controlled by us. We are not responsible
          for failed, delayed, or reversed M-PESA transactions caused by Safaricom systems or network issues.
        </p>

        <h2>8. Intellectual Property</h2>
        <p>
          The Platform, including all software, design, trademarks, and content, is the property of
          Global Wakili Limited. Your data remains your property. We are granted a limited license to
          host, process, and display your data solely to provide the Services described herein.
        </p>

        <h2>9. Data Privacy</h2>
        <p>
          We process personal data in accordance with our <Link href="/legal/privacy">Privacy Policy</Link> and
          the Kenya Data Protection Act 2019. By using the Platform, you consent to such processing.
        </p>

        <h2>10. Confidentiality</h2>
        <p>
          You acknowledge that client data managed through the Platform may be subject to legal
          professional privilege and confidentiality obligations. We maintain enterprise-grade security
          controls and do not access your client data except for purposes of providing the Service
          or as required by law.
        </p>

        <h2>11. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by applicable law, the Company shall not be liable for any
          indirect, incidental, special, consequential, or punitive damages, including but not limited to
          loss of profits, data loss, or business interruption, arising from your use or inability to use
          the Platform. Our total liability for any claim shall not exceed the amount paid by you to us in
          the 12 months preceding the claim.
        </p>

        <h2>12. Service Availability</h2>
        <p>
          We aim for 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance
          will be communicated with reasonable advance notice. We are not liable for downtime caused by
          third-party services (Neon, AWS, Safaricom, KRA) or events beyond our reasonable control.
        </p>

        <h2>13. Subscription and Billing</h2>
        <p>
          Subscription fees are billed as agreed in your subscription plan. All fees are non-refundable
          except as required by law. We reserve the right to suspend access for non-payment following
          reasonable notice.
        </p>

        <h2>14. Termination</h2>
        <p>
          Either party may terminate this agreement with 30 days written notice. We may terminate
          immediately for material breach, illegal use, or non-payment. Upon termination, you may
          export your data for 30 days before it is permanently deleted.
        </p>

        <h2>15. Governing Law</h2>
        <p>
          These Terms are governed by the laws of Kenya. Any disputes shall be resolved in the courts
          of Nairobi, Kenya.
        </p>

        <h2>16. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. We will provide 30 days notice of material changes
          via email. Continued use after the notice period constitutes acceptance of the updated Terms.
        </p>

        <h2>17. Contact</h2>
        <p>
          For any questions regarding these Terms, contact us at:<br />
          <strong>Global Wakili Limited</strong><br />
          Nairobi, Kenya<br />
          Email: legal@globalwakili.co.ke
        </p>
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Global Wakili Limited · <Link href="/legal/privacy" className="hover:text-gray-600">Privacy Policy</Link>
      </footer>
    </div>
  );
}
