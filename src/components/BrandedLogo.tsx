import React from 'react';

interface BrandedLogoProps {
  layout?: 'horizontal' | 'vertical' | 'iconOnly';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  inverse?: boolean;
}

const fullLogoSizes = {
  xs: 'w-[120px]',
  sm: 'w-[190px]',
  md: 'w-[230px]',
  lg: 'w-[300px]',
  xl: 'w-[360px]'
};

const iconSizes = {
  xs: 'w-6',
  sm: 'w-10',
  md: 'w-14',
  lg: 'w-20',
  xl: 'w-28'
};

/** Single application-wide source for the official SHC brand artwork. */
export default function BrandedLogo({
  layout = 'horizontal',
  size = 'md',
  className = '',
  inverse = false
}: BrandedLogoProps) {
  const iconOnly = layout === 'iconOnly';
  const source = iconOnly ? '/assets/shc-icon.png' : '/assets/shc-logo.png';
  const dimensions = iconOnly ? iconSizes[size] : fullLogoSizes[size];

  return (
    <span className={`inline-flex max-w-full items-center justify-center ${className}`} data-shc-brand-logo>
      <img
        src={source}
        alt={iconOnly ? 'Steward Health Care symbol' : 'Steward Health Care 247 Professionals — Redefining Care'}
        className={`${dimensions} h-auto max-w-full object-contain ${inverse ? 'brightness-0 invert' : ''}`}
        width={iconOnly ? 601 : 1864}
        height={iconOnly ? 601 : 434}
        decoding="async"
      />
    </span>
  );
}
