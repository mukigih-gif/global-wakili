'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Loader2 } from 'lucide-react';

// Public Web3Forms access key (designed to be client-side; only allows submitting
// to the email tied to the key). Set NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY in Vercel.
const ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;

type Status = 'idle' | 'sending' | 'success' | 'error';

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!ACCESS_KEY) {
      setStatus('error');
      setError('Our form isn\'t connected yet — please email us at wakili@globalsitesltd.com.');
      return;
    }
    setStatus('sending');
    setError('');
    const form = e.currentTarget;
    const data = new FormData(form);
    data.append('access_key', ACCESS_KEY);
    data.append('subject', 'New demo request — Global Wakili');
    data.append('from_name', 'Global Wakili Website');

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data,
      });
      const json = await res.json();
      if (json.success) {
        setStatus('success');
        form.reset();
      } else {
        setStatus('error');
        setError(json.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setError('Network error. Please try again, or email wakili@globalsitesltd.com.');
    }
  };

  if (status === 'success') {
    return (
      <div className="card p-8 shadow-xl flex flex-col items-center justify-center text-center gap-3 min-h-[420px]">
        <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle className="h-7 w-7 text-emerald-600" />
        </div>
        <h3 className="text-xl font-display font-bold text-gray-900">Thank you!</h3>
        <p className="text-sm text-gray-500 max-w-xs">
          Your demo request is in. Our team will be in touch within one business day at the email you provided.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-8 shadow-xl">
      <h3 className="text-xl font-display font-bold text-gray-900 mb-1">
        Book a 30-minute walkthrough
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        We'll show you the platform live. No slides, no recording — just the actual software and your actual questions.
      </p>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Honeypot spam trap (Web3Forms) */}
        <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">First Name *</label>
            <input name="first_name" type="text" className="form-input" placeholder="John" required />
          </div>
          <div>
            <label className="form-label">Last Name *</label>
            <input name="last_name" type="text" className="form-input" placeholder="Kamau" required />
          </div>
        </div>
        <div>
          <label className="form-label">Work Email *</label>
          <input name="email" type="email" className="form-input" placeholder="j.kamau@lawfirm.co.ke" required />
        </div>
        <div>
          <label className="form-label">Firm Name *</label>
          <input name="firm_name" type="text" className="form-input" placeholder="Kamau & Associates Advocates" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Phone Number</label>
            <input name="phone" type="tel" className="form-input" placeholder="+254 7XX XXX XXX" />
          </div>
          <div>
            <label className="form-label">Firm Size</label>
            <select name="firm_size" className="form-select">
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
          <select name="primary_interest" className="form-select">
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
          <textarea
            name="message"
            className="form-input min-h-[80px] resize-none"
            placeholder="Tell us about your firm and what you'd like to see in the demo…"
          />
        </div>

        {status === 'error' && (
          <p className="text-sm text-red-600" role="alert">{error}</p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="btn-primary w-full py-3.5 text-base rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {status === 'sending'
            ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending…</>
            : <>Book My Demo <ArrowRight className="h-5 w-5" /></>}
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
  );
}
