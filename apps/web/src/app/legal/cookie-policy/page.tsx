import Link from 'next/link';

export const metadata = {
  title: 'Cookie Policy — Global Wakili Legal Enterprise',
};

export default function CookiePolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 prose prose-gray prose-sm">
      <h1>Cookie Policy</h1>
      <p className="text-gray-500">Last updated: June 2026</p>

      <p>
        This Cookie Policy explains how Global Wakili (a product of Global Sites Limited) uses
        cookies and similar technologies on our website and platform. It should be read alongside
        our <Link href="/legal/privacy">Privacy Policy</Link>. Our use of cookies complies with the
        Kenya Data Protection Act 2019 and the GDPR.
      </p>

      <h2>1. What are cookies?</h2>
      <p>
        Cookies are small text files stored on your device when you visit a website. They help the
        site function, remember your preferences, and let us understand how the site is used.
      </p>

      <h2>2. Categories we use</h2>
      <ul>
        <li>
          <strong>Strictly necessary</strong> — required for authentication, security, and session
          management. These cannot be disabled.
        </li>
        <li>
          <strong>Functional</strong> — remember your preferences, UI settings, and workspace state.
        </li>
        <li>
          <strong>Analytics</strong> — aggregate usage metrics (e.g. Google Analytics 4 / Google Tag
          Manager) to help us improve the platform. Loaded only after you opt in.
        </li>
        <li>
          <strong>Marketing</strong> — platform improvement and feature announcements. No third-party
          advertising. Loaded only after you opt in.
        </li>
      </ul>

      <h2>3. Managing your consent</h2>
      <p>
        On your first visit, a consent banner lets you Accept All, Reject Non-Essential, or choose
        categories under “Manage Preferences.” Analytics and marketing cookies load only after you
        opt in. You can change your choice at any time by clearing the <code>gw_cookie_consent</code>{' '}
        entry in your browser storage, which re-displays the banner.
      </p>

      <h2>4. Third-party cookies</h2>
      <p>
        With your analytics consent, we may use Google Analytics 4 and Google Tag Manager. These
        providers set their own cookies subject to their respective policies. We never sell your
        data, and we do not use your data to train AI models.
      </p>

      <h2>5. Contact</h2>
      <p>
        Questions about this policy? Email{' '}
        <a href="mailto:wakili@globalsitesltd.com">wakili@globalsitesltd.com</a>.
      </p>
    </main>
  );
}
