import React from 'react';

type Props = {
  /** Absolute site path, e.g. `/brake-repair-justin-tx`. */
  href: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * Internal link for the local SEO pages. It must be a real anchor: a crawler
 * cannot follow an onClick handler, and the link graph between city and service
 * pages is what makes 96 of them discoverable in the first place.
 */
export const LocalLink: React.FC<Props> = ({ href, className, children }) => (
  <a
    href={href}
    className={className}
    onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      window.history.pushState({}, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }}
  >
    {children}
  </a>
);
