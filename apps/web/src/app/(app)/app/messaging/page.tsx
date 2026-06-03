'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Send, Plus, Users } from 'lucide-react';

type Thread = {
  id: string;
  subject: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  participants: Array<{ id: string; name: string }>;
};

type Message = {
  id: string;
  body: string;
  sender: { id: string; name: string };
  createdAt: string;
};

export default function MessagingPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<{ data: Thread[] }>('/messaging/threads')
      .then((r) => setThreads(r.data ?? []))
      .catch(() => setThreads([]))
      .finally(() => setLoadingThreads(false));
  }, []);

  useEffect(() => {
    if (!activeThread) return;
    setLoadingMessages(true);
    api.get<{ data: Message[] }>(`/messaging/threads/${activeThread.id}/messages`)
      .then((r) => setMessages(r.data ?? []))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false));
  }, [activeThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!body.trim() || !activeThread || sending) return;
    setSending(true);
    try {
      const msg = await api.post<Message>(`/messaging/threads/${activeThread.id}/messages`, { body });
      setMessages((prev) => [...prev, msg]);
      setBody('');
    } catch {
      // message failed silently — user can retry
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Thread list */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Messages</h2>
          <button className="text-gray-400 hover:text-primary-600 transition-colors" title="New thread">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loadingThreads ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Loading…</div>
          ) : !threads.length ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No conversations yet</div>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveThread(t)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${activeThread?.id === t.id ? 'bg-primary-50 border-l-2 border-primary-500' : ''}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <p className={`text-sm truncate ${t.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {t.subject}
                  </p>
                  {t.unreadCount > 0 && (
                    <span className="ml-2 flex-shrink-0 h-5 w-5 rounded-full bg-primary-600 text-white text-[10px] flex items-center justify-center font-bold">
                      {t.unreadCount}
                    </span>
                  )}
                </div>
                {t.lastMessage && (
                  <p className="text-xs text-gray-400 truncate">{t.lastMessage}</p>
                )}
                {t.lastMessageAt && (
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(t.lastMessageAt)}</p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message pane */}
      {!activeThread ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a conversation to view messages</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Thread header */}
          <div className="border-b border-gray-100 px-5 py-3">
            <p className="font-semibold text-gray-900 text-sm">{activeThread.subject}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeThread.participants.map((p) => p.name).join(', ')}
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {loadingMessages ? (
              <div className="text-center text-sm text-gray-400 py-8">Loading messages…</div>
            ) : !messages.length ? (
              <div className="text-center text-sm text-gray-400 py-8">No messages yet. Start the conversation.</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="flex gap-3">
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center mt-0.5">
                    {m.sender.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-900">{m.sender.name}</span>
                      <span className="text-xs text-gray-400">{formatDate(m.createdAt)}</span>
                    </div>
                    <div className="rounded-xl rounded-tl-sm bg-gray-100 px-3.5 py-2.5 text-sm text-gray-800 inline-block max-w-lg">
                      {m.body}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Compose */}
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Type a message…"
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/30"
              />
              <button
                onClick={sendMessage}
                disabled={!body.trim() || sending}
                className="h-10 w-10 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
