import React from 'react';

interface OrbiaLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
  watermark?: boolean;
}

export const OrbiaLogo: React.FC<OrbiaLogoProps> = ({
  size = 28,
  className = '',
  animated = false,
  watermark = false
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? 'orbia-logo-animated' : ''} ${
        watermark ? 'orbia-logo-watermark' : ''
      }`}
    >
      <defs>
        <radialGradient id="orbiaCoreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f97316" stopOpacity={watermark ? '0.28' : '0.75'} />
          <stop offset="50%" stopColor="#ea580c" stopOpacity={watermark ? '0.08' : '0.25'} />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="orbiaRing1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#7c2d12" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="orbiaRing2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="60%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#431407" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="orbiaMonolith" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fff7ed" />
          <stop offset="38%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#9a3412" />
        </linearGradient>
      </defs>

      {/* Ambient Core Aura */}
      <circle cx="60" cy="60" r="54" fill="url(#orbiaCoreGlow)" />

      {/* Outer Precision Ring */}
      <circle
        cx="60"
        cy="60"
        r="46"
        stroke="url(#orbiaRing1)"
        strokeWidth="1.5"
        strokeDasharray="16 8 4 8"
        opacity={watermark ? '0.25' : '0.65'}
        className="orbia-outer-track"
      />

      {/* Orbital mark */}
      <ellipse
        cx="60"
        cy="60"
        rx="45"
        ry="17"
        transform="rotate(-32 60 60)"
        stroke="url(#orbiaRing1)"
        strokeWidth="2.8"
        strokeLinecap="round"
        opacity={watermark ? '0.32' : '0.95'}
      />
      <ellipse
        cx="60"
        cy="60"
        rx="45"
        ry="17"
        transform="rotate(32 60 60)"
        stroke="url(#orbiaRing2)"
        strokeWidth="2.2"
        strokeDasharray="58 18"
        strokeLinecap="round"
        opacity={watermark ? '0.25' : '0.85'}
      />

      {/* Catalyst Arch / Singularity Spire */}
      <path
        d="M60 18 C63.5 43, 73 53, 96 60 C73 67, 63.5 77, 60 102 C56.5 77, 47 67, 24 60 C47 53, 56.5 43, 60 18 Z"
        fill="url(#orbiaMonolith)"
        opacity={watermark ? '0.22' : '1'}
      />

      {/* Inner Void Eye */}
      <circle
        cx="60"
        cy="60"
        r="6.5"
        fill="#0d0c0b"
        stroke="#fed7aa"
        strokeWidth="1.8"
        opacity={watermark ? '0.4' : '1'}
      />

      {/* Orbital Satellite Nodes */}
      <circle cx="22" cy="38" r="3" fill="#fed7aa" opacity={watermark ? '0.3' : '0.95'} />
      <circle cx="98" cy="82" r="2.6" fill="#fb923c" opacity={watermark ? '0.3' : '0.9'} />
    </svg>
  );
};
