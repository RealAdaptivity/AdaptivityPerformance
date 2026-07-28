import React from 'react';
import { navigateSite, sitePath, type SitePage } from './siteRoute';

type Props = {
  to: SitePage;
  hash?: string;
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
};

/** SPA link for marketing pages (pushState, no full reload). */
export const SiteLink: React.FC<Props> = ({ to, hash, className, children, onNavigate }) => (
  <a
    href={sitePath(to, hash)}
    className={className}
    onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      navigateSite(to, { hash });
      onNavigate?.();
    }}
  >
    {children}
  </a>
);
