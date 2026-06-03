'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function ContactForm() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to backend contact/demo booking API
    alert('Thank you! Our team will be in touch within one business day.');
  };

  return (
    <div className="card p-8 shadow-xl">
      <h3 className="text-xl font-display font-bold text-gray-900 mb-1">
        Book a 30-minute walkthrough
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        We'll show you the platform live. No slides, no recording — just the actual software and your actual questions.
      </p>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">First Name *</label>
            <input type="text" className="form-input" placeholder="John" required />
          </div>
          <div>
            <label className="form-label">Last Name *</label>
            <input type="text" className="form-input" placeholder="Kamau" required />
          </div>
        </div>
        <div>
          <label className="form-label">Work Email *</label>
          <input type="email" className="form-input" placeholder="j.kamau@lawfirm.co.ke" required />
        </div>
        <div>
          <label className="form-label">Firm Name *</label>
          <input type="text" className="form-input" placeholder="Kamau & Associates Advocates" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Phone Number</label>
            <input type="tel" className="form-input" placeholder="+254 7XX XXX XXX" />
          </div>
          <div>
            <label className="form-label">Firm Size</label>
            <select className="form-select">
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
          <select className="form-select">
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
            className="form-input min-h-[80px] resize-none"
            placeholder="Tell us about your firm and what you'd like to see in the demo…"
          />
        </div>
        <button type="submit" className="btn-primary w-full py-3.5 text-base rounded-xl flex items-center justify-center gap-2">
          Book My Demo <ArrowRight className="h-5 w-5" />
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
