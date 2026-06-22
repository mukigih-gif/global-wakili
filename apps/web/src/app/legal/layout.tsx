import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { ArrowLeft, Mail } from 'lucide-react';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header — logo + back to main site */}
      <header className="border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Logo variant="full" size="md" href="/" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-primary-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to main site
          </Link>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      {/* Footer — logo, email, copyright */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© {year > 2026 ? `2026–${year}` : '2026'} Global Wakili — a product of Global Sites Limited.</p>
          <a
            href="mailto:wakili@globalsitesltd.com"
            className="inline-flex items-center gap-1.5 hover:text-primary-700 transition-colors"
          >
            <Mail className="h-4 w-4" /> wakili@globalsitesltd.com
          </a>
        </div>
      </footer>
    </div>
  );
}
