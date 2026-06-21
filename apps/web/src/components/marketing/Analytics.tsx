'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

// Set these in Vercel (Project → Settings → Environment Variables):
//   NEXT_PUBLIC_GA_ID   = G-XXXXXXXXXX   (GA4 Measurement ID)
//   NEXT_PUBLIC_GTM_ID  = GTM-XXXXXXX    (Google Tag Manager container)
const GA_ID  = process.env.NEXT_PUBLIC_GA_ID;
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const STORAGE_KEY = 'gw_cookie_consent';

/**
 * Loads GA4 / GTM ONLY after the visitor grants "analytics" cookie consent
 * (Kenya Data Protection Act 2019 / GDPR). Listens for the `gw:consent` event
 * dispatched by CookieConsent, and re-checks stored consent on mount.
 * Renders nothing until consent is granted and an ID is configured.
 */
export function Analytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const readConsent = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setAllowed(!!JSON.parse(stored).analytics);
      } catch { /* ignore */ }
    };
    readConsent();
    const onConsent = (e: Event) => setAllowed(!!(e as CustomEvent).detail?.analytics);
    window.addEventListener('gw:consent', onConsent);
    return () => window.removeEventListener('gw:consent', onConsent);
  }, []);

  if (!allowed) return null;

  return (
    <>
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      )}
      {GTM_ID && (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      )}
    </>
  );
}
