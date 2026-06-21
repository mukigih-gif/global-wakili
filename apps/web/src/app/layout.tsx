import type { Metadata } from 'next';
import './globals.css';
import { ChatBolt } from '@/components/chat/ChatBolt';
import { CookieConsent } from '@/components/ui/CookieConsent';

export const metadata: Metadata = {
  title: { default: 'Global Wakili Legal Enterprise', template: '%s | Global Wakili' },
  description: 'Kenya\'s premier enterprise legal ERP — Practice Management, Trust Accounting, AI Legal Operations, KRA eTIMS & M-PESA.',
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-KE" suppressHydrationWarning>
      <body>
        {children}
        <ChatBolt />
        <CookieConsent />
      </body>
    </html>
  );
}
