import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Global Wakili Legal Enterprise',
  description: 'Enterprise Legal ERP — Practice Management, Trust Accounting, AI Operations',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
