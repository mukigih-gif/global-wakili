import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Mail, Phone, MapPin, Globe } from 'lucide-react';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header — Global Sites Limited brand + back to main site */}
      <header className="border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <a
            href="https://globalsitesltd.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 select-none"
            aria-label="Global Sites Limited"
          >
            <span className="flex-shrink-0 rounded-xl overflow-hidden" style={{ width: 36, height: 36 }}>
              <Image
                src="/logo-icon.png"
                alt="Global Sites Limited"
                width={36}
                height={36}
                className="object-contain w-full h-full"
                priority
              />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display font-bold tracking-tight text-base text-primary-800">
                Global Sites Limited
              </span>
              <span className="font-semibold uppercase tracking-widest text-[10px] text-gray-400 mt-0.5">
                Global Wakili · Legal Enterprise
              </span>
            </span>
          </a>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-primary-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to main site
          </Link>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      {/* Footer — Global Sites Limited contact details */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8 text-sm text-gray-500">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div>
              <p className="font-semibold text-gray-700">Global Sites Limited</p>
              <p className="mt-1">Global Wakili Legal Enterprise</p>
            </div>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0" /> Upper Hill, Nairobi, Kenya
              </li>
              <li>
                <a
                  href="tel:+254724178878"
                  className="flex items-center gap-2 hover:text-primary-700 transition-colors"
                >
                  <Phone className="h-4 w-4 flex-shrink-0" /> +(254) 724 178 878
                </a>
              </li>
              <li>
                <a
                  href="mailto:wakili@globalsitesltd.com"
                  className="flex items-center gap-2 hover:text-primary-700 transition-colors"
                >
                  <Mail className="h-4 w-4 flex-shrink-0" /> wakili@globalsitesltd.com
                </a>
              </li>
              <li>
                <a
                  href="https://globalsitesltd.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-primary-700 transition-colors"
                >
                  <Globe className="h-4 w-4 flex-shrink-0" /> globalsitesltd.com
                </a>
              </li>
            </ul>
          </div>
          <p className="mt-6 pt-6 border-t border-gray-100 text-xs text-gray-400">
            © {year > 2026 ? `2026–${year}` : '2026'} Global Sites Limited. All rights reserved.
            Global Wakili is a product of Global Sites Limited.
          </p>
        </div>
      </footer>
    </div>
  );
}
