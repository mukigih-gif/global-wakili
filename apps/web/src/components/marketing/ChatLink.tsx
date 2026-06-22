'use client';

/** Footer "Chat with us" trigger — opens the ChatBolt widget via a window event. */
export function ChatLink({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('gw:open-chat'))}
      className={className}
    >
      Chat with us
    </button>
  );
}
