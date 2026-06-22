'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, ChevronDown } from 'lucide-react';

const QUICK_QUESTIONS = [
  'How does trust accounting work?',
  'Can clients pay via M-PESA?',
  'Is eTIMS integration included?',
  'What does implementation cost?',
];

const GREETING =
  "Hi there 👋 I'm here to help with any questions about Global Wakili — trust accounting, M-PESA & eTIMS billing, pricing, security, or getting set up. What would you like to know?";

type Msg = { role: 'bot' | 'user'; text: string };

/**
 * Knowledge base for the marketing assistant. Answers are grounded in the
 * landing-page FAQ and module copy so responses stay truthful. Unmatched
 * questions fall back to the demo form. (Upgrade path: swap getAnswer() for a
 * live Claude-backed endpoint once AI credentials are configured — see
 * FINDING-LANDING-002 / TODO-006.)
 */
const KB: { test: RegExp; answer: string }[] = [
  {
    test: /\b(hi|hello|hey|habari|sasa|niaje)\b/i,
    answer:
      'Hi! 👋 I can help with trust accounting, M-PESA & eTIMS billing, pricing, security, and getting set up. What would you like to know?',
  },
  {
    test: /trust|lsk|law society|reconcil|overdraw|client funds|commingl/i,
    answer:
      'Trust accounting is fully LSK-compliant: three-way reconciliation (bank vs trust ledger vs client ledger), automatic overdraw prevention on every client sub-account, and an immutable audit record for every transaction. Fund commingling is blocked at the architecture level.',
  },
  {
    test: /m-?pesa|mpesa|stk|\bpay\b|payment|collect|daraja/i,
    answer:
      'Clients can pay by M-PESA STK Push straight from the client portal or via SMS. When they confirm, we automatically record the receipt, post the journal entry, and update the invoice balance — no manual reconciliation.',
  },
  {
    test: /etims|kra|\btax\b|\bvat\b|\bwht\b|invoice|fiscal|control number/i,
    answer:
      'eTIMS is built in: when an invoice is issued or paid we submit it to KRA, retrieve the control number and QR code, stamp the PDF, and create the journal entry — all without leaving the platform. VAT and WHT are handled with double-entry enforcement.',
  },
  {
    test: /price|pricing|cost|how much|\bplan\b|\bfee\b|subscription|afford/i,
    answer:
      'Pricing (excl. VAT, 15% off on annual billing):\n• Basic — KES 15,000/mo, up to 10 users\n• Professional — KES 35,000/mo, up to 50 users (most popular)\n• Enterprise — custom, unlimited users + HR/Payroll & SLA\nImplementation and training are billed separately.',
  },
  {
    test: /implement|onboard|migrat|set ?up|how long|training|import|get started/i,
    answer:
      'A standard implementation takes 2–4 weeks (data migration, training, configuration); enterprise with custom integrations is 4–8 weeks. Our Nairobi-based team migrates your matters, clients, time entries, trust balances, and documents via Excel/CSV or API.',
  },
  {
    test: /secur|\bdata\b|privilege|\bsafe\b|isolation|encrypt|privacy|gdpr|breach|confidential/i,
    answer:
      'Your data is architecturally isolated from every other firm — 116 model-level tenant controls make cross-tenant access impossible by design. Everything is encrypted at rest (AES-256-GCM) and in transit (TLS 1.3), with a tamper-evident audit chain. We never use your data to train AI models.',
  },
  {
    test: /\bai\b|artificial|claude|contract review|legal research|document analysis/i,
    answer:
      'Our AI legal operations are governed and powered by Anthropic Claude — document and contract analysis, matter risk assessment, and legal research — all behind human-review gates with prompt-injection protection.',
  },
  {
    test: /demo|contact|talk|sales|\bcall\b|human|agent|\bbook\b|reach|speak/i,
    answer:
      "Happy to set that up — scroll to the “Schedule your personalised demo” form below and we'll walk you through the platform live. Our team replies within one business day.",
  },
  {
    test: /feature|module|what.*(do|offer)|capabilit|everything/i,
    answer:
      'Global Wakili is six integrated modules: legal practice management, trust accounting, finance & eTIMS, AI legal operations, client collaboration, and analytics & reporting. Ask me about any one of them!',
  },
];

const FALLBACK =
  'Great question! I can help with trust accounting, M-PESA & eTIMS billing, pricing, security, and implementation. For anything specific to your firm, the quickest route is to book a demo using the form below — our team replies within one business day.';

function getAnswer(input: string): string {
  const text = input.toLowerCase();
  return KB.find((entry) => entry.test.test(text))?.answer ?? FALLBACK;
}

export function ChatBolt() {
  const [open, setOpen]       = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Msg[]>([{ role: 'bot', text: GREETING }]);
  const [typing, setTyping]   = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the latest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing, open]);

  // Let other parts of the page (e.g. footer "Chat with us") open the widget.
  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener('gw:open-chat', openChat);
    return () => window.removeEventListener('gw:open-chat', openChat);
  }, []);

  const respond = (question: string) => {
    const q = question.trim();
    if (!q) return;
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setMessage('');
    setTyping(true);
    window.setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'bot', text: getAnswer(q) }]);
      setTyping(false);
    }, 550);
  };

  const showQuickChips = messages.length <= 1 && !typing;

  return (
    <div className="gw-chat-launcher fixed right-6 z-50 flex flex-col items-end gap-3 bottom-[calc(1.5rem+var(--gw-cookiebar-height,0px))]">
      {/* Chat panel */}
      {open && (
        <div className="w-[calc(100vw-3rem)] max-w-sm sm:w-96 max-h-[calc(100vh-7rem)] rounded-2xl shadow-2xl border border-gray-200 bg-white flex flex-col overflow-hidden animate-fade-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-700 to-primary-900 px-5 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">GW</div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-primary-800" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Global Wakili Assistant</p>
                <p className="text-primary-300 text-xs">Answers instantly · online</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition-colors" aria-label="Close chat">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Message thread */}
          <div className="flex-1 overflow-y-auto p-5 bg-gray-50 min-h-[240px]">
            {messages.map((m, i) =>
              m.role === 'bot' ? (
                <div key={i} className="flex gap-3 mb-4">
                  <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-primary-700 text-xs font-bold mt-0.5">G</div>
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm text-sm text-gray-700 max-w-[85%] whitespace-pre-line">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-end mb-4">
                  <div className="bg-primary-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm text-sm max-w-[85%] whitespace-pre-line">
                    {m.text}
                  </div>
                </div>
              ),
            )}

            {/* Typing indicator */}
            {typing && (
              <div className="flex gap-3 mb-4">
                <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-primary-700 text-xs font-bold mt-0.5">G</div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce" />
                  </span>
                </div>
              </div>
            )}

            {/* Quick reply chips (only at the start of a conversation) */}
            {showQuickChips && (
              <>
                <p className="text-xs text-gray-400 mb-2 ml-10">Common questions:</p>
                <div className="ml-10 flex flex-wrap gap-2">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => respond(q)}
                      className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:border-primary-400 hover:text-primary-700 transition-colors shadow-sm text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-4 bg-white flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && respond(message)}
                placeholder="Type your question…"
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/30 placeholder-gray-400"
              />
              <button
                onClick={() => respond(message)}
                disabled={!message.trim()}
                className="h-10 w-10 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-center text-gray-400 mt-2">
              Instant answers on common topics · for tailored advice, book a demo below.
            </p>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="group relative flex items-center gap-3 rounded-full shadow-2xl shadow-primary-900/30 overflow-hidden transition-all duration-300"
        aria-label="Chat with us"
      >
        {!open && (
          <span className="bg-primary-600 text-white text-sm font-semibold pl-5 pr-2 py-4 hidden sm:block">
            Chat with us
          </span>
        )}
        <div className={`h-14 w-14 flex items-center justify-center transition-all duration-300 flex-shrink-0 ${open ? 'bg-gray-600 rounded-full' : 'bg-primary-600 rounded-full sm:rounded-l-none'}`}>
          {open
            ? <ChevronDown className="h-5 w-5 text-white" />
            : <MessageCircle className="h-6 w-6 text-white" />
          }
        </div>
        {/* Pulse indicator */}
        {!open && (
          <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
        )}
      </button>
    </div>
  );
}
