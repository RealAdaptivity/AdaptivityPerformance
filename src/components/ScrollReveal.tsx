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

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        if (once) observer.disconnect();
      },
      { threshold: 0.14, rootMargin: '0px 0px -6% 0px' }
    );

    observer.observe(el);
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
