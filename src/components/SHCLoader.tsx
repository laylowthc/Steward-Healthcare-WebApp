import React from 'react';

type SHCLoaderVariant = 'inline' | 'page' | 'fullscreen';

interface SHCLoaderProps {
  variant?: SHCLoaderVariant;
  text?: string;
  className?: string;
}

export default function SHCLoader({
  variant = 'inline',
  text,
  className = ''
}: SHCLoaderProps) {
  const fallbackText = text || 'Loading';

  return (
    <div
      className={`shc-loader shc-loader--${variant} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={fallbackText}
    >
      <span className="shc-loader__mark" aria-hidden="true">
        <img src="/assets/shc-icon.png" alt="" />
      </span>
      {text ? <span className="shc-loader__text">{text}</span> : <span className="sr-only">Loading</span>}
    </div>
  );
}
