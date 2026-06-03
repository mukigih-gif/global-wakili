'use client';

import Image from 'next/image';
import Link from 'next/link';

type Props = {
  variant?: 'icon' | 'full';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  className?: string;
  darkBg?: boolean; // true = white text (for dark navy backgrounds)
};

const iconSizes = { sm: 28, md: 36, lg: 48 };
const textSizes = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' };
const subSizes  = { sm: 'text-[9px]', md: 'text-[10px]', lg: 'text-xs' };

export function Logo({ variant = 'icon', size = 'md', href = '/', className = '', darkBg = false }: Props) {
  const px = iconSizes[size];

  const inner = (
    <span className={`flex items-center gap-2.5 group select-none ${className}`}>
      {/* Globe icon mark */}
      <span className="flex-shrink-0 rounded-xl overflow-hidden" style={{ width: px, height: px }}>
        <Image
          src="/logo-icon.png"
          alt="Global Wakili"
          width={px}
          height={px}
          className="object-contain w-full h-full"
          priority
        />
      </span>

      {/* Wordmark */}
      {variant !== 'icon' && (
        <span className="flex flex-col leading-none">
          <span className={`font-display font-bold tracking-tight ${textSizes[size]} ${darkBg ? 'text-white' : 'text-primary-800'}`}>
            Global Wakili
          </span>
          <span className={`font-semibold uppercase tracking-widest ${subSizes[size]} ${darkBg ? 'text-white/50' : 'text-gray-400'} mt-0.5`}>
            Legal Enterprise
          </span>
        </span>
      )}
    </span>
  );

  return href ? (
    <Link href={href} className="outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg">
      {inner}
    </Link>
  ) : inner;
}
