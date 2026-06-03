'use client';

import { ExternalLink, BookOpen, Award, Scale, Globe, FileText, Users } from 'lucide-react';

type Resource = {
  name: string;
  desc: string;
  url: string;
  category: string;
  badge?: string;
};

const RESOURCES: Resource[] = [
  // LSK
  { name: 'Law Society of Kenya', desc: 'Official LSK portal — member services, gazette notices, and practice guidelines', url: 'https://lsk.or.ke', category: 'Regulatory', badge: 'Primary' },
  { name: 'LSK CPD / CLE Portal', desc: 'Check your Continuing Professional Development points and register for Continuing Legal Education programmes', url: 'https://lsk.or.ke/cpd', category: 'CPD & CLE', badge: 'CPD' },
  { name: 'LSK Members Directory', desc: 'Verify advocates in good standing and find colleagues across Kenya', url: 'https://lsk.or.ke/members', category: 'Regulatory' },

  // Law Reports
  { name: 'Kenya Law (kenyalaw.org)', desc: 'Official repository of Kenya case law, statutes, Bills, subsidiary legislation, and the Kenya Gazette', url: 'https://kenyalaw.org', category: 'Law Reports', badge: 'Essential' },
  { name: 'Kenya Law eKLR', desc: 'Electronic Kenya Law Reports — search judgments by court, judge, year, and legal principle', url: 'https://kenyalaw.org/caselaw', category: 'Law Reports' },
  { name: 'Kenya Gazette', desc: 'Official government gazette — legal notices, appointments, and statutory instruments', url: 'https://kenyalaw.org/kenya-gazette', category: 'Law Reports' },

  // Legislation
  { name: 'Kenya Law Reform Commission', desc: 'Up-to-date consolidated statutes and legislation reform resources', url: 'https://klrc.go.ke', category: 'Legislation' },
  { name: 'National Assembly — Bills', desc: 'Track Bills before Parliament, committee reports, and Hansard records', url: 'https://parliament.go.ke', category: 'Legislation' },

  // Regional
  { name: 'East Africa Law Society', desc: 'Regional bar association for East African advocates — standards, CPD, and cross-border practice', url: 'https://eals.org', category: 'Regional' },
  { name: 'African Court on Human & Peoples\' Rights', desc: 'Case law and decisions from the African Court — relevant to constitutional and human rights matters', url: 'https://www.african-court.org', category: 'Regional' },

  // Tax & Compliance
  { name: 'Kenya Revenue Authority (KRA)', desc: 'Tax compliance, eTIMS registration, VAT returns, and taxpayer portal', url: 'https://kra.go.ke', category: 'Tax & Compliance', badge: 'eTIMS' },
  { name: 'eTIMS Portal', desc: 'KRA Electronic Tax Invoice Management System — register devices and check submission status', url: 'https://etims.kra.go.ke', category: 'Tax & Compliance' },
  { name: 'Business Registration Service', desc: 'Company search, director verification, and registration certificates', url: 'https://brs.go.ke', category: 'Tax & Compliance' },
];

const CATEGORIES = [...new Set(RESOURCES.map((r) => r.category))];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Regulatory':     <Award className="h-5 w-5" />,
  'CPD & CLE':      <BookOpen className="h-5 w-5" />,
  'Law Reports':    <FileText className="h-5 w-5" />,
  'Legislation':    <Scale className="h-5 w-5" />,
  'Regional':       <Globe className="h-5 w-5" />,
  'Tax & Compliance': <Users className="h-5 w-5" />,
};

export default function ResourcesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Legal Resources</h1>
        <p className="text-sm text-gray-500 mt-1">
          Quick access to LSK CPD/CLE, Kenya Law Reports, legislation, and compliance portals — all in one place.
        </p>
      </div>

      {/* LSK CPD/CLE highlight */}
      <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #0D1F3C 0%, #1B3A6B 100%)' }}>
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,162,39,0.2)', border: '1px solid rgba(201,162,39,0.4)' }}>
            <BookOpen className="h-6 w-6" style={{ color: '#C9A227' }} />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg mb-1">LSK Continuing Professional Development</h2>
            <p className="text-white/70 text-sm mb-4">
              All practising advocates must complete CPD requirements to maintain their annual practising certificate. Check your current CPD points and register for upcoming CLE programmes directly on the LSK portal.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://lsk.or.ke/cpd"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all"
                style={{ background: '#C9A227', color: '#071529' }}
              >
                Check My CPD Points <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href="https://lsk.or.ke"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                LSK Portal <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Resources by category */}
      {CATEGORIES.map((category) => {
        const items = RESOURCES.filter((r) => r.category === category);
        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center text-primary-700" style={{ background: '#EEF2FA' }}>
                {CATEGORY_ICONS[category]}
              </div>
              <h2 className="font-semibold text-gray-900">{category}</h2>
              <span className="text-xs text-gray-400">({items.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((r) => (
                <a
                  key={r.name}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group card p-4 hover:shadow-md transition-all flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm text-gray-900 group-hover:text-primary-700 transition-colors leading-snug">
                      {r.name}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {r.badge && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: '#EEF2FA', color: '#1B3A6B' }}>
                          {r.badge}
                        </span>
                      )}
                      <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-primary-500 transition-colors" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{r.desc}</p>
                </a>
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">
        All links open in a new tab. Global Wakili is not affiliated with external websites. Always verify information directly with the relevant authority.
      </p>
    </div>
  );
}
