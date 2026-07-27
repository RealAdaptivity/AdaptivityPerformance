import React from 'react';
import { customerAppLinks } from '../config/customerAppLinks';

interface StoreBadgeLinksProps {
  className?: string;
  size?: 'sm' | 'md';
}

export const StoreBadgeLinks: React.FC<StoreBadgeLinksProps> = ({
  className = '',
  size = 'md',
}) => {
  const height = size === 'sm' ? 'h-10' : 'h-11';
  const textMain = size === 'sm' ? 'text-[11px]' : 'text-xs';
  const textSub = size === 'sm' ? 'text-[9px]' : 'text-[10px]';

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <a
        href={customerAppLinks.appStore}
        aria-label="Download on the App Store"
        className={`inline-flex items-center gap-2.5 ${height} px-4 rounded-xl bg-black border border-white/20 hover:border-white/40 hover:bg-black/90 transition-colors`}
      >
        <AppleLogo className="w-5 h-5 text-white shrink-0" />
        <span className="flex flex-col leading-none text-left">
          <span className={`${textSub} text-slate-300`}>Download on the</span>
          <span className={`${textMain} font-semibold text-white`}>App Store</span>
        </span>
      </a>

      <a
        href={customerAppLinks.playStore}
        aria-label="Get it on Google Play"
        className={`inline-flex items-center gap-2.5 ${height} px-4 rounded-xl bg-black border border-white/20 hover:border-white/40 hover:bg-black/90 transition-colors`}
      >
        <GooglePlayLogo className="w-5 h-5 shrink-0" />
        <span className="flex flex-col leading-none text-left">
          <span className={`${textSub} text-slate-300`}>Get it on</span>
          <span className={`${textMain} font-semibold text-white`}>Google Play</span>
        </span>
      </a>
    </div>
  );
};

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function GooglePlayLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M3 20.5V3.5c0-.59.34-1.11.84-1.35L13.69 12 3.84 21.85c-.5-.24-.84-.76-.84-1.35z" />
      <path fill="#FBBC04" d="M16.81 15.12 6.05 21.34l8.49-8.49 2.27 2.27z" />
      <path fill="#4285F4" d="M20.16 10.81c.34.27.59.69.59 1.19s-.25.92-.59 1.19l-2.27 1.32-2.5-2.5 2.5-2.5 2.27 1.32z" />
      <path fill="#34A853" d="M6.05 2.66l10.76 6.22-2.27 2.27L6.05 2.66z" />
    </svg>
  );
}
