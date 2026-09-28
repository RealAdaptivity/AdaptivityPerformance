import React, { useEffect, useRef, useState } from 'react';

type Variant = 'up' | 'fade' | 'left' | 'scale';

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay after the element enters the viewport */
  delayMs?: number;
  variant?: Variant;
  /** Animate only the first time it enters view (default true) */
  once?: boolean;
};

/**
 * Scroll-triggered entrance animation. Uses IntersectionObserver + CSS
 * so we stay dependency-free and respect prefers-reduced-motion.
 */
export const ScrollReveal: React.FC<Props> = ({
  children,
  className = '',
  delayMs = 0,
  variant = 'up',
  once = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    /* threshold must stay 0.
       It was 0.14, meaning the callback only fired once 14% of the element was
       inside the root. rootMargin shrinks an 844px phone viewport to about
       793px, so any block taller than 793 / 0.14 ≈ 5,660px could never reach
       that ratio — the observer never fired, is-visible was never added, and
       the content sat at opacity 0 for good. /privacy (6060px), /terms
       (7578px) and /join (8773px) were blank pages in production because of
       it, and /about (4612px) stayed blank until you scrolled.
       With 0, any sliver entering the root reveals the block, and rootMargin
       alone gives the stagger. */
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    let observer: IntersectionObserver;
    try {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          setVisible(true);
          if (once) observer.disconnect();
        },
        { threshold: 0, rootMargin: '0px 0px -6% 0px' }
      );
      observer.observe(el);
    } catch {
      /* Never leave content invisible because the animation failed. */
      setVisible(true);
      return;
    }

    return () => observer.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      className={`scroll-reveal scroll-reveal--${variant}${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
};
