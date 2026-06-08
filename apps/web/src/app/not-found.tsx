import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="en-KE">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '4rem', fontWeight: 800, color: '#1B3A6B', lineHeight: 1 }}>404</div>
          <div style={{ fontSize: '1.125rem', color: '#6b7280', marginTop: '0.75rem', marginBottom: '1.5rem' }}>
            Page not found
          </div>
          <Link href="/app/dashboard" style={{ background: '#1B3A6B', color: 'white', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
            Go to Dashboard
          </Link>
        </div>
      </body>
    </html>
  );
}
