'use client';

import { useState } from 'react';
import { MessageCircle, X, Send, ChevronDown } from 'lucide-react';

const QUICK_QUESTIONS = [
  'How does trust accounting work?',
  'Can clients pay via M-PESA?',
  'Is eTIMS integration included?',
  'What does implementation cost?',
];

export function ChatBolt() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!message.trim()) return;
    setSent(true);
    setMessage('');
  };

  const handleQuick = (q: string) => {
    setMessage(q);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div className="w-80 sm:w-96 rounded-2xl shadow-2xl border border-gray-200 bg-white flex flex-col overflow-hidden animate-fade-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-700 to-primary-900 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">GW</div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-primary-800" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Global Wakili Support</p>
                <p className="text-primary-300 text-xs">Usually replies in a few minutes</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-5 bg-gray-50 min-h-[200px]">
            {!sent ? (
              <>
                {/* Bot opening message */}
                <div className="flex gap-3 mb-4">
                  <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-primary-700 text-xs font-bold mt-0.5">G</div>
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm text-sm text-gray-700 max-w-[85%]">
                    Hi there 👋 I'm here to help with any questions about Global Wakili — pricing, compliance, how it works for your firm, anything at all.
                  </div>
                </div>
                {/* Quick reply chips */}
                <p className="text-xs text-gray-400 mb-2 ml-10">Common questions:</p>
                <div className="ml-10 flex flex-wrap gap-2">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQuick(q)}
                      className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:border-primary-400 hover:text-primary-700 transition-colors shadow-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-6">
                <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <MessageCircle className="h-7 w-7 text-emerald-600" />
                </div>
                <p className="font-semibold text-gray-900 text-sm">Message received!</p>
                <p className="text-xs text-gray-500 max-w-[200px]">
                  Our team will reply to your email within one business day. You can also call us on +254 700 000 000.
                </p>
              </div>
            )}
          </div>

          {/* Input */}
          {!sent && (
            <div className="border-t border-gray-100 p-4 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type your question…"
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/30 placeholder-gray-400"
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim()}
                  className="h-10 w-10 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="group flex items-center gap-3 rounded-full shadow-2xl shadow-primary-900/30 overflow-hidden transition-all duration-300"
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
