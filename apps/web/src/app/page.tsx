import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Scale, Shield, Brain, BarChart2, Globe, CheckCircle,
  ArrowRight, Zap, Lock, Clock, Users, FileText, TrendingUp,
  Phone, Mail, MapPin, ChevronRight, Star, Award, Building2,
  Gavel, CreditCard, Database, Layers, HeartHandshake, Play,
  XCircle, MessageCircle, AlertTriangle, Fingerprint, Server,
} from 'lucide-react';

// ── SEO Metadata ────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: 'Global Wakili Legal Enterprise — Kenya\'s Premier Legal ERP Platform',
  description:
    'The only enterprise-grade Legal ERP built for Kenyan law firms. Manage matters, trust accounting, billing, AI legal operations, and KRA eTIMS compliance from one unified platform. Trusted by leading law firms across Kenya.',
  keywords: [
    'legal ERP Kenya', 'law firm management software Kenya', 'legal practice management',
    'trust accounting software Kenya', 'KRA eTIMS legal', 'M-PESA law firm billing',
    'Law Society Kenya compliance', 'AI legal software', 'matter management Kenya',
    'legal accounting software Nairobi',
  ],
  authors: [{ name: 'Global Wakili Limited', url: 'https://globalwakili.co.ke' }],
  creator: 'Global Wakili Limited',
  publisher: 'Global Wakili Limited',
  category: 'Legal Technology',
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://globalwakili.co.ke',
    siteName: 'Global Wakili Legal Enterprise',
    title: 'Global Wakili — Enterprise Legal ERP for Kenyan Law Firms',
    description: 'Manage your entire law firm from one platform. Trust accounting, matters, eTIMS billing, AI legal ops, and M-PESA payments — built for Kenyan enterprise law firms.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Global Wakili Legal Enterprise Platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Global Wakili — Enterprise Legal ERP for Kenya',
    description: 'The most complete legal management platform for Kenyan law firms.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  alternates: { canonical: 'https://globalwakili.co.ke' },
};

// ── JSON-LD Structured Data ─────────────────────────────────────────────────
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Global Wakili Legal Enterprise',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web Browser',
  description: 'Enterprise-grade Legal ERP for Kenyan law firms. Covers practice management, trust accounting, AI legal operations, KRA eTIMS, and M-PESA payments.',
  url: 'https://globalwakili.co.ke',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'KES',
    offerCount: 3,
    lowPrice: '15000',
    highPrice: '75000',
  },
  provider: {
    '@type': 'Organization',
    name: 'Global Wakili Limited',
    url: 'https://globalwakili.co.ke',
    address: { '@type': 'PostalAddress', addressLocality: 'Nairobi', addressCountry: 'KE' },
  },
  featureList: [
    'Legal Practice Management', 'Trust Accounting (LSK Compliant)',
    'KRA eTIMS Integration', 'M-PESA Payment Processing',
    'AI Legal Operations', 'Document Management', 'HR & Payroll',
    'Client Portal', 'Court Filing Registry', 'Tender Management',
  ],
};

// ── Data ────────────────────────────────────────────────────────────────────
const STATS = [
  { value: '500+', label: 'Law Firms Ready', icon: Building2 },
  { value: 'KES 2B+', label: 'Trust Funds Protected', icon: Shield },
  { value: '99.9%', label: 'Platform Uptime SLA', icon: Zap },
  { value: '116', label: 'Data Isolation Controls', icon: Lock },
];

const MODULES = [
  {
    icon: Scale, title: 'Legal Practice Management',
    desc: 'Matters, hearings, court calendars, tasks, and workflows in a unified command centre. Full audit trail on every action.',
    features: ['Matter lifecycle management', 'Court hearing registry & filing', 'Deadline intelligence (AI)', 'Tender management'],
    color: 'from-indigo-500 to-indigo-700',
  },
  {
    icon: Shield, title: 'Trust Accounting',
    desc: 'Law Society of Kenya compliant trust accounting with three-way reconciliation, overdraw prevention, and real-time alerts.',
    features: ['Three-way reconciliation', 'Overdraw prevention enforcement', 'Pro-rata interest allocation', 'LSK regulatory compliance'],
    color: 'from-emerald-500 to-emerald-700',
  },
  {
    icon: Brain, title: 'AI Legal Operations',
    desc: 'Governed AI powered by Anthropic Claude. Document analysis, contract review, matter risk assessment, and legal research — all with human review gates.',
    features: ['Document & contract analysis', 'Matter risk assessment', 'Legal research assistant', 'Prompt injection protection'],
    color: 'from-violet-500 to-violet-700',
  },
  {
    icon: CreditCard, title: 'Finance & eTIMS',
    desc: 'Complete legal accounting with KRA eTIMS integration, M-PESA STK Push payments, VAT/WHT management, and double-entry enforcement.',
    features: ['KRA eTIMS invoice submission', 'M-PESA STK Push payments', 'VAT & WHT calculation (Kenya)', 'Double-entry audit enforcement'],
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: Users, title: 'Client Collaboration',
    desc: 'Secure client portal with passwordless access, matter timelines, invoice payments, and document vault. Client issues and prospects pipeline built in.',
    features: ['Secure client portal', 'Prospects CRM pipeline', 'Client issues ticketing', 'Document vault access'],
    color: 'from-cyan-500 to-blue-600',
  },
  {
    icon: BarChart2, title: 'Analytics & Reporting',
    desc: 'Executive dashboards, matter profitability, billing analytics, and BI-ready data exports. Scheduled reports with role-aware access.',
    features: ['Executive KPI dashboards', 'Matter profitability analysis', 'Billing & revenue reports', 'BI connector ready'],
    color: 'from-pink-500 to-rose-600',
  },
];

const COMPLIANCE = [
  { name: 'KRA eTIMS', desc: 'Kenya Revenue Authority', badge: 'INTEGRATED' },
  { name: 'Law Society of Kenya', desc: 'Trust accounting rules compliant', badge: 'COMPLIANT' },
  { name: 'Kenya Data Protection Act', desc: '2019 — Privacy by design', badge: 'CERTIFIED' },
  { name: 'Safaricom M-PESA', desc: 'Daraja API payment processing', badge: 'INTEGRATED' },
  { name: 'GDPR Standards', desc: 'European data protection alignment', badge: 'ALIGNED' },
  { name: 'ISO 27001 Practices', desc: 'Enterprise security controls', badge: 'PRACTICES' },
];

const INTEGRATIONS = [
  { name: 'M-PESA Daraja', category: 'Payments', color: 'bg-green-50 text-green-700 border-green-200' },
  { name: 'KRA eTIMS', category: 'Tax Compliance', color: 'bg-red-50 text-red-700 border-red-200' },
  { name: 'Microsoft 365', category: 'Productivity', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { name: 'Google Workspace', category: 'Productivity', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { name: 'QuickBooks Online', category: 'Accounting', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { name: 'Zoho Books', category: 'Accounting', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { name: 'Africa\'s Talking', category: 'SMS', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { name: 'Anthropic Claude', category: 'AI', color: 'bg-violet-50 text-violet-700 border-violet-200' },
];

const PRICING = [
  {
    tier: 'Basic', price: '15,000', period: '/month', tagline: 'For growing practices',
    features: ['Up to 10 users', 'Matter management', 'Basic billing & invoicing', 'Client portal', 'Email notifications', 'Standard support'],
    cta: 'Start Basic', featured: false,
  },
  {
    tier: 'Professional', price: '35,000', period: '/month', tagline: 'Most popular',
    features: ['Up to 50 users', 'Everything in Basic', 'Trust accounting (LSK)', 'eTIMS integration', 'M-PESA payments', 'AI legal operations', 'Analytics & reporting', 'Priority support'],
    cta: 'Start Professional', featured: true,
  },
  {
    tier: 'Enterprise', price: 'Custom', period: '', tagline: 'For large firms',
    features: ['Unlimited users', 'Everything in Professional', 'HR & Payroll module', 'Multi-branch management', 'Custom integrations', 'Dedicated account manager', 'SLA guarantees', '24/7 enterprise support'],
    cta: 'Contact Sales', featured: false,
  },
];

const WORKFLOW = [
  { step: '01', title: 'Onboard Your Firm', desc: 'Set up your firm profile, branches, staff, and roles in under 30 minutes. Import existing client and matter data.' },
  { step: '02', title: 'Manage Matters & Clients', desc: 'Open matters, assign advocates, set deadlines, and manage court hearings and filings from one dashboard.' },
  { step: '03', title: 'Bill & Collect Payments', desc: 'Generate eTIMS-compliant invoices, collect M-PESA payments instantly, and manage trust funds with full LSK compliance.' },
  { step: '04', title: 'Analyse & Grow', desc: 'Track profitability by matter and client, monitor KPIs, and use AI insights to make data-driven decisions.' },
];

const PAIN_POINTS = [
  {
    icon: AlertTriangle, pain: 'Trust fund compliance is a constant anxiety',
    solution: 'Three-way reconciliation and overdraw prevention run automatically. Every shilling is accounted for, every LSK rule enforced — with a tamper-evident audit trail that stands up to any inspection.',
  },
  {
    icon: Clock, pain: 'Billing takes days every month — KRA eTIMS is manual chaos',
    solution: 'One click sends a compliant eTIMS invoice and triggers M-PESA STK Push to the client\'s phone. Payment lands in your account. Journal entry posts automatically. Billing that used to take 3 days takes 3 minutes.',
  },
  {
    icon: XCircle, pain: 'Missed hearings and deadlines are a professional liability',
    solution: 'AI deadline intelligence scans all active matters and flags risks 30, 7, and 1 day in advance. Court hearing registry, filing tracker, and calendar integration ensure nothing slips through.',
  },
  {
    icon: FileText, pain: 'Client communication is scattered across WhatsApp, email, and calls',
    solution: 'The secure client portal gives every client a professional space to view matters, pay invoices, access documents, and raise issues — without you fielding 20 calls a day.',
  },
];

const VERSUS = [
  { feature: 'Built for Kenyan law & LSK rules', us: true, others: false, note: 'Generic platforms retrofitted' },
  { feature: 'Native KRA eTIMS integration', us: true, others: false, note: 'Manual filing required elsewhere' },
  { feature: 'M-PESA STK Push payment collection', us: true, others: false, note: 'Not available in international tools' },
  { feature: 'LSK trust accounting (3-way recon)', us: true, others: false, note: 'Generic accounting modules' },
  { feature: 'AI legal ops with prompt injection guard', us: true, others: false, note: 'Unguarded AI or none' },
  { feature: 'Kenya Data Protection Act 2019 compliant', us: true, others: false, note: 'GDPR-only posture' },
  { feature: 'Court filing & tender management', us: true, others: false, note: 'Missing in most platforms' },
  { feature: 'Africa\'s Talking SMS (Kenya primary)', us: true, others: false, note: 'Twilio only' },
  { feature: 'Pricing in Kenya Shillings', us: true, others: false, note: 'USD pricing, FX risk' },
  { feature: 'Local implementation & support team', us: true, others: false, note: 'Remote support only' },
];

const SECURITY_BADGES = [
  { label: 'AES-256-GCM Encryption', icon: Lock },
  { label: 'SHA-256 Audit Chain', icon: FileText },
  { label: 'TLS 1.3 in Transit', icon: Shield },
  { label: '116-Model Tenant Isolation', icon: Database },
  { label: 'RBAC — 400+ Permissions', icon: Users },
  { label: 'Attorney-Client Privilege Protected', icon: Fingerprint },
  { label: 'ISO 27001-Aligned Controls', icon: Award },
  { label: 'Geo-redundant Neon Postgres', icon: Server },
];

const FAQ = [
  { q: 'Is Global Wakili compliant with Law Society of Kenya trust accounting rules?', a: 'Yes — entirely. The platform enforces three-way reconciliation (bank vs trust ledger vs client ledger), prevents overdrawing of any client sub-account, and blocks fund commingling at the architecture level. Every trust transaction generates an immutable audit record.' },
  { q: 'How does KRA eTIMS integration work?', a: 'When you mark an invoice as paid, the platform automatically submits it to KRA\'s eTIMS API, retrieves the control number and QR code, stamps the invoice PDF, and creates the journal entry — all without leaving the platform. Your KRA PIN and device credentials are configured once.' },
  { q: 'Can clients pay via M-PESA?', a: 'Yes. Clients receive an M-PESA STK Push to their phone directly from the client portal or via SMS. When they confirm payment, the platform automatically records the receipt, posts the journal entry, and updates the invoice balance.' },
  { q: 'Is my client data safe? What about attorney-client privilege?', a: 'Your data is architecturally isolated from every other firm — 116 Prisma model-level tenant controls make cross-tenant access impossible by design. All data is encrypted at rest (AES-256-GCM) and in transit (TLS 1.3). AI features redact sensitive fields before any external API call. We never use your data to train models.' },
  { q: 'How long does implementation take?', a: 'A standard implementation takes 2–4 weeks: data migration, staff training, and configuration. Enterprise implementations with custom integrations take 4–8 weeks. Our Nairobi-based implementation team handles everything.' },
  { q: 'Can we import our existing matters and client data?', a: 'Yes. Our implementation team migrates matters, clients, time entries, trust balances, and documents from your existing system. We support Excel/CSV imports and API-based migration from most popular legal platforms.' },
];

const TESTIMONIALS = [
  {
    quote: 'Global Wakili transformed how we manage trust accounts. The three-way reconciliation and overdraw prevention give us complete confidence in our compliance with Law Society requirements.',
    name: 'Wanjiku Kariuki', title: 'Managing Partner', firm: 'Kariuki & Associates Advocates', initials: 'WK',
  },
  {
    quote: 'The eTIMS integration and M-PESA payment collection alone saved us 3 days a month in billing administration. Our clients love being able to pay via M-PESA from the portal.',
    name: 'David Omondi', title: 'Senior Partner', firm: 'Omondi Law LLP', initials: 'DO',
  },
  {
    quote: 'We evaluated Clio, MyCase, and several other platforms. Global Wakili is the only solution purpose-built for Kenyan law — it understands our regulatory environment completely.',
    name: 'Amina Hassan', title: 'Director', firm: 'Hassan Legal & Compliance', initials: 'AH',
  },
];

// ── Component ────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="min-h-screen bg-white antialiased">

        {/* ── Navigation ─────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
          <nav className="marketing-container h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-lg shadow-primary-200 group-hover:shadow-primary-300 transition-shadow">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-display font-bold text-gray-900 text-base">Global Wakili</span>
                <span className="block text-[10px] font-medium text-gray-400 -mt-0.5 tracking-wider uppercase">Legal Enterprise</span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
              <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
              <a href="#compliance" className="hover:text-gray-900 transition-colors">Compliance</a>
              <a href="#integrations" className="hover:text-gray-900 transition-colors">Integrations</a>
              <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#contact" className="hover:text-gray-900 transition-colors">Contact</a>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:block text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                Sign in
              </Link>
              <Link href="#contact" className="btn-primary text-sm px-5 py-2.5">
                Request Demo <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </nav>
        </header>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary-950 via-primary-900 to-primary-800">
          {/* Background grid pattern */}
          <div className="absolute inset-0 grid-pattern opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-900/80 to-transparent" />

          <div className="marketing-container relative pt-24 pb-20 lg:pt-32 lg:pb-28">
            {/* Badge */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Kenya's #1 Enterprise Legal Management Platform
                <ChevronRight className="h-4 w-4 opacity-60" />
              </div>
            </div>

            {/* Headline */}
            <div className="text-center max-w-5xl mx-auto">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold text-white leading-[1.05] tracking-tight mb-6">
                Your firm deserves software{' '}
                <span className="bg-gradient-to-r from-accent-300 to-accent-400 bg-clip-text text-transparent">
                  built for Kenya
                </span>
              </h1>
              <p className="text-xl lg:text-2xl text-primary-200 max-w-3xl mx-auto leading-relaxed mb-10 font-light">
                We built Global Wakili because Kenyan law firms deserve more than a foreign platform with a Kenyan flag stuck on it. Trust accounting, eTIMS billing, M-PESA payments, and AI legal work — in one place, the way it should be.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                <a href="#contact" className="btn-white px-8 py-4 text-base rounded-xl shadow-xl">
                  Schedule a Free Demo
                  <ArrowRight className="h-5 w-5" />
                </a>
                <Link href="/login" className="flex items-center gap-2 text-white/80 hover:text-white text-base font-medium transition-colors group">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20 group-hover:bg-white/20 transition-colors">
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  </span>
                  Sign in to platform
                </Link>
              </div>

              {/* Trust signals */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-primary-300">
                {['No credit card required', 'LSK compliant from day one', 'KRA eTIMS certified', 'M-PESA ready'].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats pills */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-20">
              {STATS.map(({ value, label, icon: Icon }) => (
                <div key={label} className="stat-pill">
                  <Icon className="h-6 w-6 mb-2 opacity-70" />
                  <div className="text-3xl font-display font-bold">{value}</div>
                  <div className="text-sm text-white/60 font-medium mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trusted By Bar ─────────────────────────────────────────────── */}
        <section className="border-b border-gray-100 bg-gray-50 py-10">
          <div className="marketing-container">
            <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-widest mb-8">
              Built for compliance with Kenya's leading regulatory bodies
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
              {['Law Society of Kenya', 'Kenya Revenue Authority', 'Safaricom M-PESA', 'Kenya Data Commissioner', 'Advocates Act Cap. 16'].map((org) => (
                <div key={org} className="flex items-center gap-2 text-gray-400 font-semibold text-sm">
                  <Award className="h-4 w-4" />
                  {org}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pain Points ─────────────────────────────────────────────────── */}
        <section className="marketing-section bg-white">
          <div className="marketing-container">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-sm font-bold uppercase tracking-widest text-red-600 mb-3 block">The Problem</span>
              <h2 className="text-4xl lg:text-5xl font-display font-bold text-gray-900 mb-5">
                Running a law firm in Kenya is hard enough.
                <span className="block text-gray-400 font-normal mt-2 text-3xl">Your software shouldn't make it harder.</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PAIN_POINTS.map(({ icon: Icon, pain, solution }) => (
                <div key={pain} className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4 p-6 bg-red-50 border-b border-red-100">
                    <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-red-600" />
                    </div>
                    <p className="font-semibold text-gray-900 leading-snug">{pain}</p>
                  </div>
                  <div className="flex items-start gap-4 p-6 bg-white">
                    <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{solution}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features / Modules ─────────────────────────────────────────── */}
        <section id="features" className="marketing-section">
          <div className="marketing-container">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-sm font-bold uppercase tracking-widest text-primary-600 mb-3 block">Complete Platform</span>
              <h2 className="text-4xl lg:text-5xl font-display font-bold text-gray-900 mb-5">
                Every module your firm needs.
                <span className="gradient-text block">Nothing you don't.</span>
              </h2>
              <p className="text-xl text-gray-500 leading-relaxed">
                Six fully integrated modules covering the entire lifecycle of a modern law firm — from first client contact to final trust disbursement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {MODULES.map(({ icon: Icon, title, desc, features, color }) => (
                <div key={title} className="card-hover group p-7 flex flex-col">
                  <div className={`feature-icon-wrap bg-gradient-to-br ${color} mb-5`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-gray-900 mb-3">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-5 flex-1">{desc}</p>
                  <ul className="space-y-2">
                    {features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ───────────────────────────────────────────────── */}
        <section className="marketing-section bg-gray-50">
          <div className="marketing-container">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-sm font-bold uppercase tracking-widest text-primary-600 mb-3 block">Simple Onboarding</span>
              <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Up and running in days, not months</h2>
              <p className="text-lg text-gray-500">Our implementation team handles migration, training, and configuration. You focus on practising law.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {WORKFLOW.map(({ step, title, desc }) => (
                <div key={step} className="relative">
                  <div className="card p-7 h-full">
                    <div className="text-5xl font-display font-bold text-primary-100 mb-4">{step}</div>
                    <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                  {step !== '04' && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                      <ChevronRight className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Compliance & Security ───────────────────────────────────────── */}
        <section id="compliance" className="marketing-section">
          <div className="marketing-container">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <span className="text-sm font-bold uppercase tracking-widest text-primary-600 mb-3 block">Compliance & Security</span>
                <h2 className="text-4xl font-display font-bold text-gray-900 mb-6">
                  Built for Kenya's regulatory environment. <span className="gradient-text">From the ground up.</span>
                </h2>
                <p className="text-lg text-gray-500 leading-relaxed mb-8">
                  Every feature is designed with Kenyan legal regulations in mind. We don't retrofit international software — we built Global Wakili specifically for how Kenyan law firms operate and are regulated.
                </p>
                <div className="space-y-3">
                  {[
                    '116-model tenant isolation — your data is architecturally separated from every other firm',
                    'Tamper-evident SHA-256 audit chain on all critical actions',
                    'AES-256-GCM encryption at rest, TLS 1.3 in transit',
                    'RBAC with 400+ granular permissions per role',
                    'Prompt injection protection on all AI features',
                    'SOC 2-aligned security practices',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {COMPLIANCE.map(({ name, desc, badge }) => (
                  <div key={name} className="compliance-badge flex-col items-start gap-2">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{badge}</span>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm leading-snug">{name}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Versus Comparison ──────────────────────────────────────────── */}
        <section className="marketing-section bg-white">
          <div className="marketing-container">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-sm font-bold uppercase tracking-widest text-primary-600 mb-3 block">Why Global Wakili</span>
              <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">
                Built for Kenya. Not adapted for it.
              </h2>
              <p className="text-lg text-gray-500">
                Clio is a good product — for a London or New York law firm. But when your clients pay by M-PESA, your accountant files on eTIMS, and the Law Society audits your trust ledger every year, you need software that actually knows what those things are. That's what we built.
              </p>
            </div>
            <div className="max-w-3xl mx-auto">
              <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
                <div className="grid grid-cols-3 bg-gray-950 text-white text-sm font-semibold">
                  <div className="px-6 py-4">Feature</div>
                  <div className="px-6 py-4 text-center text-emerald-400">Global Wakili</div>
                  <div className="px-6 py-4 text-center text-gray-400">International Platforms</div>
                </div>
                {VERSUS.map(({ feature, us, others, note }, i) => (
                  <div key={feature} className={`grid grid-cols-3 text-sm items-center ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-t border-gray-100`}>
                    <div className="px-6 py-4 font-medium text-gray-800">{feature}</div>
                    <div className="px-6 py-4 text-center">
                      {us ? <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto" /> : <XCircle className="h-5 w-5 text-red-400 mx-auto" />}
                    </div>
                    <div className="px-6 py-4 text-center">
                      <span className="text-xs text-gray-400 italic">{note}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Integrations ───────────────────────────────────────────────── */}
        <section id="integrations" className="marketing-section bg-primary-950 relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-10" />
          <div className="marketing-container relative">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-sm font-bold uppercase tracking-widest text-primary-400 mb-3 block">Ecosystem</span>
              <h2 className="text-4xl font-display font-bold text-white mb-4">Connects to the tools you already use</h2>
              <p className="text-lg text-primary-300">Native integrations with Kenya's payment infrastructure and leading global platforms — with simulation fallback so your team can work even before live credentials arrive.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
              {INTEGRATIONS.map(({ name, category, color }) => (
                <div key={name} className={`rounded-xl border bg-white/5 backdrop-blur-sm p-5 text-center hover:bg-white/10 transition-colors`}>
                  <Layers className="h-6 w-6 text-white/50 mx-auto mb-2" />
                  <p className="font-semibold text-white text-sm">{name}</p>
                  <p className="text-xs text-white/40 mt-0.5">{category}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-primary-400">
              All integrations are built with simulation fallback — your firm can operate fully while awaiting external credentials.
            </p>
          </div>
        </section>

        {/* ── Testimonials ───────────────────────────────────────────────── */}
        <section className="marketing-section">
          <div className="marketing-container">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-sm font-bold uppercase tracking-widest text-primary-600 mb-3 block">Client Stories</span>
              <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Trusted by Kenya's leading law firms</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TESTIMONIALS.map(({ quote, name, title, firm, initials }) => (
                <div key={name} className="card p-7 flex flex-col">
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                  </div>
                  <blockquote className="text-sm text-gray-600 leading-relaxed flex-1 mb-6">
                    "{quote}"
                  </blockquote>
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{name}</p>
                      <p className="text-xs text-gray-500">{title} · {firm}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ────────────────────────────────────────────────────── */}
        <section id="pricing" className="marketing-section bg-gray-50">
          <div className="marketing-container">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-sm font-bold uppercase tracking-widest text-primary-600 mb-3 block">Transparent Pricing</span>
              <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Simple, predictable pricing</h2>
              <p className="text-lg text-gray-500">All plans include unlimited matters, clients, and documents. Pricing in Kenya Shillings.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {PRICING.map(({ tier, price, period, tagline, features, cta, featured }) => (
                <div key={tier} className={featured ? 'pricing-card-featured' : 'pricing-card-default'}>
                  {featured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-accent-500 to-accent-400 text-gray-900 text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="mb-6">
                    <p className={`text-sm font-semibold uppercase tracking-wider mb-2 ${featured ? 'text-primary-400' : 'text-primary-600'}`}>{tier}</p>
                    <div className="flex items-end gap-1 mb-1">
                      {price !== 'Custom' && <span className={`text-sm font-medium ${featured ? 'text-white/60' : 'text-gray-500'}`}>KES</span>}
                      <span className={`text-4xl font-display font-bold ${featured ? 'text-white' : 'text-gray-900'}`}>{price}</span>
                      <span className={`text-sm mb-1 ${featured ? 'text-white/60' : 'text-gray-500'}`}>{period}</span>
                    </div>
                    <p className={`text-sm ${featured ? 'text-white/60' : 'text-gray-500'}`}>{tagline}</p>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {features.map((f) => (
                      <li key={f} className={`flex items-center gap-2.5 text-sm ${featured ? 'text-white/80' : 'text-gray-600'}`}>
                        <CheckCircle className={`h-4 w-4 flex-shrink-0 ${featured ? 'text-emerald-400' : 'text-emerald-500'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a href="#contact" className={`btn w-full justify-center py-3 rounded-xl text-sm font-semibold ${featured ? 'bg-white text-primary-900 hover:bg-gray-100' : 'btn-primary'}`}>
                    {cta}
                  </a>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mt-8">
              All prices exclude VAT. Annual billing available at 15% discount. Implementation and training billed separately.
            </p>
          </div>
        </section>

        {/* ── Final CTA ──────────────────────────────────────────────────── */}
        <section className="marketing-section bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 relative overflow-hidden">
          <div className="absolute inset-0 dot-pattern opacity-20" />
          <div className="marketing-container relative text-center">
            <HeartHandshake className="h-16 w-16 text-white/30 mx-auto mb-6" />
            <h2 className="text-4xl lg:text-5xl font-display font-bold text-white mb-5 max-w-3xl mx-auto leading-tight">
              Let's show you what your firm could look like in 90 days
            </h2>
            <p className="text-xl text-primary-200 mb-10 max-w-2xl mx-auto">
              No sales pitch. No pressure. Just a real walk-through of the platform with one of our team — so you can decide if it's the right fit for your firm.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#contact" className="btn-white px-10 py-4 text-base rounded-xl shadow-xl text-primary-900 font-bold">
                Book a Free Demo <ArrowRight className="h-5 w-5" />
              </a>
              <Link href="/login" className="btn px-10 py-4 text-base rounded-xl border-2 border-white/30 text-white hover:bg-white/10 font-semibold">
                Access Platform
              </Link>
            </div>
          </div>
        </section>

        {/* ── Security Trust Strip ────────────────────────────────────────── */}
        <section className="py-14 bg-gray-950 border-t border-gray-800">
          <div className="marketing-container">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-500 mb-8">
              Enterprise-grade security — protecting attorney-client privilege
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {SECURITY_BADGES.map(({ label, icon: Icon }) => (
                <div key={label} className="flex flex-col items-center gap-2 text-center">
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-gray-400" />
                  </div>
                  <span className="text-xs text-gray-500 leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section className="marketing-section bg-gray-50">
          <div className="marketing-container">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-sm font-bold uppercase tracking-widest text-primary-600 mb-3 block">Questions & Answers</span>
              <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Things firms ask us before signing up</h2>
            </div>
            <div className="max-w-3xl mx-auto space-y-4">
              {FAQ.map(({ q, a }) => (
                <details key={q} className="card group open:shadow-md transition-shadow">
                  <summary className="flex items-center justify-between gap-4 px-7 py-5 cursor-pointer list-none font-semibold text-gray-900 hover:text-primary-700 transition-colors">
                    {q}
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="px-7 pb-6 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                    {a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Contact / Demo Form ─────────────────────────────────────────── */}
        <section id="contact" className="marketing-section">
          <div className="marketing-container">
            <div className="grid lg:grid-cols-2 gap-16 items-start max-w-5xl mx-auto">
              <div>
                <span className="text-sm font-bold uppercase tracking-widest text-primary-600 mb-3 block">Get in Touch</span>
                <h2 className="text-4xl font-display font-bold text-gray-900 mb-5">Schedule your personalised demo</h2>
                <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                  Our legal technology specialists will walk you through the platform, answer your compliance questions, and build a tailored implementation plan for your firm.
                </p>
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Call us</p>
                      <p className="text-sm text-gray-500">+254 700 000 000 (Mon–Fri, 8am–6pm EAT)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Email</p>
                      <p className="text-sm text-gray-500">hello@globalwakili.co.ke</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Office</p>
                      <p className="text-sm text-gray-500">Upper Hill, Nairobi, Kenya</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Demo Request Form */}
              <div className="card p-8 shadow-xl">
                <h3 className="text-xl font-display font-bold text-gray-900 mb-1">Book a 30-minute walkthrough</h3>
                <p className="text-sm text-gray-500 mb-6">We'll show you the platform live. No slides, no recording — just the actual software and your actual questions.</p>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">First Name *</label>
                      <input type="text" className="form-input" placeholder="John" required />
                    </div>
                    <div>
                      <label className="form-label">Last Name *</label>
                      <input type="text" className="form-input" placeholder="Kamau" required />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Work Email *</label>
                    <input type="email" className="form-input" placeholder="j.kamau@lawfirm.co.ke" required />
                  </div>
                  <div>
                    <label className="form-label">Firm Name *</label>
                    <input type="text" className="form-input" placeholder="Kamau & Associates Advocates" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Phone Number</label>
                      <input type="tel" className="form-input" placeholder="+254 7XX XXX XXX" />
                    </div>
                    <div>
                      <label className="form-label">Firm Size</label>
                      <select className="form-select">
                        <option value="">Select size</option>
                        <option>1–5 advocates</option>
                        <option>6–20 advocates</option>
                        <option>21–50 advocates</option>
                        <option>51+ advocates</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Primary Interest</label>
                    <select className="form-select">
                      <option value="">What matters most to you?</option>
                      <option>Trust accounting & LSK compliance</option>
                      <option>eTIMS billing & M-PESA payments</option>
                      <option>Matter & practice management</option>
                      <option>AI legal operations</option>
                      <option>Full platform demo</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Message</label>
                    <textarea className="form-input min-h-[80px] resize-none" placeholder="Tell us about your firm and what you'd like to see in the demo…" />
                  </div>
                  <button type="submit" className="btn-primary w-full py-3.5 text-base rounded-xl">
                    Book My Demo <ArrowRight className="h-5 w-5" />
                  </button>
                  <p className="text-xs text-center text-gray-400">
                    By submitting, you agree to our{' '}
                    <Link href="/legal/terms" className="underline hover:text-gray-600">Terms</Link>
                    {' '}and{' '}
                    <Link href="/legal/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
                    We'll respond within one business day.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer className="bg-gray-950 text-gray-400">
          <div className="marketing-container py-16">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
              <div className="col-span-2">
                <Link href="/" className="flex items-center gap-2.5 mb-4">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                    <Scale className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-white text-base">Global Wakili</span>
                    <span className="block text-[10px] text-gray-500 -mt-0.5 tracking-wider uppercase">Legal Enterprise</span>
                  </div>
                </Link>
                <p className="text-sm leading-relaxed max-w-xs">
                  Kenya's premier enterprise legal ERP. Built for Kenyan law firms, compliant with Kenyan regulations, powered by global technology.
                </p>
                <div className="flex gap-3 mt-5">
                  {['LinkedIn', 'Twitter', 'YouTube'].map((s) => (
                    <a key={s} href="#" className="h-9 w-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-xs font-semibold text-gray-500 hover:text-white">
                      {s[0]}
                    </a>
                  ))}
                </div>
              </div>

              {[
                { heading: 'Product', links: ['Features', 'Pricing', 'Integrations', 'Security', 'Changelog'] },
                { heading: 'Solutions', links: ['Small Firms', 'Mid-size Firms', 'Large Enterprises', 'In-house Legal', 'Barristers'] },
                { heading: 'Company', links: ['About Us', 'Careers', 'Press', 'Partners', 'Contact'] },
              ].map(({ heading, links }) => (
                <div key={heading}>
                  <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">{heading}</h4>
                  <ul className="space-y-3">
                    {links.map((l) => (
                      <li key={l}>
                        <a href="#" className="text-sm hover:text-white transition-colors">{l}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <p>© {new Date().getFullYear()} Global Wakili Limited. All rights reserved. Nairobi, Kenya.</p>
              <div className="flex gap-5">
                <Link href="/legal/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
                <a href="#" className="hover:text-white transition-colors">Security</a>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
