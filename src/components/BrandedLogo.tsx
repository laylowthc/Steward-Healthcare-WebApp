import React, { useId } from 'react';

interface BrandedLogoProps {
  layout?: 'horizontal' | 'vertical' | 'iconOnly';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  inverse?: boolean; // dynamic inversion of dark-mode elements to white
}

export default function BrandedLogo({
  layout = 'horizontal',
  size = 'md',
  className = '',
  inverse = false
}: BrandedLogoProps) {
  // Generate unique gradient IDs for this instance to prevent collisions
  // when some instances are hidden (e.g. display: none in responsive views)
  const idElement = useId();
  const safeId = idElement.replace(/[^a-zA-Z0-9]/g, '');
  const leftGradId = `indigoPurpleGrad-${safeId}`;
  const rightGradId = `purplePinkGrad-${safeId}`;

  // SVG dimensional scaling
  const sizeMap = {
    xs: { logo: 'w-6 h-6', title: 'text-[11px]', sub: 'text-[9px]', tag: 'text-[7px]' },
    sm: { logo: 'w-10 h-10', title: 'text-[13px]', sub: 'text-[11px]', tag: 'text-[9px]' },
    md: { logo: 'w-14 h-14', title: 'text-base', sub: 'text-sm', tag: 'text-xs' },
    lg: { logo: 'w-20 h-20', title: 'text-xl', sub: 'text-lg', tag: 'text-sm' },
    xl: { logo: 'w-28 h-28', title: 'text-3xl', sub: 'text-2xl', tag: 'text-base' }
  };

  const dimensions = sizeMap[size] || sizeMap.md;

  const logoSvg = (
    <svg 
      className={`${dimensions.logo} shrink-0`} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      id={`steward-healthcare-vector-logo-${safeId}`}
    >
      <defs>
        {/* Left Gradient: Royal Indigo-Blue to Amethyst Purple */}
        <linearGradient id={leftGradId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3F51B5" />
          <stop offset="50%" stopColor="#5E35B1" />
          <stop offset="100%" stopColor="#8E24AA" />
        </linearGradient>
        {/* Right Gradient: Deep Purple to Magenta / Bright Hot Pink */}
        <linearGradient id={rightGradId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8E24AA" />
          <stop offset="60%" stopColor="#D81B60" />
          <stop offset="100%" stopColor="#E91E63" />
        </linearGradient>
      </defs>

      {/* Left Interlocking 'S' Loop */}
      <path 
        d="M 52 28 C 34 28 20 38 20 50 C 20 62 34 72 52 72 C 60 72 58 63 48 63 C 38 63 30 57 30 50 C 30 43 38 37 48 37 C 58 37 52 28 52 28 Z" 
        fill={`url(#${leftGradId})`} 
      />
      
      {/* Right Interlocking 'S' Loop (Overlapped perfectly in center boundary) */}
      <path 
        d="M 48 28 C 66 28 80 38 80 50 C 80 62 66 72 48 72 C 40 72 42 63 52 63 C 62 63 70 57 70 50 C 70 43 62 37 52 37 C 42 37 48 28 48 28 Z" 
        fill={`url(#${rightGradId})`} 
      />

      {/* Glowing joint core */}
      <circle cx="50" cy="50" r="3.5" fill="#C2185B" className="animate-pulse" />
    </svg>
  );

  if (layout === 'iconOnly') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {logoSvg}
      </div>
    );
  }

  const textColor = inverse ? 'text-white' : 'text-[#3c1b40]';
  const subtitleColor = inverse ? 'text-slate-200' : 'text-[#3c1b40]';
  const taglineColor = inverse ? 'text-pink-300' : 'text-[#be185d]';

  return (
    <div 
      className={`inline-flex ${
        layout === 'vertical' ? 'flex-col items-center text-center' : 'flex-row items-center text-left'
      } gap-3 ${className}`}
      id="branded-steward-shield"
    >
      {logoSvg}

      <div className="flex flex-col select-none">
        <span className={`${dimensions.title} font-black tracking-tight leading-none ${textColor}`}>
          Steward Health Care
        </span>
        <span className={`${dimensions.sub} font-extrabold tracking-tight leading-tighter mt-0.5 ${subtitleColor}`}>
          247 Professionals
        </span>
        <span className={`${dimensions.tag} font-bold uppercase tracking-wider mt-0.5 ${taglineColor}`}>
          Redefining Care
        </span>
      </div>
    </div>
  );
}
