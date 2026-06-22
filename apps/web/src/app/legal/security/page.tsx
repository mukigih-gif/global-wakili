export const metadata = {
  title: 'Security — Global Wakili Legal Enterprise',
};

export default function SecurityPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 prose prose-gray prose-sm">
      <h1>Security</h1>
      <p className="text-gray-500">How we protect your firm’s data and your clients’ privilege.</p>

      <p>
        Global Wakili is built for the confidentiality demands of legal practice. Security is
        designed into the architecture — not bolted on afterwards.
      </p>

      <h2>Tenant isolation</h2>
      <p>
        Every firm’s data is architecturally separated from every other firm. Tenant filtering is
        enforced at the database layer across 116 data models, making cross-tenant access impossible
        by design rather than by policy.
      </p>

      <h2>Encryption</h2>
      <ul>
        <li>Data at rest encrypted with <strong>AES-256-GCM</strong>.</li>
        <li>Data in transit protected with <strong>TLS 1.3</strong>.</li>
      </ul>

      <h2>Tamper-evident audit trail</h2>
      <p>
        Critical actions generate immutable audit records secured with a <strong>SHA-256 hash
        chain</strong>, so the audit log cannot be silently altered.
      </p>

      <h2>Access control</h2>
      <p>
        Role-based access control (RBAC) with 400+ granular permissions governs who can see and do
        what. Trust accounting enforces three-way reconciliation and overdraw prevention.
      </p>

      <h2>AI safeguards</h2>
      <p>
        AI features run behind human-review gates with prompt-injection protection. Sensitive fields
        are redacted before any external API call, and we never use your data to train models.
      </p>

      <h2>Infrastructure &amp; privilege</h2>
      <p>
        Data is hosted on geo-redundant Neon Postgres. Attorney-client privilege is protected at
        every layer, consistent with the Kenya Data Protection Act 2019 and ISO 27001-aligned
        practices.
      </p>

      <h2>Reporting a vulnerability</h2>
      <p>
        If you believe you’ve found a security issue, please email{' '}
        <a href="mailto:wakili@globalsitesltd.com">wakili@globalsitesltd.com</a>. We appreciate
        responsible disclosure.
      </p>
    </main>
  );
}
