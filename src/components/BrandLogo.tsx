import React from 'react';

type BrandLogoProps = {
  className?: string;
  size?: number;
  /** Show wordmark next to the mark */
  withWordmark?: boolean;
  wordmarkClassName?: string;
};

/** Orange/black Adaptivity mark. PNG only: there is no faithful SVG of the logo. */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 40,
  withWordmark = false,
  wordmarkClassName = '',
}) => {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  return (
    <span className={`inline-flex items-center gap-3 min-w-0 max-w-full ${className}`}>
      <img
        src={`${base}logo-ui.png`}
        alt="Adaptivity Performance"
        width={size}
        height={size}
        className="rounded-xl shadow-lg shadow-orange-500/20 flex-shrink-0 object-cover bg-[#0b0c10]"
        decoding="async"
      />
      {withWordmark ? (
        <span className={`min-w-0 ${wordmarkClassName}`}>
          {/* Stacked on phones, one line from sm up. As a single line it needs
              ~250px, which a phone header does not have once the Book button
              and menu are beside it — it used to run underneath the button.
              `truncate` is on each word because on the flex row it never
              applied: flex items are not text, so nothing was ever clipped
              or ellipsed, it just overflowed. */}
          <span className="font-heading font-extrabold tracking-tight text-white flex flex-col leading-[1.05] text-[15px] min-[380px]:text-base sm:flex-row sm:items-center sm:gap-1.5 sm:text-xl sm:leading-tight">
            <span className="truncate">ADAPTIVITY</span>
            <span className="truncate text-orange-500">PERFORMANCE</span>
          </span>
          <span className="text-[10px] tracking-widest text-slate-400 uppercase font-semibold hidden sm:block">
            Mobile & Shop Automotive Specialist
          </span>
        </span>
      ) : null}
    </span>
  );
};
