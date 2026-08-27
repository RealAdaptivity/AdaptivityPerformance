import React from 'react';

interface AseLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const AseLogo: React.FC<AseLogoProps> = ({
  className = 'w-5 h-5',
  size,
  showText = false,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} style={style}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm flex-shrink-0"
        aria-label="ASE Certified"
      >
        <defs>
          <radialGradient id="aseBlueGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0066B3" />
            <stop offset="100%" stopColor="#002D5A" />
          </radialGradient>
        </defs>

        {/* Outer 12-tooth Cogwheel / Gear */}
        <path
          d="M45,4 L55,4 L56.5,12.5 Q60,13.5 63,15.5 L70.5,10.5 L78,17.5 L73.5,25.5 Q76,28.5 77.5,32 L86,33.5 L86,43.5 L77.5,45 Q76,48.5 73.5,51.5 L78,59.5 L70.5,66.5 L63,61.5 Q60,63.5 56.5,64.5 L55,73 L45,73 L43.5,64.5 Q40,63.5 37,61.5 L29.5,66.5 L22,59.5 L26.5,51.5 Q24,48.5 22.5,45 L14,43.5 L14,33.5 L22.5,32 Q24,28.5 26.5,25.5 L22,17.5 L29.5,10.5 L37,15.5 Q40,13.5 43.5,12.5 Z"
          transform="scale(1.22) translate(-9, -2)"
          fill="url(#aseBlueGrad)"
          stroke="#001A33"
          strokeWidth="1.5"
        />

        {/* Inner White Ring & Deep Blue Core */}
        <circle cx="50" cy="46" r="32" fill="#004A87" stroke="#ffffff" strokeWidth="2.5" />

        {/* Center ASE Lettering */}
        <text
          x="50"
          y="49"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="22"
          letterSpacing="1.5"
        >
          ASE
        </text>

        {/* CERTIFIED Bottom Banner */}
        <rect x="14" y="74" width="72" height="18" rx="4" fill="#002244" stroke="#ffffff" strokeWidth="1.5" />
        <text
          x="50"
          y="84"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="9.5"
          letterSpacing="2"
        >
          CERTIFIED
        </text>
      </svg>
      {showText && <span className="font-bold text-slate-200">ASE Certified Techs</span>}
    </span>
  );
};
