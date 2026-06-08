'use client';

import Link from 'next/link';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-KE">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '400px' }}>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>500</div>
          <div style={{ fontSize: '1.125rem', color: '#6b7280', marginTop: '0.75rem', marginBottom: '1.5rem' }}>
            Something went wrong. Our team has been notified.
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={reset} style={{ background: '#1B3A6B', color: 'white', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
              Try Again
            </button>
            <Link href="/app/dashboard" style={{ background: 'white', color: '#374151', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
              Go Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
