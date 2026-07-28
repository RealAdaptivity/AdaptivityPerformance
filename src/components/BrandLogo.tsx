import React from 'react';

type BrandLogoProps = {
  className?: string;
  size?: number;
  /** Show wordmark next to the mark */
  withWordmark?: boolean;
  wordmarkClassName?: string;
};

/** Orange/black Adaptivity mark — PNG for brand fidelity; SVG also in /public for favicon. */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 40,
  withWordmark = false,
  wordmarkClassName = '',
}) => {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  return (
    <span className={`inline-flex items-center gap-3 min-w-0 ${className}`}>
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
          <span className="font-heading font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5 truncate">
            ADAPTIVITY <span className="text-orange-500">PERFORMANCE</span>
          </span>
          <span className="text-[10px] tracking-widest text-slate-400 uppercase font-semibold hidden sm:block">
            Mobile & Shop Automotive Specialist
          </span>
        </span>
      ) : null}
    </span>
  );
};
