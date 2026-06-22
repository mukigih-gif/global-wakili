import Image from 'next/image';

/**
 * Presents a real product screenshot inside a browser-chrome frame.
 * Images live in /public/shots and are genuine screens from the running app
 * (ADR-011: real product, not mockups).
 */
export function BrowserFrame({ src, alt, url }: { src: string; alt: string; url: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden ring-1 ring-black/5">
      {/* Chrome bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-100 border-b border-gray-200">
        <span className="flex gap-1.5 flex-shrink-0">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
        </span>
        <div className="mx-auto max-w-sm w-full rounded-md bg-white border border-gray-200 px-3 py-1 text-center text-xs text-gray-500 truncate">
          {url}
        </div>
      </div>
      <Image src={src} alt={alt} width={1440} height={860} className="w-full h-auto" />
    </div>
  );
}
