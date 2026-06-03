// Public marketing homepage — redirects authenticated users
import Link from 'next/link';
import { Scale, Shield, Brain, BarChart2, Globe, CheckCircle } from 'lucide-react';

const FEATURES = [
  { icon: <Scale className="h-6 w-6" />, title: 'Legal Practice Management', desc: 'Matters, hearings, workflows, and court calendars — all in one place.' },
  { icon: <Shield className="h-6 w-6" />, title: 'Trust Accounting', desc: 'Law Society of Kenya compliant trust accounting with three-way reconciliation.' },
  { icon: <Brain className="h-6 w-6" />, title: 'AI Legal Operations', desc: 'Governed AI for document analysis, contract review, and legal research.' },
  { icon: <BarChart2 className="h-6 w-6" />, title: 'Finance & Billing', desc: 'eTIMS integrated invoicing, M-PESA payments, and complete accounting.' },
  { icon: <Globe className="h-6 w-6" />, title: 'Client Portal', desc: 'Secure client access to matters, documents, and payments.' },
  { icon: <CheckCircle className="h-6 w-6" />, title: 'Enterprise Compliance', desc: 'KRA eTIMS, GDPR, Kenya Data Protection Act — built-in compliance.' },
];

export default function MarketingHomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">Global Wakili</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
            <Link href="/contact" className="btn-primary btn text-sm px-4 py-2">Request Demo</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-1.5 text-xs font-medium text-primary-700 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          Enterprise Legal ERP — Built for Kenyan Law Firms
        </div>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          The Complete Legal Management<br />Platform for Kenya
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Practice management, trust accounting, AI legal operations, eTIMS compliance,
          and M-PESA payments — unified for enterprise law firms.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/contact" className="btn-primary btn px-8 py-3 text-base">Request a Demo</Link>
          <Link href="/login" className="btn-secondary btn px-8 py-3 text-base">Sign In</Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Everything your firm needs
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6">
                <div className="text-primary-600 mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary-950 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to modernise your firm?</h2>
        <p className="text-primary-300 mb-8 max-w-xl mx-auto">
          Join leading Kenyan law firms on the only enterprise-grade legal ERP built for the local market.
        </p>
        <Link href="/contact" className="btn-primary btn px-10 py-3 text-base bg-accent-500 hover:bg-accent-600 text-gray-900">
          Schedule a Demo
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Global Wakili Legal Enterprise · Nairobi, Kenya
      </footer>
    </div>
  );
}
